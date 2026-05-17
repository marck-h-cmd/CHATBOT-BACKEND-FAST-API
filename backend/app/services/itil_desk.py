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

    @staticmethod
    def validar_formulas_evidencias(parsing_data: Dict) -> List[str]:
        """
        Valida de forma robusta que los términos usados en las fórmulas correspondan
        a las claves o nombres de las evidencias declaradas, o a identificadores de fórmula válidos.
        """
        errores = []
        evidencias = parsing_data.get("evidencias", {})
        formulas = parsing_data.get("formulas", {})
        
        if not evidencias:
            errores.append("No se encontraron evidencias de evaluación declaradas en el sílabo.")
            return errores

        import re
        
        # 1. Recopilar todos los términos válidos conocidos
        terminos_validos = []
        
        # Claves de evidencias (ej. PRACTICAS, INFORMES, EXAMEN_PARCIAL)
        terminos_validos.extend(list(evidencias.keys()))
        
        # Nombres de evidencias (ej. Prácticas, Informes, Examen Parcial)
        for val in evidencias.values():
            if isinstance(val, dict) and val.get("nombre"):
                terminos_validos.append(val.get("nombre"))
                
        # Nombres de fórmulas y variables estándar
        terminos_validos.extend(list(formulas.keys()))
        terminos_validos.extend(["PU1", "PU2", "PU3", "PU4", "PP", "NF", "PF", "FINAL", "PROM", "EP", "EF"])
        
        # Funciones matemáticas reservadas
        terminos_validos.extend(["MIN", "MAX", "SUM", "AVG", "IF", "ELSE", "LOG", "EXP", "ROUND"])
        
        # Ordenar términos por longitud descendente para evitar reemplazos parciales (ej. Examen Parcial antes de Examen)
        terminos_validos = sorted(list(set(terminos_validos)), key=len, reverse=True)

        for nombre_formula, expr in formulas.items():
            if not expr or not isinstance(expr, str):
                continue
                
            expr_limpia = expr
            # Reemplazar cada término válido por espacio
            for termino in terminos_validos:
                # Usar re.escape y manejar ignorar mayúsculas/minúsculas
                expr_limpia = re.sub(r'\b' + re.escape(termino) + r'\b', ' ', expr_limpia, flags=re.IGNORECASE)
                # También sin \b por si hay temas con tildes en los límites de palabra
                expr_limpia = re.sub(re.escape(termino), ' ', expr_limpia, flags=re.IGNORECASE)
                
            # Eliminar números, operadores matemáticos y signos de puntuación
            expr_limpia = re.sub(r'[\d\s\+\-\*\/\(\)\[\]\{\}\.\,\^\%\=\<\>\:\;]', '', expr_limpia)
            
            # Si queda algún texto, es un término desconocido
            if expr_limpia.strip():
                # Para dar un mejor mensaje, buscamos qué palabra original quedó
                palabras_orig = re.findall(r'[a-zA-ZáéíóúÁÉÍÓÚñÑ_]+', expr)
                desconocidos = []
                for p in palabras_orig:
                    # Verificar si p está contenida en algún término válido
                    if not any(p.lower() in t.lower() for t in terminos_validos):
                        desconocidos.append(p)
                
                desc_desconocidos = ", ".join(set(desconocidos)) if desconocidos else expr_limpia.strip()
                errores.append(
                    f"Inconsistencia en fórmula '{nombre_formula}': Se detectó el término desconocido '{desc_desconocidos}' que no coincide con ninguna evidencia declarada."
                )
                    
        return errores