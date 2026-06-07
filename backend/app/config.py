import os
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
from dotenv import load_dotenv

load_dotenv()


def _normalize_database_url(url: str | None) -> str | None:
    if not url:
        return url

    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]

    split = urlsplit(url)
    query = dict(parse_qsl(split.query, keep_blank_values=True))

    schema = query.pop("schema", None)
    if schema and "options" not in query:
        query["options"] = f"-csearch_path={schema}"

    new_query = urlencode(query, doseq=True)
    return urlunsplit((split.scheme, split.netloc, split.path, new_query, split.fragment))


class Config:
    ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
    DEBUG = ENVIRONMENT == "development"
    
    DATABASE_URL = _normalize_database_url(os.getenv("DATABASE_URL"))
    SECRET_KEY = os.getenv("SECRET_KEY")
    ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
    USE_GEMINI = os.getenv("USE_GEMINI", "false").lower() == "true"
    GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-flash-lite-latest")
    
    NOTA_APROBACION = float(os.getenv("NOTA_APROBACION", 14))
    UMBRAL_RIESGO_ALTO = float(os.getenv("UMBRAL_RIESGO_ALTO", 11))
    UMBRAL_RIESGO_MEDIO = float(os.getenv("UMBRAL_RIESGO_MEDIO", 13))
    
    PG_VECTOR_DIM = 384  # Para all-MiniLM-L6-v2
    
    TUTORIA_DIA = "Jueves"
    TUTORIA_HORARIO = "12:00 - 13:00"
    TUTORIA_CANALES = ["Email", "WhatsApp", "Google Meet", "Zoom", "Cubículo docente"]
    TUTORIA_EMAIL = "amendozad@unitru.edu.pe"
    
    # Tamaño máximo de archivos
    MAX_PDF_SIZE_MB = 10
    MAX_PDF_SIZE_BYTES = MAX_PDF_SIZE_MB * 1024 * 1024
    
    # Configuración SMTP para envío de correos (OTP, notificaciones)
    SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM = os.getenv("SMTP_FROM", "")
    SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "true").lower() == "true"
    
    # Límites de Mensajes de Chat
    CHAT_RATE_LIMIT_3H = int(os.getenv("CHAT_RATE_LIMIT_3H", "50"))
    CHAT_RATE_LIMIT_24H = int(os.getenv("CHAT_RATE_LIMIT_24H", "150"))