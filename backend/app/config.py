import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    DATABASE_URL = os.getenv("DATABASE_URL")
    SECRET_KEY = os.getenv("SECRET_KEY")
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
    
    NOTA_APROBACION = float(os.getenv("NOTA_APROBACION", 14))
    UMBRAL_RIESGO_ALTO = float(os.getenv("UMBRAL_RIESGO_ALTO", 11))
    UMBRAL_RIESGO_MEDIO = float(os.getenv("UMBRAL_RIESGO_MEDIO", 13))
    
    PG_VECTOR_DIM = 384  # Para all-MiniLM-L6-v2
    
    TUTORIA_DIA = "Jueves"
    TUTORIA_HORARIO = "12:00 - 13:00"
    TUTORIA_CANALES = ["Email", "WhatsApp", "Google Meet", "Zoom", "Cubículo docente"]
    TUTORIA_EMAIL = "amendozad@unitru.edu.pe"