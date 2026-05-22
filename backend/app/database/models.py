from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, JSON, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.connection import Base
import enum


# ============================================
# ENUMS
# ============================================

class RolUsuario(str, enum.Enum):
    ESTUDIANTE = "ESTUDIANTE"
    DOCENTE = "DOCENTE"
    ADMIN = "ADMIN"


class EstadoUsuario(str, enum.Enum):
    ACTIVO = "ACTIVO"
    INACTIVO = "INACTIVO"
    SUSPENDIDO = "SUSPENDIDO"


class OrigenContexto(str, enum.Enum):
    OFICIAL = "OFICIAL"
    DECLARADO_USUARIO = "DECLARADO_USUARIO"
    PDF_COINCIDENTE = "PDF_COINCIDENTE"


class EstadoVerificacion(str, enum.Enum):
    OFICIAL = "OFICIAL"
    APROBADO = "APROBADO"
    PENDIENTE_CONFIRMACION = "PENDIENTE_CONFIRMACION"
    RECHAZADO = "RECHAZADO"


class TipoSilabo(str, enum.Enum):
    OFICIAL = "OFICIAL"
    SUBIDO_USUARIO = "SUBIDO_USUARIO"


class AmbitoUso(str, enum.Enum):
    PRIVADO = "PRIVADO"
    COMPARTIBLE = "COMPARTIBLE"
    PUBLICADO = "PUBLICADO"


class CoincidenciaPeriodo(str, enum.Enum):
    ACTUAL = "ACTUAL"
    ANTERIOR = "ANTERIOR"
    DESCONOCIDO = "DESCONOCIDO"
    NO_COINCIDE = "NO_COINCIDE"


class TipoSeccionChunk(str, enum.Enum):
    SUMILLA = "SUMILLA"
    COMPETENCIAS = "COMPETENCIAS"
    EVALUACION = "EVALUACION"
    FORMULA = "FORMULA"
    TUTORIA = "TUTORIA"
    CRITERIOS = "CRITERIOS"
    CONTENIDOS = "CONTENIDOS"


class TipoRegla(str, enum.Enum):
    PU1 = "PU1"
    PU2 = "PU2"
    PU3 = "PU3"
    PP = "PP"
    APROBACION = "APROBACION"
    RIESGO = "RIESGO"


class TipoIncidenteServicio(str, enum.Enum):
    FALLO_PARSING = "FALLO_PARSING"
    PDF_ILEGIBLE = "PDF_ILEGIBLE"
    FORMULA_AMBIGUA = "FORMULA_AMBIGUA"
    MISMATCH_CURSO = "MISMATCH_CURSO"
    ESTRUCTURA_INCOMPLETA = "ESTRUCTURA_INCOMPLETA"


class EstadoSolicitud(str, enum.Enum):
    ABIERTA = "ABIERTA"
    EN_PROCESO = "EN_PROCESO"
    RESUELTA = "RESUELTA"
    ESCALADA = "ESCALADA"
    CERRADA = "CERRADA"


class EstadoIncidente(str, enum.Enum):
    ACTIVO = "ACTIVO"
    EN_REVISION = "EN_REVISION"
    RESUELTO = "RESUELTO"
    ESCALADO = "ESCALADO"


class AccionRevision(str, enum.Enum):
    APROBAR_PUBLICACION = "APROBAR_PUBLICACION"
    MANTENER_PRIVADO = "MANTENER_PRIVADO"
    RECHAZAR = "RECHAZAR"
    MARCAR_OFICIAL = "MARCAR_OFICIAL"


class TipoSugerencia(str, enum.Enum):
    POR_PESO = "POR_PESO"
    POR_FECHA = "POR_FECHA"  
    POR_RIESGO = "POR_RIESGO"
    POR_COMPARACION = "POR_COMPARACION"


class EstadoSugerencia(str, enum.Enum):
    PENDIENTE = "PENDIENTE"
    ACEPTADA = "ACEPTADA"
    IGNORADA = "IGNORADA"

class EstadoNotificacion(str, enum.Enum):
    PENDIENTE = "PENDIENTE"
    ENVIADO = "ENVIADO"
    FALLIDO = "FALLIDO"


# ============================================
# TABLAS
# ============================================

