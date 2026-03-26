import base64
import io
from typing import Any

import numpy as np
import tensorflow as tf
from PIL import Image
from tensorflow.keras.applications.xception import preprocess_input

CLASS_NAMES = ["MildDemented", "ModerateDemented", "NonDemented", "VeryMildDemented"]
EXPLAINABLE_CLASSES = {"MildDemented", "ModerateDemented", "VeryMildDemented"}
IMAGE_SIZE = (128, 128)
TARGET_LAYER_NAME = "block14_sepconv2_act"


def preprocess_mri_bytes(file_bytes: bytes) -> tuple[Image.Image, np.ndarray]:
    image = Image.open(io.BytesIO(file_bytes)).convert("RGB")
    resized = image.resize(IMAGE_SIZE)
    image_array = np.asarray(resized, dtype=np.float32)
    model_input = preprocess_input(image_array.copy())
    model_input = np.expand_dims(model_input, axis=0)
    return image, model_input


def predict_mri(model: Any, model_input: np.ndarray) -> dict[str, Any]:
    probabilities = model.predict(model_input, verbose=0)[0]
    predicted_index = int(np.argmax(probabilities))
    predicted_class = CLASS_NAMES[predicted_index]
    confidence = float(probabilities[predicted_index])

    return {
        "predicted_index": predicted_index,
        "predicted_class": predicted_class,
        "confidence": confidence,
        "all_probabilities": dict(zip(CLASS_NAMES, map(float, probabilities))),
    }


def _build_feature_extractor(model: Any, target_layer_name: str) -> tf.keras.Model:
    base_model = model.layers[0]
    target_layer = base_model.get_layer(target_layer_name)
    return tf.keras.models.Model(
        inputs=base_model.inputs,
        outputs=[target_layer.output, base_model.output],
    )


def compute_gradcam_heatmap(
    model: Any,
    model_input: np.ndarray,
    class_index: int,
    target_layer_name: str = TARGET_LAYER_NAME,
) -> np.ndarray:
    # Baseline Grad-CAM kept here for comparison/reference.
    #
    # feature_extractor = _build_feature_extractor(model, target_layer_name)
    #
    # with tf.GradientTape() as tape:
    #     conv_outputs, features = feature_extractor(model_input, training=False)
    #     predictions = features
    #     for layer in model.layers[1:]:
    #         predictions = layer(predictions, training=False)
    #     class_channel = predictions[:, class_index]
    #
    # gradients = tape.gradient(class_channel, conv_outputs)
    # pooled_gradients = tf.reduce_mean(gradients, axis=(0, 1, 2))
    # conv_outputs = conv_outputs[0]
    # heatmap = tf.reduce_sum(conv_outputs * pooled_gradients, axis=-1)
    # heatmap = tf.maximum(heatmap, 0)
    #
    # max_value = tf.reduce_max(heatmap)
    # if float(max_value) > 0:
    #     heatmap = heatmap / max_value
    #
    # return heatmap.numpy()

    return compute_gradcam_plus_plus_heatmap(
        model=model,
        model_input=model_input,
        class_index=class_index,
        target_layer_name=target_layer_name,
    )


def compute_gradcam_plus_plus_heatmap(
    model: Any,
    model_input: np.ndarray,
    class_index: int,
    target_layer_name: str = TARGET_LAYER_NAME,
) -> np.ndarray:
    feature_extractor = _build_feature_extractor(model, target_layer_name)

    with tf.GradientTape() as tape:
        conv_outputs, features = feature_extractor(model_input, training=False)
        predictions = features
        for layer in model.layers[1:]:
            predictions = layer(predictions, training=False)
        class_channel = predictions[:, class_index]

    gradients = tape.gradient(class_channel, conv_outputs)
    conv_outputs = conv_outputs[0]
    gradients = gradients[0]

    first_derivative = gradients
    second_derivative = tf.square(first_derivative)
    third_derivative = second_derivative * first_derivative

    global_sum = tf.reduce_sum(conv_outputs, axis=(0, 1), keepdims=True)
    alpha_denom = (2.0 * second_derivative) + (third_derivative * global_sum)
    alpha_denom = tf.where(alpha_denom != 0.0, alpha_denom, tf.ones_like(alpha_denom))
    alphas = second_derivative / alpha_denom

    positive_gradients = tf.nn.relu(first_derivative)
    alpha_normalization = tf.reduce_sum(alphas, axis=(0, 1), keepdims=True)
    alphas = alphas / (alpha_normalization + tf.keras.backend.epsilon())

    weights = tf.reduce_sum(alphas * positive_gradients, axis=(0, 1))
    heatmap = tf.reduce_sum(conv_outputs * weights, axis=-1)
    heatmap = tf.nn.relu(heatmap)

    max_value = tf.reduce_max(heatmap)
    if float(max_value) > 0:
        heatmap = heatmap / max_value

    return heatmap.numpy()


def _apply_heatmap_colors(heatmap: np.ndarray) -> np.ndarray:
    normalized = np.clip(heatmap, 0.0, 1.0)
    boosted = np.power(normalized, 0.8)
    red = boosted
    green = 1.0 - boosted
    blue = np.zeros_like(boosted)
    alpha = np.clip(np.power(normalized, 1.15) * 255.0, 0.0, 255.0)
    colored = np.stack([red, green, blue, alpha / 255.0], axis=-1)
    return (colored * 255).astype(np.uint8)


def render_gradcam_images(
    original_image: Image.Image,
    heatmap: np.ndarray,
) -> dict[str, str]:
    heatmap_uint8 = (np.clip(heatmap, 0.0, 1.0) * 255).astype(np.uint8)
    heatmap_image = Image.fromarray(heatmap_uint8, mode="L").resize(original_image.size, Image.Resampling.BILINEAR)

    colored_heatmap = Image.fromarray(
        _apply_heatmap_colors(np.asarray(heatmap_image, dtype=np.float32) / 255.0),
        mode="RGBA",
    )
    original_rgb = original_image.convert("RGB")

    original_array = np.asarray(original_rgb, dtype=np.float32)
    colored_array = np.asarray(colored_heatmap.convert("RGB"), dtype=np.float32)
    heat_strength = np.asarray(heatmap_image, dtype=np.float32) / 255.0
    alpha = np.clip(np.power(heat_strength, 0.85) * 0.82, 0.0, 0.82)[..., None]
    overlay_array = original_array * (1.0 - alpha) + colored_array * alpha
    overlay_image = Image.fromarray(np.clip(overlay_array, 0, 255).astype(np.uint8), mode="RGB")

    return {
        "original_image_base64": encode_image_base64(original_rgb),
        "heatmap_image_base64": encode_image_base64(colored_heatmap),
        "overlay_image_base64": encode_image_base64(overlay_image),
    }


def encode_image_base64(image: Image.Image) -> str:
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode("utf-8")
