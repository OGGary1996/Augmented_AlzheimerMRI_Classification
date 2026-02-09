from fastapi import FastAPI
from pydantic import BaseModel
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
import sys

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


