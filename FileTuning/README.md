# FileTuning RAG Prototype

`FileTuning/` is a standalone Retrieval-Augmented Generation prototype for Alzheimer’s disease question answering. Its role in the repository is narrower than the main FastAPI application: it is the isolated workspace for building, testing, and iterating on the PDF-based QA pipeline without changing the main frontend/backend integration flow.

## Purpose of This Directory

This directory is mainly used for:

- experimenting with the Alzheimer’s QA workflow in isolation
- rebuilding the FAISS vector store from source documents
- testing prompt, retrieval, and local-model behavior
- running a lightweight Chainlit chatbot interface for RAG development

If you want the integrated product experience, use the main backend in `FastAPIServer/`. If you want to work specifically on the QA pipeline, this directory is the better entry point.

## Directory Contents

- `model.py`: Chainlit chatbot application and RAG pipeline
- `ingest.py`: PDF ingestion script that builds the FAISS vector store
- `reqs.txt`: Python dependencies for this standalone prototype
- `data/DATA.pdf`: Source document used to build the knowledge base
- `chainlit.md`: Short quickstart notes for running the Chainlit app
- `config.toml`: Local configuration for the prototype

Runtime-generated directories may also appear:

- `vectorstore/db_faiss/`: Saved FAISS index
- `local_models/`: Cached Hugging Face models downloaded on first use

## How It Works

The workflow has two stages:

1. Ingestion
`ingest.py` loads `data/DATA.pdf`, splits it into chunks, embeds the chunks with `sentence-transformers/all-MiniLM-L6-v2`, and stores the vectors in a local FAISS index.

2. Question answering
`model.py` loads the FAISS index, retrieves relevant chunks for each user query, and uses a small Hugging Face causal language model to produce a short grounded answer through Chainlit.

The current implementation uses:

- FAISS for vector retrieval
- LangChain for retrieval orchestration
- Hugging Face embeddings for semantic search
- `HuggingFaceTB/SmolLM2-360M-Instruct` as the default local generation model
- Chainlit as the development UI

## Prerequisites

- Python 3.10 or newer
- Internet access for the first model download, unless the required models are already cached locally
- A valid local environment with the dependencies from `reqs.txt`

Optional:

- `HF_TOKEN` if Hugging Face access requires authentication

## Installation

From inside `FileTuning/`:

```bash
pip install -r reqs.txt
```

## Build the Vector Store

Before running the chatbot, create or refresh the vector store:

```bash
python ingest.py
```

This reads `data/DATA.pdf` and writes the index under `vectorstore/db_faiss/`.

## Run the Chatbot

Start the Chainlit app from inside `FileTuning/`:

```bash
python -m chainlit run model.py --host 127.0.0.1 --port 8001
```

Then open:

- `http://127.0.0.1:8001`

If `chainlit` is already available in your shell `PATH`, this also works:

```bash
chainlit run model.py --host 127.0.0.1 --port 8001
```

## Environment Variables

The prototype supports these environment variables:

- `HF_TOKEN`: passed to Hugging Face model and embedding downloads
- `LLM_MODEL_ID`: overrides the default generation model
- `LOCAL_LLM_PATH`: overrides where the local model is cached

By default, the generation model is cached under `local_models/` inside this directory.

## Typical Development Flow

1. Install dependencies from `reqs.txt`
2. Update or replace `data/DATA.pdf` if the knowledge source changes
3. Run `python ingest.py` to rebuild the vector store
4. Start the app with `python -m chainlit run model.py --host 127.0.0.1 --port 8001`
5. Ask questions and iterate on retrieval, prompts, or model settings

## Notes and Limitations

- This directory is a prototype workspace, not the main production API surface of the repository.
- `model.py` assumes that `vectorstore/db_faiss/` already exists.
- If the embedding model or generation model is not cached and no network is available, startup will fail.
- The answers are constrained to retrieved document context, but response quality still depends on chunking, retrieval quality, and the chosen local LLM.

## Relationship to the Main Backend

There is overlap between this directory and `FastAPIServer/Chatbot.py`, but they serve different purposes:

- `FastAPIServer/`: integrated backend used by the main application
- `FileTuning/`: isolated RAG sandbox for QA experimentation and vector-store maintenance

When the QA logic changes here and is proven useful, the corresponding improvements can later be ported into the main backend.
