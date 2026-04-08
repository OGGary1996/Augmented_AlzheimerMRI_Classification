import sys
import traceback
from pathlib import Path
import joblib
import pandas as pd
from fastapi import FastAPI, File, UploadFile
from tensorflow.keras.models import load_model, model_from_json

from ClinicalData import ClinicalData
from mri_explain import (
    EXPLAINABLE_CLASSES,
    compute_gradcam_heatmap,
    encode_image_base64,
    predict_mri,
    preprocess_mri_bytes,
    render_gradcam_images,
)

# ── App ──────────────────────────────────────────────────────────────────────
app = FastAPI()

# ── Load clinical model ─────────────────────────────────────────────────────
try:
    model_path = Path(__file__).parent.parent / "Clinical Dataset" / "xgb_tunned_clinical_model.joblib"
    print(f"Loading model from: {model_path}", file=sys.stderr)
    print(f"Model file exists: {model_path.exists()}", file=sys.stderr)
    clinical_model = joblib.load(model_path)
    print(f"Model loaded successfully: {type(clinical_model)}", file=sys.stderr)
except Exception as e:
    print(f"Error loading model: {e}", file=sys.stderr)
    traceback.print_exc()
    raise

# ── Load image model ────────────────────────────────────────────────────────
try:
    fastapi_dir = Path(__file__).parent
    keras_file = fastapi_dir / "alzheimer_xception_model.keras"
    config_file = fastapi_dir / "tmp_extract" / "config.json"
    weights_file = fastapi_dir / "model.weights.h5"
    if keras_file.exists():
        print(f"Loading image model from: {keras_file}", file=sys.stderr)
        image_model = load_model(keras_file)
        print(f"Image model loaded successfully from .keras file: {type(image_model)}", file=sys.stderr)
    elif config_file.exists() and weights_file.exists():
        print(f"Reconstructing model from config and weights", file=sys.stderr)
        with open(config_file, 'r') as f:
            model_json = f.read()
        image_model = model_from_json(model_json)
        image_model.load_weights(str(weights_file))
        print(f"Image model reconstructed and weights loaded.", file=sys.stderr)
    else:
        raise FileNotFoundError("No .keras file or model config/weights found in FastAPIServer directory.")
except Exception as e:
    print(f"Error loading image model: {e}", file=sys.stderr)
    traceback.print_exc()
    raise

# ── Routes ───────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"message": "Alzheimer's Classification API"}

@app.post("/predict/clinical")
def predict_clinical(data: ClinicalData):
    """
    Predict Alzheimer's diagnosis based on clinical features.
    Returns 0 for No Diagnosis, 1 for Positive Diagnosis.
    """
    # Create DataFrame with the correct feature order
    features = pd.DataFrame({
        'FunctionalAssessment': [data.FunctionalAssessment],
        'ADL': [data.ADL],
        'MemoryComplaints': [data.MemoryComplaints],
        'MMSE': [data.MMSE],
        'BehavioralProblems': [data.BehavioralProblems]
    })
    
    # Make prediction
    prediction = int(clinical_model.predict(features)[0])
    probability = float(clinical_model.predict_proba(features)[0][1])
    
    return {
        "prediction": prediction,
        "diagnosis": "Positive" if prediction == 1 else "Negative",
        "probability": probability
    }


@app.post("/predict/MRIImage")
async def predict_mri_image(file: UploadFile = File(...)):
    # Predict Alzheimer's diagnosis based on MRI image. Returns Category of the diagnosis (MildDemented, ModerateDemented, NonDemented, VeryMildDemented).
    try:
        contents = await file.read()
        original_image, model_input = preprocess_mri_bytes(contents)
        prediction = predict_mri(image_model, model_input)

        response = {
            "predicted_class": prediction["predicted_class"],
            "confidence": prediction["confidence"],
            "all_probabilities": prediction["all_probabilities"],
            "explanation_type": None,
            "attention_available": False,
            "original_image_base64": encode_image_base64(original_image.convert("RGB")),
        }

        if prediction["predicted_class"] in EXPLAINABLE_CLASSES:
            heatmap = compute_gradcam_heatmap(
                image_model,
                model_input,
                prediction["predicted_index"],
            )
            response.update(
                {
                    "explanation_type": "grad_cam",
                    "attention_available": True,
                    **render_gradcam_images(original_image, heatmap),
                }
            )

        return response
    except Exception as e:
        print(f"Error processing image: {e}", file=sys.stderr)
        traceback.print_exc()
        return {"error": "Failed to process the image."}
