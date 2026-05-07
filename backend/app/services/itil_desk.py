from sqlalchemy.orm import Session
from datetime import datetime
from typing import Dict, List
from app.database.models import SolicitudServicio, IncidenteAcademico, LogIngestion
from app.config import Config

class ITILServiceDesk:
    
    @staticmethod
    def registrar_solicitud(
        db: Session,
        id_usuario: str,
        id_silabo: int,
        tipo: str,
        pregunta: str,
        respuesta: str,
        fragmentos_usados: List[Dict],
        reglas_aplicadas: Dict,
        tiempo_ms: int,
        escalar: bool = False
    ) -> SolicitudServicio:
        """Registra una solicitud de servicio (ITIL Service Request)"""
        solicitud = SolicitudServicio(
            id_usuario=id_usuario,
            id_silabo=id_silabo,
            tipo=tipo,
            pregunta=pregunta,
            respuesta=respuesta[:500],
            fragmentos_usados=fragmentos_usados,
            reglas_aplicadas=reglas_aplicadas,
            tiempo_respuesta_ms=tiempo_ms,
            escalada=escalar
        )
        db.add(solicitud)
        db.commit()
        db.refresh(solicitud)
        return solicitud
    
    @staticmethod
    def registrar_incidente(
        db: Session,
        id_usuario: str,
        id_silabo: int,
        severidad: str,
        promedio_actual: float,
        nota_necesaria: float,
        recomendacion: str
    ) -> IncidenteAcademico:
        """Registra un incidente académico (ITIL Incident Management)"""
        incidente = IncidenteAcademico(
            id_usuario=id_usuario,
            id_silabo=id_silabo,
            severidad=severidad,
            promedio_actual=promedio_actual,
            nota_necesaria=nota_necesaria,
            recomendacion=recomendacion
        )
        db.add(incidente)
        db.commit()
        db.refresh(incidente)
        
        # Si es severidad ALTA, escalar automáticamente
        if severidad in ["ALTO", "MUY ALTO"]:
            ITILServiceDesk._notificar_escalamiento(incidente)
        
        return incidente
    
    @staticmethod
    def registrar_fallo_ingestion(
        db: Session,
        id_silabo: int,
        error: str,
        parsing_detected: Dict
    ) -> LogIngestion:
        """Registra fallos en la ingestión de sílabos (para mejora continua)"""
        log = LogIngestion(
            id_silabo=id_silabo,
            exito=False,
            error_mensaje=error,
            parsing_detected=parsing_detected
        )
        db.add(log)
        db.commit()
        return log
    
    @staticmethod
    def _notificar_escalamiento(incidente: IncidenteAcademico):
        """Simula notificación al docente (email/WhatsApp)"""
        # En producción: enviar email al docente
        print(f"""
        🔔 ESCALAMIENTO ITIL
        Incidente: {incidente.id}
        Usuario: {incidente.id_usuario}
        Severidad: {incidente.severidad}
        Recomendación: {incidente.recomendacion}
        Contactar tutoría: {Config.TUTORIA_EMAIL} | {Config.TUTORIA_DIA} {Config.TUTORIA_HORARIO}
        """)
    
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