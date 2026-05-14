from sqlalchemy.orm import Session
from datetime import datetime
from typing import Dict, List, Optional
from app.database.models import (
    SolicitudServicio, IncidenteAcademico, IncidenteServicio, 
    LogIngestion, Silabo, TipoSilabo, AmbitoUso,
    EstadoSolicitud, EstadoIncidente, TipoIncidenteServicio
)
from app.config import Config

class ITILServiceDesk:
    
    @staticmethod
    def registrar_solicitud(
        db: Session,
        id_usuario: int,
        id_contexto: int,
        id_silabo: Optional[int],
        categoria: str,
        descripcion: str,
        respuesta: str,
        reglas_aplicadas: Optional[Dict] = None,
        tiempo_ms: Optional[int] = None,
        escalar: bool = False
    ) -> SolicitudServicio:
        """Registra una solicitud de servicio (ITIL Service Request)"""
        solicitud = SolicitudServicio(
            id_usuario=id_usuario,
            id_contexto=id_contexto,
            id_silabo=id_silabo,
            categoria=categoria,
            descripcion=descripcion,
            respuesta_generada=respuesta[:500],
            reglas_aplicadas=reglas_aplicadas,
            tiempo_respuesta_ms=tiempo_ms,
            estado=EstadoSolicitud.RESUELTA if not escalar else EstadoSolicitud.ESCALADA,
            escalada_a_docente=escalar
        )
        db.add(solicitud)
        db.commit()
        db.refresh(solicitud)
        return solicitud
    
    @staticmethod
    def registrar_incidente_academico(
        db: Session,
        id_usuario: int,
        id_contexto: int,
        id_silabo: Optional[int],
        severidad: str,
        descripcion: str,
        pp_proyectado: Optional[float] = None,
        recomendacion: Optional[str] = None
    ) -> IncidenteAcademico:
        """Registra un incidente académico (Riesgo de desaprobación)"""
        incidente = IncidenteAcademico(
            id_usuario=id_usuario,
            id_contexto=id_contexto,
            id_silabo=id_silabo,
            severidad=severidad,
            descripcion=descripcion,
            pp_proyectado=pp_proyectado,
            recomendacion=recomendacion,
            estado=EstadoIncidente.ACTIVO,
            escalado_a_tutoria=(severidad == "ALTA")
        )
        db.add(incidente)
        db.commit()
        db.refresh(incidente)
        
        if severidad == "ALTA":
            ITILServiceDesk._notificar_escalamiento(incidente)
        
        return incidente

    @staticmethod
    def registrar_incidente_servicio(
        db: Session,
        id_silabo: int,
        tipo: TipoIncidenteServicio,
        descripcion: str,
        id_usuario: Optional[int] = None,
        metadata: Optional[Dict] = None
    ) -> IncidenteServicio:
        """Registra fallos documentales (Parsing, Ilegible, Mismatch)"""
        incidente = IncidenteServicio(
            id_usuario=id_usuario,
            id_silabo=id_silabo,
            tipo_incidente=tipo,
            descripcion=descripcion,
            metadata_incidente=metadata,
            estado=EstadoIncidente.ACTIVO
        )
        db.add(incidente)
        db.commit()
        db.refresh(incidente)
        return incidente
    
    @staticmethod
    def procesar_agrupamiento_conocimiento(db: Session, id_curso: int, id_periodo: int):
        """
        Si varios usuarios suben el mismo sílabo (mismo curso+periodo), 
        el sistema los agrupa para revisión administrativa.
        """
        count = db.query(Silabo).filter(
            Silabo.id_curso == id_curso,
            Silabo.id_periodo == id_periodo,
            Silabo.tipo_silabo == TipoSilabo.SUBIDO_USUARIO
        ).count()
        
        if count >= 3:
            # Marcar como candidato a revisión oficial (si no hay uno ya)
            silabos = db.query(Silabo).filter(
                Silabo.id_curso == id_curso,
                Silabo.id_periodo == id_periodo,
                Silabo.ambito_uso == AmbitoUso.PRIVADO
            ).all()
            for s in silabos:
                if s.puntaje_confianza > 60:
                    s.ambito_uso = AmbitoUso.COMPARTIBLE
            db.commit()

    @staticmethod
    def _notificar_escalamiento(incidente: IncidenteAcademico):
        """Simula notificación al docente"""
        print(f"🔔 ALERTA ITIL: Riesgo detectado para Usuario {incidente.id_usuario}. Escala a tutoría.")
    
    @staticmethod
    def obtener_metricas(db: Session) -> Dict:
        """Obtiene métricas de servicio (para mejora continua)"""
        total_solicitudes = db.query(SolicitudServicio).count()
        total_incidentes = db.query(IncidenteAcademico).count()
        incidentes_activos = db.query(IncidenteAcademico).filter(
            IncidenteAcademico.resuelto == False
        ).count()
        
        solicitudes_escaladas = db.query(SolicitudServicio).filter(
            SolicitudServicio.escalada == True
        ).count()
        
        fallos_ingestion = db.query(LogIngestion).filter(
            LogIngestion.exito == False
        ).count()
        
        # Tasa de resolución de nivel 1
        tasa_resolucion_n1 = 0
        if total_solicitudes > 0:
            tasa_resolucion_n1 = (total_solicitudes - solicitudes_escaladas) / total_solicitudes * 100
        
        return {
            "total_solicitudes": total_solicitudes,
            "total_incidentes": total_incidentes,
            "incidentes_activos": incidentes_activos,
            "solicitudes_escaladas": solicitudes_escaladas,
            "fallos_ingestion": fallos_ingestion,
            "tasa_resolucion_nivel1": round(tasa_resolucion_n1, 2),
            "info_tutoria": {
                "dia": Config.TUTORIA_DIA,
                "horario": Config.TUTORIA_HORARIO,
                "email": Config.TUTORIA_EMAIL,
                "canales": Config.TUTORIA_CANALES
            }
        }