class Usuario(Base):
    __tablename__ = "usuario"
    
    id = Column(Integer, primary_key=True, index=True)
    codigo_universitario = Column(String(20), unique=True, nullable=False, index=True)
    nombres = Column(String(100), nullable=False)
    apellidos = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    rol = Column(Enum(RolUsuario), default=RolUsuario.ESTUDIANTE)
    es_activo = Column(Boolean, default=True)
    email_verificado = Column(Boolean, default=False)
    ultimo_login = Column(DateTime, nullable=True)
    fecha_registro = Column(DateTime, default=func.now())
    # Onboarding server-side persistence
    onboarding_completed = Column(Boolean, default=False)
    onboarding_skipped = Column(Boolean, default=False)
    onboarding_version = Column(Integer, default=1)
    onboarding_updated_at = Column(DateTime, nullable=True)
    # Campos OTP para verificación de email (doble opt-in)
    otp_code = Column(String(6), nullable=True)
    otp_expires_at = Column(DateTime, nullable=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'codigo_universitario': self.codigo_universitario,
            'email': self.email,
            'nombres': self.nombres,
            'apellidos': self.apellidos,
            'rol': self.rol.value if self.rol else None,
            'es_activo': self.es_activo,
            'email_verificado': self.email_verificado,
            'ultimo_login': self.ultimo_login.isoformat() if self.ultimo_login else None,
            'fecha_registro': self.fecha_registro.isoformat() if self.fecha_registro else None,
            'onboarding_completed': bool(self.onboarding_completed),
            'onboarding_skipped': bool(self.onboarding_skipped),
            'onboarding_version': int(self.onboarding_version) if self.onboarding_version is not None else 1,
            'onboarding_updated_at': self.onboarding_updated_at.isoformat() if self.onboarding_updated_at else None
        }
    
    # Relationships
    sesiones = relationship("SesionUsuario", back_populates="usuario", cascade="all, delete-orphan")
    contextos_cursos = relationship("ContextoCursoUsuario", back_populates="usuario", cascade="all, delete-orphan")
    silabos_subidos = relationship("Silabo", back_populates="usuario_subida")
    sesiones_chat = relationship("SesionChat", back_populates="usuario")
    solicitudes = relationship("SolicitudServicio", back_populates="usuario")
    incidentes_academicos = relationship("IncidenteAcademico", back_populates="usuario")
    incidentes_servicio = relationship("IncidenteServicio", back_populates="usuario")
    revisiones = relationship("RevisionSilabo", back_populates="admin")
    sugerencias_estudio = relationship("SugerenciaEstudio", back_populates="usuario", cascade="all, delete-orphan")
    notificaciones_programadas = relationship("NotificacionProgramada", back_populates="usuario", cascade="all, delete-orphan")


class SesionUsuario(Base):
    __tablename__ = "sesiones_usuario"
    
    id = Column(Integer, primary_key=True, index=True)
    id_usuario = Column(Integer, ForeignKey("usuario.id", ondelete="CASCADE"))
    token = Column(String(500), unique=True, nullable=False, index=True)
    refresh_token = Column(String(500), unique=True, nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(255), nullable=True)
    fecha_inicio = Column(DateTime, default=func.now())
    fecha_expiracion = Column(DateTime, nullable=False)
    fecha_cierre = Column(DateTime, nullable=True)
    es_activa = Column(Boolean, default=True)
    
    usuario = relationship("Usuario", back_populates="sesiones")


class TokenBlacklist(Base):
    __tablename__ = "token_blacklist"
    
    id = Column(Integer, primary_key=True, index=True)
    token = Column(String(500), unique=True, nullable=False)
    fecha_expiracion = Column(DateTime, nullable=False)
    fecha_agregado = Column(DateTime, default=func.now())


class PeriodoAcademico(Base):
    __tablename__ = "periodo_academico"
    
    id_periodo = Column(Integer, primary_key=True, index=True)
    anio = Column(Integer, nullable=False)
    termino = Column(String(20), nullable=False)
    nombre = Column(String(50), nullable=False)
    es_actual = Column(Boolean, default=False)
    fecha_inicio = Column(DateTime, nullable=False)
    fecha_fin = Column(DateTime, nullable=False)
    fecha_creacion = Column(DateTime, default=func.now())
    
    # Relationships
    cursos_contexto = relationship("ContextoCursoUsuario", back_populates="periodo")
    silabos = relationship("Silabo", back_populates="periodo")


