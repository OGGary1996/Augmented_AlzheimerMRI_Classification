from fastapi import FastAPI
from pydantic import BaseModel
import joblib
import numpy as np
import pandas as pd
import zipfile
from pathlib import Path
import sys
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image
import io
from PIL import Image
from fastapi import File, UploadFile

app = FastAPI()

# Load the clinical model
try:
    model_path = Path(__file__).parent.parent / "Clinical Dataset" / "xgb_tunned_clinical_model.joblib"
    print(f"Loading model from: {model_path}", file=sys.stderr)
    print(f"Model file exists: {model_path.exists()}", file=sys.stderr)
    clinical_model = joblib.load(model_path)
    print(f"Model loaded successfully: {type(clinical_model)}", file=sys.stderr)
except Exception as e:
    print(f"Error loading model: {e}", file=sys.stderr)
    import traceback
    traceback.print_exc()
    raise

# Load the image model from config and weights if .keras file is not present
try:
    from tensorflow.keras.models import model_from_json
    fastapi_dir = Path(__file__).parent.parent / "FastAPIServer"
    keras_file = fastapi_dir / "alzheimer_xception_model.keras"
    config_file = fastapi_dir / "config.json"
    weights_file = fastapi_dir / "model.weights.h5"
    metadata_file = fastapi_dir / "metadata.json"
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
    import traceback
    traceback.print_exc()
    raise

class ClinicalData(BaseModel):
    FunctionalAssessment: float
    ADL: float
    MemoryComplaints: int
    MMSE: float
    BehavioralProblems: int

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
        # Read the uploaded file
        contents = await file.read()
        img = Image.open(io.BytesIO(contents)).convert('RGB')  # Use RGB for Xception
        img = img.resize((128, 128))  # Resize to match model input
        img_array = image.img_to_array(img) / 255.0  # Normalize pixel values
        img_array = np.expand_dims(img_array, axis=0)  # Add batch dimension
        
        # Make prediction
        probs = image_model.predict(img_array)[0]
        class_names = ["MildDemented", "ModerateDemented", "NonDemented", "VeryMildDemented"]
        predicted_index = np.argmax(probs)
        predicted_class = class_names[predicted_index]
        confidence = float(probs[predicted_index])
        
        return {
            "predicted_class": predicted_class,
            "confidence": confidence,
            "all_probabilities": dict(zip(class_names, map(float, probs)))
        }
    except Exception as e:
        print(f"Error processing image: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return {"error": "Failed to process the image."}
