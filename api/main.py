# /api/main.py

from fastapi import FastAPI, UploadFile, File
import fitz
import google.generativeai as genai
import os
import re

# Configura l'API di Gemini usando le "Environment Variables" di Vercel
genai.configure(api_key=os.environ.get("GOOGLE_API_KEY"))

app = FastAPI()

# Le nostre funzioni di logica
def extract_text_from_pdf(pdf_content: bytes) -> str:
    doc = fitz.open(stream=pdf_content, filetype="pdf")
    text = "".join(page.get_text() for page in doc)
    return text

def extract_keywords(text: str) -> list[str]:
    model = genai.GenerativeModel('gemini-2.5-flash')
    prompt = f"""
    Analizza il testo e identifica da 3 a 5 concetti principali da approfondire.
    Rispondi con una lista separata da virgole. Esempio: Concetto 1, Concetto 2
    Testo: --- {text[:20000]} ---
    """
    response = model.generate_content(prompt)
    return [kw.strip() for kw in response.text.split(',')]

def generate_dot_code(text: str, topic: str = None) -> str:
    model = genai.GenerativeModel('gemini-2.5-flash')
    if topic:
        prompt = f"""
        Crea una mappa concettuale di SINTESI (max 8-10 concetti) sull'argomento: "{topic}".
        Usa il testo di riferimento. La tua risposta deve contenere ESCLUSIVAMENTE il codice DOT valido.
        Testo: --- {text[:100000]} ---
        """
    else:
        prompt = f"""
        Crea una mappa concettuale di SINTESI (max 10-12 concetti).
        La tua risposta deve contenere ESCLUSIVAMENTE il codice DOT valido.
        Testo: --- {text[:100000]} ---
        """
    response = model.generate_content(prompt)
    return response.text.replace("```dot", "").replace("```", "").strip()

# L'endpoint principale della nostra API
@app.post("/api/generate")
async def generate_maps(file: UploadFile = File(...)):
    pdf_content = await file.read()
    text = extract_text_from_pdf(pdf_content)

    main_map_dot = generate_dot_code(text)
    keywords = extract_keywords(text)

    sub_maps = []
    for kw in keywords:
        sub_map_dot = generate_dot_code(text, topic=kw)
        sub_maps.append({"title": kw, "dot": sub_map_dot})

    return {
        "main_map": {"title": "Mappa Principale", "dot": main_map_dot},
        "sub_maps": sub_maps
    }