class Curso(Base):
    __tablename__ = "curso"
    
    id_curso = Column(Integer, primary_key=True, index=True)
    codigo_curso = Column(String(20), unique=True, nullable=False)
    nombre_curso = Column(String(200), nullable=False)
    ciclo_referencial = Column(String(20), nullable=True)
    creditos = Column(Integer, default=3)
    escuela = Column(String(100), default="Ingeniería de Sistemas")
    estado = Column(Boolean, default=True)
    fecha_creacion = Column(DateTime, default=func.now())
    
    # Relationships
    contextos_usuario = relationship("ContextoCursoUsuario", back_populates="curso")
    silabos = relationship("Silabo", back_populates="curso")
    reglas = relationship("ReglaEvaluacion", back_populates="curso")


class ContextoCursoUsuario(Base):
    __tablename__ = "contexto_curso_usuario"
    
    id_contexto = Column(Integer, primary_key=True, index=True)
    id_usuario = Column(Integer, ForeignKey("usuario.id", ondelete="CASCADE"), nullable=False)
    id_curso = Column(Integer, ForeignKey("curso.id_curso", ondelete="CASCADE"), nullable=False)
    id_periodo = Column(Integer, ForeignKey("periodo_academico.id_periodo", ondelete="CASCADE"), nullable=False)
    id_silabo_asignado = Column(Integer, ForeignKey("silabo.id_silabo", ondelete="SET NULL"), nullable=True)  # <<< FK CORREGIDA
    
    origen_contexto = Column(Enum(OrigenContexto), default=OrigenContexto.DECLARADO_USUARIO)
    estado_verificacion = Column(Enum(EstadoVerificacion), default=EstadoVerificacion.PENDIENTE_CONFIRMACION)
    puntaje_confianza = Column(Float, default=0.0)
    
    # Datos académicos del estudiante en este curso
    nota_final = Column(Float, nullable=True)
    asistencia = Column(Float, nullable=True)
    pu1 = Column(Float, nullable=True)
    pu2 = Column(Float, nullable=True)
    pu3 = Column(Float, nullable=True)
    
    fecha_creacion = Column(DateTime, default=func.now())
    fecha_actualizacion = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    usuario = relationship("Usuario", back_populates="contextos_cursos")
    curso = relationship("Curso", back_populates="contextos_usuario")
    periodo = relationship("PeriodoAcademico", back_populates="cursos_contexto")
    silabo_asignado = relationship("Silabo", back_populates="contextos_asignados", foreign_keys=[id_silabo_asignado])  # <<< RELACIÓN CORREGIDA
    sesiones_chat = relationship("SesionChat", back_populates="contexto")
    solicitudes = relationship("SolicitudServicio", back_populates="contexto")
    incidentes_academicos = relationship("IncidenteAcademico", back_populates="contexto")
    sugerencias_estudio = relationship("SugerenciaEstudio", back_populates="contexto")


class Silabo(Base):
    __tablename__ = "silabo"
    
    id_silabo = Column(Integer, primary_key=True, index=True)
    id_curso = Column(Integer, ForeignKey("curso.id_curso"), nullable=False)
    id_periodo = Column(Integer, ForeignKey("periodo_academico.id_periodo"), nullable=True)
    id_usuario_subida = Column(Integer, ForeignKey("usuario.id"), nullable=True)
    
    tipo_silabo = Column(Enum(TipoSilabo), default=TipoSilabo.SUBIDO_USUARIO)
    ambito_uso = Column(Enum(AmbitoUso), default=AmbitoUso.PRIVADO)
    estado_validacion = Column(Enum(EstadoVerificacion), default=EstadoVerificacion.PENDIENTE_CONFIRMACION)
    coincidencia_periodo = Column(Enum(CoincidenciaPeriodo), default=CoincidenciaPeriodo.DESCONOCIDO)
    puntaje_confianza = Column(Float, default=0.0)
    
    version = Column(Integer, default=1)
    ruta_pdf = Column(String(500), nullable=True)
    nombre_archivo = Column(String(255), nullable=False)
    texto_extraido = Column(Text, nullable=True)
    observaciones_validacion = Column(Text, nullable=True)
    
    # Campos legacy (compatibilidad)
    es_oficial = Column(Boolean, default=False)
    es_validado = Column(Boolean, default=False)
    aviso_fiabilidad = Column(Text, nullable=True)
    reglas_json = Column(JSON, nullable=True)
    
    fecha_subida = Column(DateTime, default=func.now())
    fecha_actualizacion = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    curso = relationship("Curso", back_populates="silabos")
    periodo = relationship("PeriodoAcademico", back_populates="silabos")
    usuario_subida = relationship("Usuario", back_populates="silabos_subidos")
    chunks = relationship("SilaboChunk", back_populates="silabo", cascade="all, delete-orphan")
    reglas = relationship("ReglaEvaluacion", back_populates="silabo", cascade="all, delete-orphan")
    contextos_asignados = relationship("ContextoCursoUsuario", back_populates="silabo_asignado", foreign_keys=[ContextoCursoUsuario.id_silabo_asignado])  # <<< RELACIÓN CORREGIDA
    solicitudes = relationship("SolicitudServicio", back_populates="silabo")
    incidentes = relationship("IncidenteAcademico", back_populates="silabo")
    incidentes_servicio = relationship("IncidenteServicio", back_populates="silabo")
    revisiones = relationship("RevisionSilabo", back_populates="silabo", cascade="all, delete-orphan")
    logs_ingestion = relationship("LogIngestion", back_populates="silabo")
    sugerencias_estudio = relationship("SugerenciaEstudio", back_populates="silabo")


