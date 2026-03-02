import os

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

import streamlit as st
from langchain_core.prompts import PromptTemplate
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_community.llms import HuggingFacePipeline
from langchain_classic.chains import RetrievalQA
from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline

# Define FAISS vector store path
DB_FAISS_PATH = 'vectorstore/db_faiss'
HF_TOKEN = os.getenv('HF_TOKEN')

# Define custom prompt template
custom_prompt_template = """Use the following pieces of information to answer the user's question.
If you don't know the answer, just say that you don't know, don't try to make up an answer.

Context: {context}
Question: {question}

Only return the helpful answer below and nothing else.
Helpful answer:
"""

def set_custom_prompt():
    """
    Prompt template for QA retrieval for each vectorstore
    """
    prompt = PromptTemplate(template=custom_prompt_template, input_variables=['context', 'question'])
    return prompt

# Define Retrieval QA Chain
def retrieval_qa_chain(llm, prompt, db):
    qa_chain = RetrievalQA.from_chain_type(
        llm=llm,
        chain_type='stuff',
        retriever=db.as_retriever(search_kwargs={'k': 2}),
        return_source_documents=True,
        chain_type_kwargs={'prompt': prompt}
    )
    return qa_chain

# Load the LLM model
def load_llm():
    model_id = os.getenv('LLM_MODEL_ID', 'TinyLlama/TinyLlama-1.1B-Chat-v1.0')

    tokenizer_kwargs = {}
    model_kwargs = {}
    if HF_TOKEN:
        tokenizer_kwargs['token'] = HF_TOKEN
        model_kwargs['token'] = HF_TOKEN

    tokenizer = AutoTokenizer.from_pretrained(model_id, **tokenizer_kwargs)
    model = AutoModelForCausalLM.from_pretrained(model_id, **model_kwargs)

    text_generation_pipeline = pipeline(
        'text-generation',
        model=model,
        tokenizer=tokenizer,
        max_new_tokens=512,
        temperature=0.5,
        do_sample=True
    )

    llm = HuggingFacePipeline(pipeline=text_generation_pipeline)
    return llm

# QA Model Function
def qa_bot():
    embedding_kwargs = {'device': 'cpu'}
    if HF_TOKEN:
        embedding_kwargs['token'] = HF_TOKEN

    embeddings = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2",
        model_kwargs=embedding_kwargs
    )

    # Load FAISS vector store
    db = FAISS.load_local(DB_FAISS_PATH, embeddings, allow_dangerous_deserialization=True)

    # Load the LLM model
    llm = load_llm()

    # Set the custom prompt
    qa_prompt = set_custom_prompt()

    # Create the QA chain
    qa = retrieval_qa_chain(llm, qa_prompt, db)

    return qa

# Function to handle query and return result
def final_result(query):
    qa = qa_bot()
    response = qa({'query': query})
    return response['result'], response.get('source_documents', [])

# Streamlit App Interface
def main():
    st.title("Q/A About Alzheimer's Disease:")

    # Text input for query
    user_query = st.text_input(" WHAT DO YOU  WANT TO KNOW :")

    if st.button("Submit"):
        if user_query:
            st.write("Processing your query...")
            result, sources = final_result(user_query)
            
            # Display result
            st.subheader("Answer:")
            st.write(result)

            # Display sources
            if sources:
                st.subheader("Source Documents:")
                for source in sources:
                    st.write(f"- {source.metadata.get('source', 'Unknown source')}")
        else:
            st.warning("Please enter a question.")

if __name__ == "__main__":
    main()

