import base64
import io
from typing import Any

import numpy as np
import tensorflow as tf
from matplotlib import cm
from PIL import Image, ImageFilter
from tensorflow.keras.applications.xception import preprocess_input

CLASS_NAMES = ["MildDemented", "ModerateDemented", "NonDemented", "VeryMildDemented"]
EXPLAINABLE_CLASSES = {"MildDemented", "ModerateDemented", "VeryMildDemented"}
IMAGE_SIZE = (128, 128)
TARGET_LAYER_NAME = "block14_sepconv2_act"
ENABLE_AUG_SMOOTH = True
ENABLE_EIGEN_SMOOTH = True
HEATMAP_BLUR_RADIUS = 1.2
HEATMAP_INTENSITY_PERCENTILE = 99.5
OVERLAY_IMAGE_WEIGHT = 0.5

_CAM_MODEL_CACHE: dict[tuple[int, str], tuple[tf.keras.Model, tf.keras.Model]] = {}


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


def _get_base_model(model: Any) -> tf.keras.Model:
    base_model = model.layers[0]
    if not isinstance(base_model, tf.keras.Model):
        raise ValueError("Expected the first layer of the MRI classifier to be the backbone model.")
    return base_model


def _build_cam_models(model: Any, target_layer_name: str) -> tuple[tf.keras.Model, tf.keras.Model]:
    cache_key = (id(model), target_layer_name)
    cached_models = _CAM_MODEL_CACHE.get(cache_key)
    if cached_models is not None:
        return cached_models

    base_model = _get_base_model(model)
    target_layer = base_model.get_layer(target_layer_name)
    feature_extractor = tf.keras.models.Model(
        inputs=base_model.inputs,
        outputs=[target_layer.output, base_model.output],
    )

    classifier_input = tf.keras.Input(shape=base_model.output_shape[1:], name="cam_classifier_input")
    x = classifier_input
    for layer in model.layers[1:-1]:
        x = layer(x)

    last_layer = model.layers[-1]
    if not isinstance(last_layer, tf.keras.layers.Dense):
        raise ValueError("Expected the MRI classifier to end with a Dense output layer.")

    logits_layer = tf.keras.layers.Dense(
        units=last_layer.units,
        activation=None,
        use_bias=last_layer.use_bias,
        name=f"{last_layer.name}_cam_logits",
    )
    logits = logits_layer(x)
    classifier_head = tf.keras.models.Model(inputs=classifier_input, outputs=logits)
    logits_layer.set_weights(last_layer.get_weights())

    cam_models = (feature_extractor, classifier_head)
    _CAM_MODEL_CACHE[cache_key] = cam_models
    return cam_models


def _normalize_heatmap(heatmap: np.ndarray) -> np.ndarray:
    heatmap = np.maximum(heatmap, 0.0).astype(np.float32)
    if not np.any(np.isfinite(heatmap)):
        return np.zeros_like(heatmap, dtype=np.float32)

    max_value = np.percentile(heatmap, HEATMAP_INTENSITY_PERCENTILE)
    if max_value <= 0:
        max_value = float(np.max(heatmap))
    if max_value <= 0:
        return np.zeros_like(heatmap, dtype=np.float32)

    normalized = np.clip(heatmap / max_value, 0.0, 1.0)
    return normalized.astype(np.float32)


def _principal_component_projection(weighted_activations: np.ndarray) -> np.ndarray:
    height, width, channels = weighted_activations.shape
    flattened = weighted_activations.reshape(height * width, channels)
    if flattened.size == 0:
        return np.zeros((height, width), dtype=np.float32)

    _, _, right_vectors = np.linalg.svd(flattened, full_matrices=False)
    principal_component = right_vectors[0]
    projected = flattened @ principal_component
    if abs(np.min(projected)) > abs(np.max(projected)):
        projected = -projected
    return projected.reshape(height, width).astype(np.float32)


def _deaugment_heatmap(heatmap: np.ndarray, flip_horizontal: bool) -> np.ndarray:
    if flip_horizontal:
        return np.fliplr(heatmap)
    return heatmap


def compute_gradcam_heatmap(
    model: Any,
    model_input: np.ndarray,
    class_index: int,
    target_layer_name: str = TARGET_LAYER_NAME,
    aug_smooth: bool = ENABLE_AUG_SMOOTH,
    eigen_smooth: bool = ENABLE_EIGEN_SMOOTH,
) -> np.ndarray:
    if not aug_smooth:
        return _compute_gradcam_single(
            model=model,
            model_input=model_input,
            class_index=class_index,
            target_layer_name=target_layer_name,
            eigen_smooth=eigen_smooth,
        )

    heatmaps: list[np.ndarray] = []
    for flip_horizontal in (False, True):
        augmented_input = model_input.copy()
        if flip_horizontal:
            augmented_input = np.ascontiguousarray(np.flip(augmented_input, axis=2))

        augmented_heatmap = _compute_gradcam_single(
            model=model,
            model_input=augmented_input,
            class_index=class_index,
            target_layer_name=target_layer_name,
            eigen_smooth=eigen_smooth,
        )
        heatmaps.append(_deaugment_heatmap(augmented_heatmap, flip_horizontal))

    return np.mean(heatmaps, axis=0).astype(np.float32)


