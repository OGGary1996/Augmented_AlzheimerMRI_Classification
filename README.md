# Augmented Alzheimer MRI Classification

This repository is a multi-module project for Alzheimer’s disease assistance, combining clinical-data classification, MRI image classification with explainability, and a document-based question answering system. The repository includes a FastAPI backend, a React frontend, training and analysis notebooks, and a standalone Chainlit RAG prototype.

## Project Overview

The project currently provides three main capabilities:

1. Clinical data classification
It uses a trained clinical model to perform binary prediction from features such as `FunctionalAssessment`, `ADL`, `MemoryComplaints`, `MMSE`, and `BehavioralProblems`.

2. MRI image classification and explanation
The backend loads `FastAPIServer/alzheimer_xception_model.keras`, predicts the class of an uploaded MRI image, and generates Grad-CAM heatmaps and overlays for explainable classes.

3. Alzheimer’s disease question answering
It uses PDF documents, a FAISS vector store, Hugging Face embeddings, and a locally cached small language model to provide a concise RAG-based QA interface and a standalone prototype.

## Repository Structure

```text
.
├── README.md
├── pyproject.toml
├── Clinical Dataset/
│   ├── alzheimers_disease_data.csv
│   └── xgb_tunned_clinical_model.joblib
├── MRI Dataset/
│   ├── *.ipynb
│   ├── mri_data.csv
│   └── original_split_manifest.csv
├── dataset/
│   ├── AugmentedAlzheimerDataset/
│   ├── OriginalDataset/
│   └── original_train_balanced_aug/
├── FastAPIServer/
│   ├── pyproject.toml
│   ├── main.py
│   ├── ClinicalData.py
│   ├── Chatbot.py
│   ├── mri_explain.py
│   ├── alzheimer_xception_model.keras
│   ├── vectorstore/
│   └── README.md
├── alzheimerMRI_frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── README.md
└── FileTuning/
    ├── model.py
    ├── ingest.py
    ├── pyproject.toml
    ├── data/
    └── README.md
```

## Directory Guide

- `FastAPIServer/`: Main backend for clinical prediction, MRI image prediction, and the RAG chatbot API.
- `alzheimerMRI_frontend/`: Vite + React frontend with clinical input steps, MRI upload, result views, and chatbot panel.
- `FileTuning/`: Standalone RAG prototype directory for isolated experimentation and vector store regeneration.
- `Clinical Dataset/`: Clinical dataset files and the trained clinical model artifact.
- `MRI Dataset/`: MRI preprocessing, training, and analysis notebooks and related intermediate data.
- `dataset/`: MRI image dataset directory containing original and augmented classification data.

## Submodule Documentation

- Backend documentation: [FastAPIServer/README.md](./FastAPIServer/README.md)
- Frontend documentation: [alzheimerMRI_frontend/README.md](./alzheimerMRI_frontend/README.md)
- FileTuning prototype documentation: [FileTuning/README.md](./FileTuning/README.md)

The root README is intended as the main entry point and project map. For module-specific run instructions, API details, and implementation notes, use the README inside each module directory.

## Tech Stack

### Python / ML

- FastAPI
- TensorFlow / Keras
- scikit-learn
- XGBoost
- pandas / numpy / matplotlib / Pillow
- LangChain + FAISS
- transformers / sentence-transformers

### Frontend

- React 19
- Vite
- Tailwind CSS
- lucide-react
- motion / gsap / three / ogl

## Quick Start

### 1. Python Environment

This repository now uses `pyenv` only to select the interpreter version and `uv` to manage project-local virtual environments.

At the repository root:

```bash
pyenv local 3.10.15
uv sync
```

This creates `.venv/` in the repository root from `pyproject.toml`.

Important:

- root `.venv/` is for repository-level notebooks, analysis scripts, and shared project tooling
- `FastAPIServer/` has its own `pyproject.toml` and should use its own `FastAPIServer/.venv/`
- `FileTuning/` has its own `pyproject.toml` and should use its own `FileTuning/.venv/`
- do not point these directories at the same Python environment; let `uv` create one environment per project directory

### 2. Frontend Environment

Node.js LTS is recommended.

```bash
cd alzheimerMRI_frontend
npm install
npm run dev
```

### 3. Start the Backend

`FastAPIServer/` is managed as its own Python module and should be synced from inside that directory.

Clinical + MRI service:

```bash
cd FastAPIServer
pyenv local 3.10.15
uv sync
uv run uvicorn main:app --reload
```

Standalone chatbot service:

```bash
cd FastAPIServer
pyenv local 3.10.15
uv sync
uv run uvicorn chatbot_app:app --reload --port 8001
```

After startup:

- Main service Swagger UI: `http://127.0.0.1:8000/docs`
- Chatbot Swagger UI: `http://127.0.0.1:8001/docs`
- Main service ReDoc: `http://127.0.0.1:8000/redoc`
- Chatbot ReDoc: `http://127.0.0.1:8001/redoc`

### 4. Run Frontend and Backend Together

1. Install repository-level Python dependencies from the repository root if you need notebooks or analysis tooling: `uv sync`
2. Install backend dependencies inside `FastAPIServer/`: `cd FastAPIServer && uv sync`
3. Run `npm install && npm run dev` in `alzheimerMRI_frontend/`
4. Open the frontend development URL, usually `http://localhost:5173`

## Main APIs

- `POST /predict/clinical`: Clinical feature prediction
- `POST /predict/MRIImage`: MRI image prediction and heatmap generation
- `POST /chatbot`: QA over the PDF-based knowledge base

For detailed request and response examples, see [FastAPIServer/README.md](./FastAPIServer/README.md).

## FileTuning Standalone Prototype

The `FileTuning/` directory contains a standalone RAG QA prototype:

```bash
cd FileTuning
pyenv local 3.10.15
uv sync
uv run python ingest.py
uv run python -m chainlit run model.py --host 127.0.0.1 --port 8001
```

This directory is mainly used to:

- regenerate the vector store
- test the RAG QA pipeline independently
- iterate on the chatbot prototype without affecting the main frontend/backend flow

## Data and Model Artifacts

- Clinical model file: `Clinical Dataset/xgb_tunned_clinical_model.joblib`
- MRI model file: `FastAPIServer/alzheimer_xception_model.keras`
- Main backend vector store: `FastAPIServer/vectorstore/db_faiss/`
- Standalone prototype vector store: `FileTuning/vectorstore/db_faiss/`

## Dependency Maintenance

The root `pyproject.toml` now serves the repository-level environment, covering:

- core ML and explainability dependencies
- common notebook analysis libraries
- shared scripts run from the repository root

`FastAPIServer/pyproject.toml` defines the backend service environment separately, and `FileTuning/pyproject.toml` defines the standalone prototype environment separately.

If new Python dependencies are added later, update the relevant `pyproject.toml` instead of only installing them locally.
