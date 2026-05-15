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