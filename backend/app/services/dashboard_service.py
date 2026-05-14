from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from datetime import datetime, date
from app.database.models import (
    SolicitudServicio, IncidenteAcademico, IncidenteServicio,
    Silabo, EstadoSolicitud, EstadoIncidente, TipoSilabo,
    AmbitoUso, EstadoVerificacion, Curso, PeriodoAcademico,
    MensajeChat
)

class DashboardService:
    
    @staticmethod
    def get_resumen_operativo(db: Session):
        today = date.today()
        return {
            "solicitudes_abiertas": db.query(SolicitudServicio).filter(SolicitudServicio.estado == EstadoSolicitud.ABIERTA).count(),
            "incidentes_academicos_activos": db.query(IncidenteAcademico).filter(IncidenteAcademico.estado == EstadoIncidente.ACTIVO).count(),
            "incidentes_servicio_activos": db.query(IncidenteServicio).filter(IncidenteServicio.estado == EstadoIncidente.ACTIVO).count(),
            "silabos_pendientes": db.query(Silabo).filter(
                or_(
                    Silabo.ambito_uso == AmbitoUso.COMPARTIBLE,
                    Silabo.estado_validacion == EstadoVerificacion.PENDIENTE_CONFIRMACION
                )
            ).count(),
            "tasa_resolucion_sin_escalar": DashboardService._calcular_tasa_resolucion(db)
        }

    @staticmethod
    def get_gestion_tickets(db: Session, filters: dict = None):
        # Implementación de métricas de tickets
        total = db.query(SolicitudServicio).count()
        resueltas = db.query(SolicitudServicio).filter(SolicitudServicio.estado == EstadoSolicitud.RESUELTA).count()
        return {
            "total_tickets": total,
            "backlog": total - resueltas,
            "tickets_vencidos": 0, # Placeholder para lógica de SLA
            "tiempo_medio_resolucion_ms": db.query(func.avg(SolicitudServicio.tiempo_respuesta_ms)).scalar() or 0
        }

    @staticmethod
    def get_conocimiento_silabos(db: Session):
        return {
            "oficiales_publicados": db.query(Silabo).filter(Silabo.tipo_silabo == TipoSilabo.OFICIAL, Silabo.ambito_uso == AmbitoUso.PUBLICADO).count(),
            "subidos_usuarios": db.query(Silabo).filter(Silabo.tipo_silabo == TipoSilabo.SUBIDO_USUARIO).count(),
            "compartibles_pendientes": db.query(Silabo).filter(Silabo.ambito_uso == AmbitoUso.COMPARTIBLE).count(),
            "rechazados": db.query(Silabo).filter(Silabo.estado_validacion == EstadoVerificacion.RECHAZADO).count()
        }

    @staticmethod
    def get_riesgo_academico(db: Session):
        # Estudiantes con PP proyectado < 14
        estudiantes_riesgo = db.query(IncidenteAcademico).filter(
            IncidenteAcademico.pp_proyectado < 14,
            IncidenteAcademico.estado == EstadoIncidente.ACTIVO
        ).count()
        
        return {
            "estudiantes_en_riesgo": estudiantes_riesgo,
            "casos_escalados_tutoria": db.query(IncidenteAcademico).filter(IncidenteAcademico.escalado_a_tutoria == True).count(),
            "incidentes_por_severidad": {
                "ALTA": db.query(IncidenteAcademico).filter(IncidenteAcademico.severidad == "ALTA").count(),
                "MEDIA": db.query(IncidenteAcademico).filter(IncidenteAcademico.severidad == "MEDIA").count(),
                "BAJA": db.query(IncidenteAcademico).filter(IncidenteAcademico.severidad == "BAJA").count()
            }
        }

    @staticmethod
    def get_mejora_continua(db: Session):
        # Preguntas frecuentes (top consultas)
        top_consultas = db.query(SolicitudServicio.categoria, func.count(SolicitudServicio.id_solicitud)).group_by(SolicitudServicio.categoria).order_by(func.count(SolicitudServicio.id_solicitud).desc()).limit(5).all()
        
        return {
            "top_consultas": [{"categoria": c, "count": cnt} for c, cnt in top_consultas],
            "cursos_sin_silabo_oficial": db.query(Curso).filter(~Curso.silabos.any(Silabo.tipo_silabo == TipoSilabo.OFICIAL)).count(),
            "tasa_reutilizacion": 0.0 # Lógica para ver si se usan silabos compartidos
        }

    @staticmethod
    def _calcular_tasa_resolucion(db: Session):
        total = db.query(SolicitudServicio).count()
        if total == 0: return 100.0
        escalados = db.query(SolicitudServicio).filter(SolicitudServicio.escalada_a_docente == True).count()
        return round(((total - escalados) / total) * 100, 2)