class SilaboChunk(Base):
    __tablename__ = "silabo_chunk"
    
    id_seccion = Column(Integer, primary_key=True, index=True)
    id_silabo = Column(Integer, ForeignKey("silabo.id_silabo", ondelete="CASCADE"), nullable=False)
    tipo_seccion = Column(Enum(TipoSeccionChunk), nullable=False)
    titulo = Column(String(200), nullable=True)
    contenido = Column(Text, nullable=False)
    embedding = Column(JSON, nullable=True)  # JSON en lugar de Vector (evita pgvector)
    orden = Column(Integer, default=0)
    metadata_json = Column(JSON, nullable=True)
    fecha_creacion = Column(DateTime, default=func.now())
    
    silabo = relationship("Silabo", back_populates="chunks")


class ReglaEvaluacion(Base):
    __tablename__ = "regla_evaluacion"
    
    id_regla = Column(Integer, primary_key=True, index=True)
    id_silabo = Column(Integer, ForeignKey("silabo.id_silabo", ondelete="CASCADE"), nullable=False)
    id_curso = Column(Integer, ForeignKey("curso.id_curso"), nullable=True)
    tipo_regla = Column(Enum(TipoRegla), nullable=False)
    definicion_json = Column(JSON, nullable=False)
    es_validada = Column(Boolean, default=False)
    fuente_regla = Column(String(50), default="EXTRACCION_AUTOMATICA")
    fecha_registro = Column(DateTime, default=func.now())
    
    silabo = relationship("Silabo", back_populates="reglas")
    curso = relationship("Curso", back_populates="reglas")


class SesionChat(Base):
    __tablename__ = "sesion_chat"
    
    id_sesion = Column(Integer, primary_key=True, index=True)
    id_usuario = Column(Integer, ForeignKey("usuario.id"), nullable=False)
    id_contexto = Column(Integer, ForeignKey("contexto_curso_usuario.id_contexto"), nullable=False)
    fecha_inicio = Column(DateTime, default=func.now())
    fecha_fin = Column(DateTime, nullable=True)
    resumen = Column(Text, nullable=True)
    
    usuario = relationship("Usuario", back_populates="sesiones_chat")
    contexto = relationship("ContextoCursoUsuario", back_populates="sesiones_chat")
    mensajes = relationship("MensajeChat", back_populates="sesion", cascade="all, delete-orphan")


class MensajeChat(Base):
    __tablename__ = "mensaje_chat"
    
    id_mensaje = Column(Integer, primary_key=True, index=True)
    id_sesion = Column(Integer, ForeignKey("sesion_chat.id_sesion", ondelete="CASCADE"), nullable=False)
    remitente = Column(String(20), nullable=False)
    contenido = Column(Text, nullable=False)
    tipo_consulta = Column(String(50), nullable=True)
    fragmentos_usados = Column(JSON, nullable=True)
    reglas_aplicadas = Column(JSON, nullable=True)
    tiempo_respuesta_ms = Column(Integer, nullable=True)
    fecha_envio = Column(DateTime, default=func.now())
    
    sesion = relationship("SesionChat", back_populates="mensajes")


