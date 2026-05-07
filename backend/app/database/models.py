from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector
from app.database.connection import Base

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
    reglas_json = Column(JSON)
    fecha_carga = Column(DateTime, default=func.now())
    activo = Column(Boolean, default=True)
    
    # Relationships
    silabos = relationship("Silabo", back_populates="curso", cascade="all, delete-orphan")
    reglas = relationship("ReglaEvaluacion", back_populates="curso", cascade="all, delete-orphan")


class Silabo(Base):
    __tablename__ = "silabos"
    
    id = Column(Integer, primary_key=True, index=True)
    id_curso = Column(Integer, ForeignKey("cursos.id"))
    nombre_archivo = Column(String(255))
    texto_completo = Column(Text)
    es_oficial = Column(Boolean, default=False)
    es_validado = Column(Boolean, default=False)
    aviso_fiabilidad = Column(Text)
    fecha_subida = Column(DateTime, default=func.now())
    
    # Relationships
    curso = relationship("Curso", back_populates="silabos")
    chunks = relationship("SilaboChunk", back_populates="silabo", cascade="all, delete-orphan")
    solicitudes = relationship("SolicitudServicio", back_populates="silabo")
    incidentes = relationship("IncidenteAcademico", back_populates="silabo")


class SilaboChunk(Base):
    __tablename__ = "silabo_chunks"
    
    id = Column(Integer, primary_key=True, index=True)
    id_silabo = Column(Integer, ForeignKey("silabos.id", ondelete="CASCADE"))
    chunk_texto = Column(Text, nullable=False)
    tipo_seccion = Column(String(50))
    unidad = Column(String(10))
    embedding = Column(Vector(384))
    metadata_json = Column(JSON)
    
    # Relationships
    silabo = relationship("Silabo", back_populates="chunks")


class ReglaEvaluacion(Base):
    __tablename__ = "reglas_evaluacion"
    
    id = Column(Integer, primary_key=True, index=True)
    id_curso = Column(Integer, ForeignKey("cursos.id"))
    unidad = Column(String(10))
    formula = Column(String(255))
    evidencias_json = Column(JSON)
    nota_aprobatoria = Column(Float, default=14)
    descripcion = Column(Text)
    
    # Relationships
    curso = relationship("Curso", back_populates="reglas")


class SolicitudServicio(Base):
    __tablename__ = "solicitudes_servicio"
    
    id = Column(Integer, primary_key=True, index=True)
    id_usuario = Column(String(50), nullable=False)
    id_silabo = Column(Integer, ForeignKey("silabos.id"))
    tipo = Column(String(30))
    pregunta = Column(Text)
    respuesta = Column(Text)
    fragmentos_usados = Column(JSON)
    reglas_aplicadas = Column(JSON)
    tiempo_respuesta_ms = Column(Integer)
    fecha = Column(DateTime, default=func.now())
    estado = Column(String(20), default="completada")
    escalada = Column(Boolean, default=False)
    
    # Relationships
    silabo = relationship("Silabo", back_populates="solicitudes")


class IncidenteAcademico(Base):
    __tablename__ = "incidentes_academicos"
    
    id = Column(Integer, primary_key=True, index=True)
    id_usuario = Column(String(50), nullable=False)
    id_silabo = Column(Integer, ForeignKey("silabos.id"))
    severidad = Column(String(20))
    promedio_actual = Column(Float)
    nota_necesaria = Column(Float)
    recomendacion = Column(Text)
    notificado = Column(Boolean, default=False)
    resuelto = Column(Boolean, default=False)
    fecha_deteccion = Column(DateTime, default=func.now())
    fecha_resolucion = Column(DateTime)
    
    # Relationships
    silabo = relationship("Silabo", back_populates="incidentes")


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
    parsing_detected = Column(JSON)
    fecha = Column(DateTime, default=func.now())