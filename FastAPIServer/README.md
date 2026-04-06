# FastAPI Backend

This directory contains the main backend of the project. It provides three core capabilities:

1. Clinical-feature prediction
2. MRI image classification with Grad-CAM explainability
3. Alzheimer’s disease question answering over a local vector store

## Directory Contents

- `main.py`: FastAPI application entry point
- `ClinicalData.py`: Request schema for clinical prediction
- `Chatbot.py`: RAG chain construction and chatbot logic
- `mri_explain.py`: MRI preprocessing, prediction, and heatmap generation
- `alzheimer_xception_model.keras`: MRI classification model
- `vectorstore/db_faiss/`: Vector store used by the QA system
- `local_models/`: Locally cached Hugging Face generation models

## Runtime Requirements

The backend depends on the following local resources:

- `../Clinical Dataset/xgb_tunned_clinical_model.joblib`
- `./alzheimer_xception_model.keras`
- `./vectorstore/db_faiss/`

Optional environment variables:

- `HF_TOKEN`: Used if Hugging Face access requires authentication
- `LLM_MODEL_ID`: Overrides the default generation model, which is `HuggingFaceTB/SmolLM2-360M-Instruct`
- `LOCAL_LLM_PATH`: Overrides the local cache directory for the generation model

Notes:

- `Chatbot.py` builds the QA chain at import time.
- If models such as `sentence-transformers/all-MiniLM-L6-v2` are not already cached locally, first startup may require network access.
- With the current import structure, the backend is more reliable when started from this directory rather than imported as a package from the repository root.

## Install Dependencies

Install the shared project dependencies from the repository root:

```bash
pip install -r ../requirements.txt
```

## Start the Service

Run from inside `FastAPIServer/`:

```bash
uvicorn main:app --reload
```

Default service URLs:

- `http://127.0.0.1:8000`
- Swagger: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`

## API Summary

### `GET /`

Basic health check and welcome response.

### `POST /predict/clinical`

Predicts Alzheimer’s risk based on clinical features.

Request body:

```json
{
  "FunctionalAssessment": 5.5,
  "ADL": 4.2,
  "MemoryComplaints": 1,
  "MMSE": 28.5,
  "BehavioralProblems": 0
}
```

Example response:

```json
{
  "prediction": 0,
  "diagnosis": "Negative",
  "probability": 0.15
}
```

### `POST /predict/MRIImage`

Uploads an MRI image and returns the predicted class plus optional Grad-CAM explanation outputs.

Form field:

- `file`: MRI image file

Response fields include:

- `predicted_class`
- `confidence`
- `all_probabilities`
- `attention_available`
- `explanation_type`
- `original_image_base64`
- `heatmap_image_base64`
- `overlay_image_base64`

### `POST /chatbot`

Answers Alzheimer’s-related questions using the local PDF-based knowledge base.

Request body:

```json
{
  "question": "What are common early symptoms of Alzheimer's disease?"
}
```

Example response:

```json
{
  "answer": "Common early symptoms include memory loss that disrupts daily life, difficulty completing familiar tasks, and confusion with time or place.",
  "sources": [
    "DATA.pdf (p.2)",
    "DATA.pdf (p.5)"
  ]
}
```

## Debug Examples

### Clinical Prediction

```bash
curl -X POST "http://127.0.0.1:8000/predict/clinical" \
  -H "Content-Type: application/json" \
  -d '{
    "FunctionalAssessment": 5.5,
    "ADL": 4.2,
    "MemoryComplaints": 1,
    "MMSE": 28.5,
    "BehavioralProblems": 0
  }'
```

### Chatbot Endpoint

```bash
curl -X POST "http://127.0.0.1:8000/chatbot" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What are common early symptoms of Alzheimer'\''s disease?"
  }'
```

## Important Notes

- `UploadFile` requires `python-multipart`; otherwise the MRI upload endpoint will not work.
- Loading the serialized clinical model requires `xgboost`.
- The QA stack depends on LangChain, FAISS, transformers, and sentence-transformers.
- If the required Hugging Face models are not cached and no network is available, import-time initialization may fail.
