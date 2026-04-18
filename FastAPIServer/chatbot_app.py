import sys
import traceback

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

chatbot_ask = None
chatbot_import_error = None


class ChatQuery(BaseModel):
    question: str


def get_chatbot_ask():
    global chatbot_ask, chatbot_import_error

    if chatbot_ask is not None:
        return chatbot_ask

    if chatbot_import_error is not None:
        raise chatbot_import_error

    try:
        from Chatbot import ask as imported_chatbot_ask
        chatbot_ask = imported_chatbot_ask
        print("Chatbot module loaded successfully.", file=sys.stderr)
        return chatbot_ask
    except Exception as e:
        chatbot_import_error = e
        print(f"Chatbot module unavailable: {e}", file=sys.stderr)
        traceback.print_exc()
        raise


@app.get("/")
def root():
    return {
        "message": "Alzheimer's Chatbot API",
        "chatbot_ready": chatbot_ask is not None and chatbot_import_error is None,
        "chatbot_import_error": str(chatbot_import_error) if chatbot_import_error else None,
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "chatbot_ready": chatbot_ask is not None and chatbot_import_error is None,
        "chatbot_import_error": str(chatbot_import_error) if chatbot_import_error else None,
    }


@app.post("/chatbot")
def chatbot(data: ChatQuery):
    """
    Ask a question about Alzheimer's disease.
    Uses a RAG pipeline over curated PDF documents.
    """
    try:
        chatbot_handler = get_chatbot_ask()
    except Exception:
        detail = "Chatbot service is unavailable because its ML dependencies failed to load."
        if chatbot_import_error is not None:
            detail = f"{detail} Root cause: {chatbot_import_error}"
        raise HTTPException(status_code=503, detail=detail)

    return chatbot_handler(data.question)
