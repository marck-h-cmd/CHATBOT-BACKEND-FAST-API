from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
from pgvector.sqlalchemy import Vector
from app.database.connection import Base
import uuid

class Curso(Base):
    __tablename__ = "cursos"
    
    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String(20), unique=True, nullable=False)
    nombre = Column(String(200), nullable=False)
    ciclo = Column(String(10))
    periodo = Column(String(20))
    docente = Column(String(200))
    email_docente = Column(String(100))
    es_oficial = Column(Boolean, default=False)
    reglas_json = Column(JSON)  # Reglas precargadas validadas
    fecha_carga = Column(DateTime, default=func.now())
    activo = Column(Boolean, default=True)
    
    silabos = relationship("Silabo", back_populates="curso")
    reglas = relationship("ReglaEvaluacion", back_populates="curso")

class Silabo(Base):
    __tablename__ = "silabos"
    
    id = Column(Integer, primary_key=True, index=True)
    id_curso = Column(Integer, ForeignKey("cursos.id"))
    nombre_archivo = Column(String(255))
    texto_completo = Column(Text)
    es_oficial = Column(Boolean, default=False)
    es_validado = Column(Boolean, default=False)  # Si se validaron las reglas
    aviso_fiabilidad = Column(Text)  # Mensaje de advertencia si no es oficial
    fecha_subida = Column(DateTime, default=func.now())
    
    curso = relationship("Curso", back_populates="silabos")
    chunks = relationship("SilaboChunk", back_populates="silabo", cascade="all, delete-orphan")

class SilaboChunk(Base):
    __tablename__ = "silabo_chunks"
    
    id = Column(Integer, primary_key=True, index=True)
    id_silabo = Column(Integer, ForeignKey("silabos.id", ondelete="CASCADE"))
    chunk_texto = Column(Text, nullable=False)
    tipo_seccion = Column(String(50))  # evaluacion, contenido, competencia, tutoria
    unidad = Column(String(10))  # U1, U2, U3, GENERAL
    embedding = Column(Vector(384))  # pgvector
    metadata_json = Column(JSON)
    
    silabo = relationship("Silabo", back_populates="chunks")

class ReglaEvaluacion(Base):
    __tablename__ = "reglas_evaluacion"
    
    id = Column(Integer, primary_key=True, index=True)
    id_curso = Column(Integer, ForeignKey("cursos.id"))
    unidad = Column(String(10))  # U1, U2, U3, PP
    formula = Column(String(255))  # Expresión matemática
    evidencias_json = Column(JSON)  # {"PFD": 1, "TAD": 1, "ELD": 2}
    nota_aprobatoria = Column(Float, default=14)
    descripcion = Column(Text)
    
    curso = relationship("Curso", back_populates="reglas")

class SolicitudServicio(Base):
    __tablename__ = "solicitudes_servicio"
    
    id = Column(Integer, primary_key=True, index=True)
    id_usuario = Column(String(50), nullable=False)  # Código universitario
    id_silabo = Column(Integer, ForeignKey("silabos.id"))
    tipo = Column(String(30))  # consulta_formula, consulta_peso, simulacion, informacion_general
    pregunta = Column(Text)
    respuesta = Column(Text)
    fragmentos_usados = Column(JSON)  # Chunks recuperados por RAG
    reglas_aplicadas = Column(JSON)  # Reglas usadas
    tiempo_respuesta_ms = Column(Integer)
    fecha = Column(DateTime, default=func.now())
    estado = Column(String(20), default="completada")
    escalada = Column(Boolean, default=False)  # Se escaló a docente?

class IncidenteAcademico(Base):
    __tablename__ = "incidentes_academicos"
    
    id = Column(Integer, primary_key=True, index=True)
    id_usuario = Column(String(50), nullable=False)
    id_silabo = Column(Integer, ForeignKey("silabos.id"))
    severidad = Column(String(20))  # ALTO, MEDIO, BAJO
    promedio_actual = Column(Float)
    nota_necesaria = Column(Float)
    recomendacion = Column(Text)
    notificado = Column(Boolean, default=False)
    resuelto = Column(Boolean, default=False)
    fecha_deteccion = Column(DateTime, default=func.now())
    fecha_resolucion = Column(DateTime)

class SesionChat(Base):
    __tablename__ = "sesiones_chat"
    
    id = Column(Integer, primary_key=True, index=True)
    id_usuario = Column(String(50), nullable=False)
    id_silabo = Column(Integer, ForeignKey("silabos.id"))
    fecha_inicio = Column(DateTime, default=func.now())
    fecha_fin = Column(DateTime)
    mensajes = Column(JSON, default=list)

class LogIngestion(Base):
    __tablename__ = "logs_ingestion"
    
    id = Column(Integer, primary_key=True, index=True)
    id_silabo = Column(Integer, ForeignKey("silabos.id"))
    exito = Column(Boolean)
    error_mensaje = Column(Text)
    parsing_detected = Column(JSON)  # Qué detectó el parser
    fecha = Column(DateTime, default=func.now())