def _compute_gradcam_single(
    model: Any,
    model_input: np.ndarray,
    class_index: int,
    target_layer_name: str = TARGET_LAYER_NAME,
    eigen_smooth: bool = ENABLE_EIGEN_SMOOTH,
) -> np.ndarray:
    feature_extractor, classifier_head = _build_cam_models(model, target_layer_name)

    with tf.GradientTape() as tape:
        conv_outputs, features = feature_extractor(model_input, training=False)
        logits = classifier_head(features, training=False)
        class_channel = logits[:, class_index]

    gradients = tape.gradient(class_channel, conv_outputs)
    conv_outputs = conv_outputs[0].numpy()
    gradients = gradients[0].numpy()

    weights = np.mean(gradients, axis=(0, 1))
    weighted_activations = conv_outputs * weights

    if eigen_smooth:
        heatmap = _principal_component_projection(weighted_activations)
    else:
        heatmap = np.sum(weighted_activations, axis=-1)

    return _normalize_heatmap(heatmap)


def compute_gradcam_plus_plus_heatmap(
    model: Any,
    model_input: np.ndarray,
    class_index: int,
    target_layer_name: str = TARGET_LAYER_NAME,
    eigen_smooth: bool = ENABLE_EIGEN_SMOOTH,
) -> np.ndarray:
    feature_extractor, classifier_head = _build_cam_models(model, target_layer_name)

    with tf.GradientTape() as tape:
        conv_outputs, features = feature_extractor(model_input, training=False)
        logits = classifier_head(features, training=False)
        probabilities = tf.nn.softmax(logits, axis=-1)
        class_channel = probabilities[:, class_index]

    gradients = tape.gradient(class_channel, conv_outputs)
    conv_outputs = conv_outputs[0].numpy()
    gradients = gradients[0].numpy()

    first_derivative = gradients
    second_derivative = np.square(first_derivative)
    third_derivative = second_derivative * first_derivative

    global_sum = np.sum(conv_outputs, axis=(0, 1), keepdims=True)
    alpha_denom = (2.0 * second_derivative) + (third_derivative * global_sum)
    alpha_denom = np.where(alpha_denom != 0.0, alpha_denom, np.ones_like(alpha_denom))
    alphas = second_derivative / alpha_denom

    positive_gradients = np.maximum(first_derivative, 0.0)
    alpha_normalization = np.sum(alphas, axis=(0, 1), keepdims=True)
    alphas = alphas / (alpha_normalization + tf.keras.backend.epsilon())

    weights = np.sum(alphas * positive_gradients, axis=(0, 1))
    weighted_activations = conv_outputs * weights

    if eigen_smooth:
        heatmap = _principal_component_projection(weighted_activations)
    else:
        heatmap = np.sum(weighted_activations, axis=-1)

    return _normalize_heatmap(heatmap)


def _apply_heatmap_colors(heatmap: np.ndarray) -> np.ndarray:
    normalized = np.clip(heatmap, 0.0, 1.0).astype(np.float32)
    colored = cm.get_cmap("jet")(normalized)[..., :3]
    return (colored * 255).astype(np.uint8)


def render_gradcam_images(
    original_image: Image.Image,
    heatmap: np.ndarray,
) -> dict[str, str]:
    heatmap_uint8 = (np.clip(heatmap, 0.0, 1.0) * 255).astype(np.uint8)
    heatmap_image = Image.fromarray(heatmap_uint8, mode="L").resize(original_image.size, Image.Resampling.BILINEAR)
    heatmap_image = heatmap_image.filter(ImageFilter.GaussianBlur(radius=HEATMAP_BLUR_RADIUS))
    heatmap_array = np.asarray(heatmap_image, dtype=np.float32) / 255.0
    heatmap_array = _normalize_heatmap(heatmap_array)
    heatmap_image = Image.fromarray((heatmap_array * 255).astype(np.uint8), mode="L")

    colored_heatmap = Image.fromarray(_apply_heatmap_colors(heatmap_array), mode="RGB")
    original_rgb = original_image.convert("RGB")

    original_array = np.asarray(original_rgb, dtype=np.float32) / 255.0
    colored_array = np.asarray(colored_heatmap, dtype=np.float32) / 255.0
    overlay_array = (OVERLAY_IMAGE_WEIGHT * original_array) + ((1.0 - OVERLAY_IMAGE_WEIGHT) * colored_array)
    overlay_array = overlay_array / np.maximum(np.max(overlay_array), 1e-7)
    overlay_image = Image.fromarray(np.clip(overlay_array * 255.0, 0, 255).astype(np.uint8), mode="RGB")

    return {
        "original_image_base64": encode_image_base64(original_rgb),
        "heatmap_image_base64": encode_image_base64(colored_heatmap),
        "overlay_image_base64": encode_image_base64(overlay_image),
    }


def encode_image_base64(image: Image.Image) -> str:
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode("utf-8")
