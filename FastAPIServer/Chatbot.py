import os
import sys
from pathlib import Path

from pydantic import BaseModel
from langchain_core.prompts import PromptTemplate
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_community.llms import HuggingFacePipeline
from langchain_classic.chains import RetrievalQA
from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline

BASE_DIR = Path(__file__).parent
DB_FAISS_PATH = str(BASE_DIR / "vectorstore" / "db_faiss")
HF_TOKEN = os.getenv("HF_TOKEN")


class ChatQuery(BaseModel):
    question: str


custom_prompt_template = """
Answer the question based only on the following context:
{context}
You are allowed to rephrase the answer based on the context.
Keep the response concise (2-4 sentences).
Question: {question}
Only return the helpful answer below and nothing else.
Helpful answer:
"""


def _default_local_llm_path(model_id: str) -> str:
    safe_model_name = model_id.replace("/", "__")
    return str(BASE_DIR / "local_models" / safe_model_name)


def set_custom_prompt():
    return PromptTemplate(
        template=custom_prompt_template,
        input_variables=["context", "question"],
    )


def load_llm():
    model_id = os.getenv("LLM_MODEL_ID", "HuggingFaceTB/SmolLM2-360M-Instruct")
    local_llm_path = os.getenv("LOCAL_LLM_PATH", _default_local_llm_path(model_id))

    local_model_ready = os.path.isdir(local_llm_path) and os.path.exists(
        os.path.join(local_llm_path, "config.json")
    )

    if local_model_ready:
        tokenizer = AutoTokenizer.from_pretrained(local_llm_path, local_files_only=True)
        model = AutoModelForCausalLM.from_pretrained(local_llm_path, local_files_only=True)
    else:
        tokenizer_kwargs = {}
        model_kwargs = {}
        if HF_TOKEN:
            tokenizer_kwargs["token"] = HF_TOKEN
            model_kwargs["token"] = HF_TOKEN

        tokenizer = AutoTokenizer.from_pretrained(model_id, **tokenizer_kwargs)
        model = AutoModelForCausalLM.from_pretrained(model_id, **model_kwargs)

        os.makedirs(local_llm_path, exist_ok=True)
        tokenizer.save_pretrained(local_llm_path)
        model.save_pretrained(local_llm_path)

    text_generation_pipeline = pipeline(
        "text-generation",
        model=model,
        tokenizer=tokenizer,
        max_new_tokens=120,
        do_sample=False,
        return_full_text=False,
    )

    return HuggingFacePipeline(pipeline=text_generation_pipeline)


def build_qa_chain():
    embedding_kwargs = {"device": "cpu"}
    if HF_TOKEN:
        embedding_kwargs["token"] = HF_TOKEN

    embeddings = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2",
        model_kwargs=embedding_kwargs,
    )
    db = FAISS.load_local(DB_FAISS_PATH, embeddings, allow_dangerous_deserialization=True)

    llm = load_llm()
    qa_prompt = set_custom_prompt()

    qa_chain = RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff",
        retriever=db.as_retriever(search_kwargs={"k": 2}),
        return_source_documents=True,
        chain_type_kwargs={"prompt": qa_prompt},
    )
    return qa_chain


# Singleton — loaded once at import time
print("Loading chatbot QA chain...", file=sys.stderr)
qa_chain = build_qa_chain()
print("Chatbot QA chain loaded.", file=sys.stderr)


def ask(query: str) -> dict:
    """Run a query against the QA chain and return answer + sources."""
    res = qa_chain.invoke({"query": query})
    answer = res["result"]
    sources = res.get("source_documents", [])

    citation_list = []
    for doc in sources[:3]:
        metadata = getattr(doc, "metadata", {}) or {}
        source_name = os.path.basename(metadata.get("source", "unknown"))
        page = metadata.get("page")
        if page is not None:
            citation_list.append(f"{source_name} (p.{page})")
        else:
            citation_list.append(source_name)

    return {
        "answer": answer,
        "sources": list(dict.fromkeys(citation_list)),
    }
