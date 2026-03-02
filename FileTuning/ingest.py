from pathlib import Path
import os

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

try:
    from langchain_text_splitters import RecursiveCharacterTextSplitter
except ImportError:
    from langchain.text_splitter import RecursiveCharacterTextSplitter

from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_community.document_loaders import PyPDFLoader

DATA_PATH = 'data/'
DATA_FILE_NAME = 'DATA.pdf'
DB_FAISS_PATH = 'vectorstore/db_faiss'
HF_TOKEN = os.getenv('HF_TOKEN')

# Create vector database 
def create_vector_db():
    candidate_paths = [
        Path(DATA_PATH) / DATA_FILE_NAME,
        Path(DATA_FILE_NAME)
    ]
    pdf_file_path = next((path for path in candidate_paths if path.exists()), None)

    if pdf_file_path is None:
        raise FileNotFoundError(
            f"{DATA_FILE_NAME} not found. Expected at '{Path(DATA_PATH) / DATA_FILE_NAME}' or './{DATA_FILE_NAME}'."
        )

    loader = PyPDFLoader(str(pdf_file_path))

    documents = loader.load()
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000,
                                                   chunk_overlap=50)
    texts = text_splitter.split_documents(documents)

    embedding_kwargs = {'device': 'cpu'}
    if HF_TOKEN:
        embedding_kwargs['token'] = HF_TOKEN

    embeddings = HuggingFaceEmbeddings(model_name='sentence-transformers/all-MiniLM-L6-v2',
                                       model_kwargs=embedding_kwargs)

    db = FAISS.from_documents(texts, embeddings)
    db.save_local(DB_FAISS_PATH)

if __name__ == "__main__":
    create_vector_db()