class SolicitudServicio(Base):
    __tablename__ = "solicitud_servicio"
    
    id_solicitud = Column(Integer, primary_key=True, index=True)
    id_usuario = Column(Integer, ForeignKey("usuario.id"), nullable=False)
    id_contexto = Column(Integer, ForeignKey("contexto_curso_usuario.id_contexto"), nullable=False)
    id_silabo = Column(Integer, ForeignKey("silabo.id_silabo"), nullable=True)
    
    categoria = Column(String(50), nullable=False)
    descripcion = Column(Text, nullable=False)
    respuesta_generada = Column(Text, nullable=True)
    
    estado = Column(Enum(EstadoSolicitud), default=EstadoSolicitud.ABIERTA)
    prioridad = Column(String(10), default="media")
    canal = Column(String(20), default="web_chat")
    
    tiempo_respuesta_ms = Column(Integer, nullable=True)
    fecha_creacion = Column(DateTime, default=func.now())
    fecha_cierre = Column(DateTime, nullable=True)
    escalada_a_docente = Column(Boolean, default=False)
    
    usuario = relationship("Usuario", back_populates="solicitudes")
    contexto = relationship("ContextoCursoUsuario", back_populates="solicitudes")
    silabo = relationship("Silabo", back_populates="solicitudes")


class IncidenteAcademico(Base):
    __tablename__ = "incidente_academico"
    
    id_incidente = Column(Integer, primary_key=True, index=True)
    id_usuario = Column(Integer, ForeignKey("usuario.id"), nullable=False)
    id_contexto = Column(Integer, ForeignKey("contexto_curso_usuario.id_contexto"), nullable=False)
    id_silabo = Column(Integer, ForeignKey("silabo.id_silabo"), nullable=True)
    
    severidad = Column(String(20), nullable=False)
    descripcion = Column(Text, nullable=False)
    pp_proyectado = Column(Float, nullable=True)
    recomendacion = Column(Text, nullable=True)
    
    estado = Column(Enum(EstadoIncidente), default=EstadoIncidente.ACTIVO)
    fecha_creacion = Column(DateTime, default=func.now())
    fecha_cierre = Column(DateTime, nullable=True)
    escalado_a_tutoria = Column(Boolean, default=False)
    
    usuario = relationship("Usuario", back_populates="incidentes_academicos")
    contexto = relationship("ContextoCursoUsuario", back_populates="incidentes_academicos")
    silabo = relationship("Silabo", back_populates="incidentes")


class IncidenteServicio(Base):
    __tablename__ = "incidente_servicio"
    
    id_incidente_servicio = Column(Integer, primary_key=True, index=True)
    id_usuario = Column(Integer, ForeignKey("usuario.id"), nullable=True)
    id_silabo = Column(Integer, ForeignKey("silabo.id_silabo"), nullable=False)
    
    tipo_incidente = Column(Enum(TipoIncidenteServicio), nullable=False)
    descripcion = Column(Text, nullable=False)
    metadata_incidente = Column(JSON, nullable=True)
    
    estado = Column(Enum(EstadoIncidente), default=EstadoIncidente.ACTIVO)
    fecha_creacion = Column(DateTime, default=func.now())
    fecha_cierre = Column(DateTime, nullable=True)
    
    usuario = relationship("Usuario", back_populates="incidentes_servicio")
    silabo = relationship("Silabo", back_populates="incidentes_servicio")


class RevisionSilabo(Base):
    __tablename__ = "revision_silabo"
    
    id_revision = Column(Integer, primary_key=True, index=True)
    id_silabo = Column(Integer, ForeignKey("silabo.id_silabo", ondelete="CASCADE"), nullable=False)
    id_admin = Column(Integer, ForeignKey("usuario.id"), nullable=False)
    
    accion = Column(Enum(AccionRevision), nullable=False)
    comentario = Column(Text, nullable=True)
    metadatos_revision = Column(JSON, nullable=True)
    
    fecha_revision = Column(DateTime, default=func.now())
    
    silabo = relationship("Silabo", back_populates="revisiones")
    admin = relationship("Usuario", back_populates="revisiones")


