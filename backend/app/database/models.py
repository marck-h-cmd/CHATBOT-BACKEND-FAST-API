from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.connection import Base


class Usuario(Base):
    __tablename__ = "usuarios"
    
    id = Column(Integer, primary_key=True, index=True)
    codigo_universitario = Column(String(20), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    nombres = Column(String(100), nullable=False)
    apellidos = Column(String(100), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    rol = Column(String(20), default="estudiante")  # estudiante, docente, admin
    es_activo = Column(Boolean, default=True)
    email_verificado = Column(Boolean, default=False)
    ultimo_login = Column(DateTime, nullable=True)
    fecha_registro = Column(DateTime, default=func.now())
    fecha_actualizacion = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    sesiones = relationship("SesionUsuario", back_populates="usuario", cascade="all, delete-orphan")
    silabos_subidos = relationship("SilaboUsuario", back_populates="usuario", cascade="all, delete-orphan")
    solicitudes = relationship("SolicitudServicio", back_populates="usuario_rel")
    incidentes = relationship("IncidenteAcademico", back_populates="usuario_rel")
    sesiones_chat = relationship("SesionChat", back_populates="usuario_rel")
    
    def to_dict(self):
        return {
            "id": self.id,
            "codigo_universitario": self.codigo_universitario,
            "email": self.email,
            "nombres": self.nombres,
            "apellidos": self.apellidos,
            "rol": self.rol,
            "es_activo": self.es_activo,
            "email_verificado": self.email_verificado,
            "ultimo_login": self.ultimo_login.isoformat() if self.ultimo_login else None,
            "fecha_registro": self.fecha_registro.isoformat() if self.fecha_registro else None
        }


class SesionUsuario(Base):
    __tablename__ = "sesiones_usuario"
    
    id = Column(Integer, primary_key=True, index=True)
    id_usuario = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"))
    token = Column(String(500), unique=True, nullable=False, index=True)
    refresh_token = Column(String(500), unique=True, nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(255), nullable=True)
    fecha_inicio = Column(DateTime, default=func.now())
    fecha_expiracion = Column(DateTime, nullable=False)
    fecha_cierre = Column(DateTime, nullable=True)
    es_activa = Column(Boolean, default=True)
    
    # Relationships
    usuario = relationship("Usuario", back_populates="sesiones")


class TokenBlacklist(Base):
    __tablename__ = "token_blacklist"
    
    id = Column(Integer, primary_key=True, index=True)
    token = Column(String(500), unique=True, nullable=False)
    fecha_expiracion = Column(DateTime, nullable=False)
    fecha_agregado = Column(DateTime, default=func.now())


class Curso(Base):
    __tablename__ = "cursos"
    
    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String(20), unique=True, nullable=False)
    nombre = Column(String(200), nullable=False)
    ciclo = Column(String(50))
    periodo = Column(String(50))
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
    usuarios_asociados = relationship("SilaboUsuario", back_populates="silabo", cascade="all, delete-orphan")


class SilaboChunk(Base):
    __tablename__ = "silabo_chunks"
    
    id = Column(Integer, primary_key=True, index=True)
    id_silabo = Column(Integer, ForeignKey("silabos.id", ondelete="CASCADE"))
    chunk_texto = Column(Text, nullable=False)
    tipo_seccion = Column(String(50))
    unidad = Column(String(10))
    embedding = Column(JSON)
    metadata_json = Column(JSON)
    
    # Relationships
    silabo = relationship("Silabo", back_populates="chunks")


class SilaboUsuario(Base):
    __tablename__ = "silabos_usuario"
    
    id = Column(Integer, primary_key=True, index=True)
    id_usuario = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"))
    id_silabo = Column(Integer, ForeignKey("silabos.id", ondelete="CASCADE"))
    es_favorito = Column(Boolean, default=False)
    fecha_agregado = Column(DateTime, default=func.now())
    
    # Relationships
    usuario = relationship("Usuario", back_populates="silabos_subidos")
    silabo = relationship("Silabo", back_populates="usuarios_asociados")


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
    id_usuario = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
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
    usuario_rel = relationship("Usuario", back_populates="solicitudes")


class IncidenteAcademico(Base):
    __tablename__ = "incidentes_academicos"
    
    id = Column(Integer, primary_key=True, index=True)
    id_usuario = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
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
    usuario_rel = relationship("Usuario", back_populates="incidentes")


class SesionChat(Base):
    __tablename__ = "sesiones_chat"
    
    id = Column(Integer, primary_key=True, index=True)
    id_usuario = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    id_silabo = Column(Integer, ForeignKey("silabos.id"))
    titulo = Column(String(200), nullable=True)
    fecha_inicio = Column(DateTime, default=func.now())
    fecha_fin = Column(DateTime, nullable=True)
    mensajes = Column(JSON, default=list)
    resumen = Column(Text, nullable=True)
    
    # Relationships
    usuario_rel = relationship("Usuario", back_populates="sesiones_chat")
    silabo = relationship("Silabo")


class LogIngestion(Base):
    __tablename__ = "logs_ingestion"
    
    id = Column(Integer, primary_key=True, index=True)
    id_silabo = Column(Integer, ForeignKey("silabos.id"))
    id_usuario = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    exito = Column(Boolean)
    error_mensaje = Column(Text)
    parsing_detected = Column(JSON)
    fecha = Column(DateTime, default=func.now())
    
    # Relationships
    silabo = relationship("Silabo")
    usuario = relationship("Usuario")
