Alzheimer's Disease Expert Chatbot Project Documentation
Overview
This project aims to create an expert chatbot specializing in answering questions related to Alzheimer's disease. The chatbot is built using a Retrieval-Augmented Generation (RAG) model, which enhances the chatbot's responses by retrieving relevant information from a collection of PDFs related to Alzheimer's disease. Two implementations have been developed:

Model.py: Uses Chainlit for the chatbot interface.
Model1.py: Uses Streamlit for a user-friendly web interface.
Both implementations utilize a FAISS vector store to efficiently retrieve the most relevant documents for answering user queries, ensuring that the responses are both accurate and supported by reliable sources.

Key Features
Document Loader: The project combines several Alzheimer's-related PDF documents to build the knowledge base for the RAG agent.

Vector Store: FAISS (Facebook AI Similarity Search) is used to create a vectorized representation of the documents for fast retrieval of relevant information.

Custom Prompt Template: A custom prompt ensures that the chatbot only provides helpful and accurate responses. If the chatbot doesn't know an answer, it is programmed to acknowledge that.

Model Loading:

The project uses the HuggingFace Embeddings model for vectorizing the document content.
The LLM (Large Language Model) used is Llama-2-7b loaded through CTransformers, which powers the natural language understanding and response generation.
Chain Construction: A retrieval-based question-answering chain is created using Langchain, enabling the chatbot to fetch the most relevant information from the knowledge base in response to user queries.

User Interface:

Streamlit provides a web interface allowing users to input questions and receive detailed responses, along with the source documents for transparency.
Chainlit is used in a parallel model.py file for those who prefer a more streamlined command-line interaction with the chatbot.

How to Run the App

Prerequisites
- Python 3.10+ installed
- Internet access for first-time model/embedding downloads (unless already cached in local_models)

1) Open terminal in project folder
cd D:\Work\Augmented_AlzheimerMRI_Classification\RAG-Alzheimer-s_Disease-main

2) Install dependencies
pip install -r reqs.txt

3) Run Chainlit app (model.py)
Use this command (recommended on Windows if `chainlit` is not recognized):
python -m chainlit run model.py --host 127.0.0.1 --port 8000

Then open:
http://127.0.0.1:8000

Alternative (if chainlit command is available in PATH):
chainlit run model.py --host 127.0.0.1 --port 8000

4) Run Streamlit app (model1.py)
streamlit run model1.py

Notes
- If `HF_TOKEN` is set in your environment, Hugging Face gated/private downloads can use it.
- The FAISS index is expected at: vectorstore/db_faiss
- Local model directories are under: local_models/