class LogIngestion(Base):
    __tablename__ = "logs_ingestion"
    
    id = Column(Integer, primary_key=True, index=True)
    id_silabo = Column(Integer, ForeignKey("silabo.id_silabo"), nullable=False)
    id_usuario = Column(Integer, ForeignKey("usuario.id"), nullable=True)
    
    exito = Column(Boolean, default=False)
    puntaje_confianza = Column(Float, default=0.0)
    error_mensaje = Column(Text, nullable=True)
    parsing_detected = Column(JSON, nullable=True)
    
    fecha = Column(DateTime, default=func.now())
    
    silabo = relationship("Silabo", back_populates="logs_ingestion")
    usuario = relationship("Usuario")


class MetricaDiaria(Base):
    __tablename__ = "metrica_diaria"
    
    id = Column(Integer, primary_key=True, index=True)
    fecha = Column(DateTime, default=func.now(), unique=True)
    
    total_solicitudes = Column(Integer, default=0)
    solicitudes_resueltas_nivel1 = Column(Integer, default=0)
    solicitudes_escaladas = Column(Integer, default=0)
    
    incidentes_academicos_activos = Column(Integer, default=0)
    incidentes_servicio_activos = Column(Integer, default=0)
    
    silabos_subidos = Column(Integer, default=0)
    silabos_pendientes_revision = Column(Integer, default=0)
    silabos_publicados = Column(Integer, default=0)
    
    tiempo_promedio_respuesta_ms = Column(Integer, default=0)
    tasa_resolucion_nivel1 = Column(Float, default=0.0)
    
    usuarios_activos_dia = Column(Integer, default=0)
    
    fecha_actualizacion = Column(DateTime, default=func.now(), onupdate=func.now())


class SugerenciaEstudio(Base):
    __tablename__ = "sugerencia_estudio"
    
    id_sugerencia = Column(Integer, primary_key=True, index=True)
    id_usuario = Column(Integer, ForeignKey("usuario.id", ondelete="CASCADE"), nullable=False)
    id_contexto = Column(Integer, ForeignKey("contexto_curso_usuario.id_contexto", ondelete="CASCADE"), nullable=False)
    id_silabo = Column(Integer, ForeignKey("silabo.id_silabo", ondelete="SET NULL"), nullable=True)
    
    tipo_sugerencia = Column(Enum(TipoSugerencia), nullable=False)
    tema_o_evidencia = Column(String(100), nullable=False)
    unidad_asociada = Column(Integer, nullable=True)
    horas_sugeridas = Column(Float, nullable=False)
    distribucion_sugerida = Column(JSON, nullable=True)
    justificacion = Column(Text, nullable=False)
    prioridad = Column(Integer, default=1)
    
    estado = Column(Enum(EstadoSugerencia), default=EstadoSugerencia.PENDIENTE)
    
    fecha_generacion = Column(DateTime, default=func.now())
    fecha_expiracion = Column(DateTime, nullable=True)
    fecha_respuesta = Column(DateTime, nullable=True)
    
    # Relaciones
    usuario = relationship("Usuario", back_populates="sugerencias_estudio")
    contexto = relationship("ContextoCursoUsuario", back_populates="sugerencias_estudio")
    silabo = relationship("Silabo", back_populates="sugerencias_estudio")
    notificaciones = relationship("NotificacionProgramada", back_populates="sugerencia", cascade="all, delete-orphan")


class NotificacionProgramada(Base):
    __tablename__ = "notificacion_programada"
    
    id_notificacion = Column(Integer, primary_key=True, index=True)
    id_sugerencia = Column(Integer, ForeignKey("sugerencia_estudio.id_sugerencia", ondelete="CASCADE"), nullable=False)
    id_usuario = Column(Integer, ForeignKey("usuario.id", ondelete="CASCADE"), nullable=False)
    
    destinatario = Column(String(100), nullable=False)
    asunto = Column(String(255), nullable=False)
    contenido = Column(Text, nullable=False)
    
    fecha_programada = Column(DateTime, nullable=False)
    fecha_envio = Column(DateTime, nullable=True)
    
    estado = Column(Enum(EstadoNotificacion), default=EstadoNotificacion.PENDIENTE)
    
    # Relaciones
    sugerencia = relationship("SugerenciaEstudio", back_populates="notificaciones")
    usuario = relationship("Usuario", back_populates="notificaciones_programadas")