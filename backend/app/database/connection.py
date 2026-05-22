import os

# Sanitize environment variables to avoid encoding errors in psycopg2 (Windows)
for k, v in list(os.environ.items()):
    try:
        v.encode('ascii')
    except UnicodeEncodeError:
        try:
            # Try to decode from system encoding (cp1252 or utf-8) and keep it clean
            clean_val = v.encode('utf-8', errors='ignore').decode('utf-8', errors='ignore')
            # If it still contains non-ascii, force pure ascii
            clean_val.encode('ascii')
            os.environ[k] = clean_val
        except Exception:
            os.environ[k] = v.encode('ascii', errors='ignore').decode('ascii')

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import Config


# Crear engine con configuración optimizada
engine = create_engine(
    Config.DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,              # Verifica conexiones antes de usarlas
    pool_recycle=3600,               # Recicla conexiones cada hora
    echo=False,                      # Desactivar logging SQL en producción
    connect_args={
        "connect_timeout": 10,       # Timeout de conexión
        "application_name": "chatbot_app"
    }
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """Dependency para obtener sesión de BD en endpoints"""
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        db.rollback()
        raise
    finally:
        db.close()