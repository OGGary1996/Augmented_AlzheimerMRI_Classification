import os
import re

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from langchain_core.prompts import PromptTemplate
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_community.llms import HuggingFacePipeline
from langchain_classic.chains import RetrievalQA
from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline
import chainlit as cl

DB_FAISS_PATH = 'vectorstore/db_faiss'
HF_TOKEN = os.getenv('HF_TOKEN')
BASE_DIR = os.path.dirname(os.path.abspath(__file__))


def _default_local_llm_path(model_id: str) -> str:
    safe_model_name = model_id.replace('/', '__')
    return os.path.join(BASE_DIR, 'local_models', safe_model_name)

custom_prompt_template = """
Answer the question based only on the following context:
{context}
You are allowed to rephrase the answer based on the context.
Keep the response concise (2-4 sentences).
Question: {question}
Only return the helpful answer below and nothing else.
Helpful answer:
"""

def set_custom_prompt():
    """
    Prompt template for QA retrieval for each vectorstore
    """
    prompt = PromptTemplate(template=custom_prompt_template,
                            input_variables=['context', 'question'])
    return prompt


def clean_answer_text(answer: str) -> str:
    """Collapse repeated sentences that small local models sometimes emit."""
    normalized_answer = re.sub(r"\s+", " ", answer or "").strip()
    if not normalized_answer:
        return ""

    sentence_pattern = r"[^.!?]+[.!?]?"
    sentences = [segment.strip() for segment in re.findall(sentence_pattern, normalized_answer) if segment.strip()]

    if not sentences:
        return normalized_answer

    deduped_sentences = []
    seen = set()
    for sentence in sentences:
        dedupe_key = re.sub(r"\s+", " ", sentence).strip().lower().rstrip('.!?')
        if dedupe_key and dedupe_key not in seen:
            deduped_sentences.append(sentence)
            seen.add(dedupe_key)

    cleaned = ' '.join(deduped_sentences).strip()
    if cleaned and cleaned[-1] not in '.!?':
        terminal_match = re.search(r'^(.+[.!?])(?:\s+[^.!?]*)?$', cleaned)
        if terminal_match:
            cleaned = terminal_match.group(1).strip()

    return cleaned

#Retrieval QA Chain
def retrieval_qa_chain(llm, prompt, db):
    qa_chain = RetrievalQA.from_chain_type(llm=llm,
                                       chain_type='stuff',
                                       retriever=db.as_retriever(search_kwargs={'k': 2}),
                                       return_source_documents=True,
                                       chain_type_kwargs={'prompt': prompt}
                                       )
    return qa_chain

#Loading the model
def load_llm():
    model_id = os.getenv('LLM_MODEL_ID', 'HuggingFaceTB/SmolLM2-360M-Instruct')
    local_llm_path = os.getenv('LOCAL_LLM_PATH', _default_local_llm_path(model_id))

    local_model_ready = os.path.isdir(local_llm_path) and os.path.exists(
        os.path.join(local_llm_path, 'config.json')
    )

    if local_model_ready:
        tokenizer = AutoTokenizer.from_pretrained(local_llm_path, local_files_only=True)
        model = AutoModelForCausalLM.from_pretrained(local_llm_path, local_files_only=True)
    else:
        tokenizer_kwargs = {}
        model_kwargs = {}
        if HF_TOKEN:
            tokenizer_kwargs['token'] = HF_TOKEN
            model_kwargs['token'] = HF_TOKEN

        tokenizer = AutoTokenizer.from_pretrained(model_id, **tokenizer_kwargs)
        model = AutoModelForCausalLM.from_pretrained(model_id, **model_kwargs)

        os.makedirs(local_llm_path, exist_ok=True)
        tokenizer.save_pretrained(local_llm_path)
        model.save_pretrained(local_llm_path)

    text_generation_pipeline = pipeline(
        'text-generation',
        model=model,
        tokenizer=tokenizer,
        max_new_tokens=160,
        do_sample=False,
        repetition_penalty=1.15,
        no_repeat_ngram_size=3,
        eos_token_id=tokenizer.eos_token_id,
        pad_token_id=tokenizer.eos_token_id,
        return_full_text=False
    )

    llm = HuggingFacePipeline(pipeline=text_generation_pipeline)
    return llm

#QA Model Function
# QA Model Function
def qa_bot():
    # Initialize embeddings
    embedding_kwargs = {'device': 'cpu'}
    if HF_TOKEN:
        embedding_kwargs['token'] = HF_TOKEN

    embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2",
                                       model_kwargs=embedding_kwargs)
    # Load FAISS vectorstore with embeddings
    db = FAISS.load_local(DB_FAISS_PATH, embeddings, allow_dangerous_deserialization=True)
    
    # Load the LLM model
    llm = load_llm()

    # Set the custom prompt
    qa_prompt = set_custom_prompt()

    # Create the QA chain
    qa = retrieval_qa_chain(llm, qa_prompt, db)

    return qa

#output function
def final_result(query):
    qa_result = qa_bot()
    response = qa_result({'query': query})
    return response



#chainlit code
if hasattr(cl, 'on_chat_start') and hasattr(cl, 'on_message'):
    @cl.on_chat_start
    async def start():
        chain = qa_bot()
        msg = cl.Message(content="Starting the chatbot...")
        await msg.send()
        msg.content = "Q/A About Alzheimer's Disease  ?"
        await msg.update()

        cl.user_session.set("chain", chain)
    # Serve the custom CSS from the static directory
        #cl.static("static/theme.css", "/theme.css")

    # Link the custom CSS in the UI
        #cl.add_html("<link rel='stylesheet' href='/theme.css'>")

    @cl.on_message
    async def main(message: cl.Message):
        chain = cl.user_session.get("chain")
        if chain is None:
            chain = qa_bot()
            cl.user_session.set("chain", chain)

        res = await cl.make_async(chain.invoke)({"query": message.content})
        answer = clean_answer_text(res["result"])
        sources = res["source_documents"]
        
        if sources:
            citations = []
            for doc in sources[:3]:
                metadata = getattr(doc, "metadata", {}) or {}
                source_name = os.path.basename(metadata.get("source", "unknown"))
                page = metadata.get("page")
                if page is not None:
                    citations.append(f"{source_name} (p.{page})")
                else:
                    citations.append(source_name)

            unique_citations = list(dict.fromkeys(citations))
            answer += "\nSources: " + ", ".join(unique_citations)
        else:
            answer += "\nNo sources found"

        await cl.Message(content=answer).send()

    
