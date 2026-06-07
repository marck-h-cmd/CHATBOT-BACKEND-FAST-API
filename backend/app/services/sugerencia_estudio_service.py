from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.database.models import SugerenciaEstudio, ContextoCursoUsuario, TipoSugerencia, EstadoSugerencia, SilaboChunk, TipoSeccionChunk
import json
import re

class SugerenciaEstudioService:
    
    @staticmethod
    def generar_sugerencia_por_peso(db: Session, id_usuario: int, id_contexto: int, evidencia: str, peso_porcentaje: float) -> SugerenciaEstudio:
        # Calcular horas basadas en el peso
        if peso_porcentaje >= 40:
            horas = 5.0
            distribucion = {"profunda": 3.0, "practica": 1.5, "revision": 0.5}
            prioridad = 1
        elif peso_porcentaje >= 30:
            horas = 3.5
            distribucion = {"profunda": 2.0, "practica": 1.0, "revision": 0.5}
            prioridad = 2
        elif peso_porcentaje >= 20:
            horas = 2.5
            distribucion = {"profunda": 1.0, "practica": 1.0, "revision": 0.5}
            prioridad = 2
        else:
            horas = 1.5
            distribucion = {"profunda": 0.5, "practica": 0.5, "revision": 0.5}
            prioridad = 3
            
        justificacion = f"Esta actividad tiene un peso significativo ({peso_porcentaje}% de la nota)."
        
        return SugerenciaEstudioService._crear_o_actualizar_sugerencia(
            db, id_usuario, id_contexto, TipoSugerencia.POR_PESO, evidencia, horas, distribucion, justificacion, prioridad
        )

    @staticmethod
    def generar_sugerencia_por_riesgo(db: Session, id_usuario: int, id_contexto: int) -> SugerenciaEstudio:
        contexto = db.query(ContextoCursoUsuario).filter(ContextoCursoUsuario.id_contexto == id_contexto).first()
        if not contexto:
            return None
            
        # Determinar pp_proyectado (simplificado para este ejemplo, dependería de RuleEngine en un caso real)
        # Asumiendo que el pp_proyectado está calculado en alguna parte o usamos un mock
        from app.services.rule_engine import RuleEngine
        if not contexto.silabo_asignado:
            return None
            
        riesgo = RuleEngine.evaluar_riesgo(contexto.pu1, contexto.pu2, contexto.pu3, contexto.silabo_asignado)
        
        # Determinar qué unidad está en curso para personalizar los temas
        unidad_actual = "Desconocida"
        if contexto.pu1 is None:
            unidad_actual = "Unidad 1"
        elif contexto.pu2 is None:
            unidad_actual = "Unidad 2"
        elif contexto.pu3 is None:
            unidad_actual = "Unidad 3"
        else:
            unidad_actual = "Sustitutorio/Final"

        tema_urgente = f"Recuperación {unidad_actual}" if unidad_actual != "Sustitutorio/Final" else "Preparación Sustitutorio"

        if riesgo["nivel"] == "ALTA":
            horas = 8.0
            distribucion = [
                {"semana": "Actual", "tema": f"Diagnóstico de fallas en temas pasados", "horas": 2.0, "prioridad": 1, "enfoque": "Identificar ejercicios y conceptos críticos que causaron el bajo rendimiento anterior para no repetirlos."},
                {"semana": "Próxima", "tema": f"Estudio Intensivo: {tema_urgente}", "horas": 4.0, "prioridad": 1, "enfoque": "Resolución exhaustiva de ejercicios tipo examen y memorización de fórmulas clave."},
                {"semana": "Pre-Examen", "tema": "Simulacro y Tutoría", "horas": 2.0, "prioridad": 1, "enfoque": "Realizar un simulacro de examen con límite de tiempo y asistir a asesoría con el docente."}
            ]
            justificacion = f"Riesgo académico ALTO detectado. Para aprobar necesitas asegurar una nota alta en {unidad_actual}. Este plan de rescate intensivo está diseñado para maximizar tus puntos."
            prioridad = 1
        elif riesgo["nivel"] == "MEDIA":
            horas = 5.0
            distribucion = [
                {"semana": "Actual", "tema": "Consolidación de teoría básica", "horas": 2.0, "prioridad": 2, "enfoque": "Revisar la teoría y notas de clase asegurando que no queden dudas fundamentales."},
                {"semana": "Próxima", "tema": f"Práctica enfocada: {unidad_actual}", "horas": 3.0, "prioridad": 2, "enfoque": "Resolver los ejercicios propuestos y tareas pendientes de la unidad en curso."}
            ]
            justificacion = f"Estás en el límite. Un esfuerzo extra en {unidad_actual} te dará un margen de seguridad para no caer en riesgo alto y asegurar tu aprobación."
            prioridad = 2
        else:
            horas = 3.0
            distribucion = [
                {"semana": "Actual", "tema": f"Avance continuo: {unidad_actual}", "horas": 3.0, "prioridad": 3, "enfoque": "Mantenimiento del ritmo de estudio, revisando lecturas anticipadas y repasos cortos."}
            ]
            justificacion = "Tu rendimiento es sólido. Sigue manteniendo este buen ritmo constante para asegurar el éxito en las siguientes evaluaciones."
            prioridad = 3
            
        return SugerenciaEstudioService._crear_o_actualizar_sugerencia(
            db, id_usuario, id_contexto, TipoSugerencia.POR_RIESGO, f"Plan de Acción Académico ({unidad_actual})", horas, distribucion, justificacion, prioridad
        )

    @staticmethod
    def _crear_o_actualizar_sugerencia(db: Session, id_usuario: int, id_contexto: int, tipo: TipoSugerencia, tema: str, horas: float, distribucion: dict, justificacion: str, prioridad: int):
        contexto = db.query(ContextoCursoUsuario).filter(ContextoCursoUsuario.id_contexto == id_contexto).first()
        
        sugerencia = SugerenciaEstudio(
            id_usuario=id_usuario,
            id_contexto=id_contexto,
            id_silabo=contexto.id_silabo_asignado if contexto else None,
            tipo_sugerencia=tipo,
            tema_o_evidencia=tema,
            horas_sugeridas=horas,
            distribucion_sugerida=distribucion,
            justificacion=justificacion,
            prioridad=prioridad,
            estado=EstadoSugerencia.PENDIENTE
        )
        db.add(sugerencia)
        db.commit()
        db.refresh(sugerencia)
        return sugerencia

    @staticmethod
    def formatear_respuesta(sugerencia: SugerenciaEstudio) -> str:
        prioridad_texto = {1: "Alta", 2: "Media", 3: "Baja"}.get(sugerencia.prioridad, "Media")
        
        dist = sugerencia.distribucion_sugerida or {}
        
        if isinstance(dist, list):
            desglose = ""
            for item in dist:
                pri = {1: "Alta", 2: "Media", 3: "Baja"}.get(item.get("prioridad", 2), "Media")
                desglose += f"- **Semana {item.get('semana', '?')}: {item.get('tema', 'Tema')}** - {item.get('horas', 0)} horas (Prioridad: {pri})\n  *Enfoque:* {item.get('enfoque', '')}\n"
                
            return f"""**Plan de Estudios Estratégico: {sugerencia.tema_o_evidencia}**
**Tiempo Total:** {sugerencia.horas_sugeridas} horas

### Desglose por Semanas
{desglose}
**Recomendación:** {sugerencia.justificacion}"""

        dist_texto = []
        if isinstance(dist, dict):
            if dist.get("profunda"): dist_texto.append(f"{dist['profunda']}h profunda")
            if dist.get("practica"): dist_texto.append(f"{dist['practica']}h práctica")
            if dist.get("revision"): dist_texto.append(f"{dist['revision']}h revisión")
        
        dist_str = " + ".join(dist_texto) if dist_texto else f"{sugerencia.horas_sugeridas}h en total"
        
        return f"""**Sugerencia de tiempo para {sugerencia.tema_o_evidencia}**

**Horas sugeridas:** {sugerencia.horas_sugeridas} horas
**Distribución:** {dist_str}

**Justificación:** {sugerencia.justificacion}
**Prioridad:** {prioridad_texto}"""

    @staticmethod
    def responder_consulta_tiempo(db: Session, id_usuario: int, id_contexto: int, pregunta: str) -> str:
        contexto = db.query(ContextoCursoUsuario).filter(ContextoCursoUsuario.id_contexto == id_contexto).first()
        if not contexto or not contexto.silabo_asignado:
            return "Lo siento, no tengo acceso al sílabo para darte sugerencias precisas."
            
        silabo = contexto.silabo_asignado
        reglas = silabo.reglas_json or {}
        
        chunks_text = ""
        if silabo:
            chunks = db.query(SilaboChunk).filter(
                SilaboChunk.id_silabo == silabo.id_silabo,
                SilaboChunk.tipo_seccion == TipoSeccionChunk.CONTENIDOS
            ).order_by(SilaboChunk.orden).all()
            if chunks:
                chunks_text = "Contenidos del curso:\n" + "\n".join([f"{c.titulo or 'Semana'}: {c.contenido}" for c in chunks])
        
        from app.services.ai_parser import _init_gemini
        import app.services.ai_parser as ai_p
        
        _init_gemini()
        
        if ai_p.GEMINI_DISPONIBLE and ai_p.MODEL:
            import google.generativeai as genai
            
            prompt = f"""Eres Sylia, experta académica.
Consulta del alumno: "{pregunta}"
Curso: {contexto.curso.nombre_curso}.
Reglas: {json.dumps(reglas)}
{chunks_text}

Instrucciones (Optimiza tokens):
- El sistema de calificación es de 0 a 20 (escala vigesimal). La nota máxima es 20 y la nota mínima aprobatoria es 14. Ten esto presente al hablar de requerimientos de notas o promedios.
- Calcula inteligentemente horas por semana basado en la complejidad del contenido.
- Usa muy pocos emojis.
- Responde estrictamente un JSON con:
  "texto_conversacional": Mensaje que INCLUYA EXACTAMENTE este formato Markdown:
    "**Plan de Estudios Estratégico: [Unidad/Tema]**
    **Tiempo Total:** [X] horas
    
    ### Desglose por Semanas
    - **Semana X: [Tema]** - [H] horas (Prioridad: Alta/Media/Baja)
      *Enfoque:* [Breve descripción, ej: Práctica intensiva en ejercicios]
    
    **Recomendación:** [Consejo]"
  "horas": float total.
  "tema": str (ej: "Unidad 1").
  "prioridad": int (1=Alta, 2=Media, 3=Baja).
  "distribucion_semanas": Lista [{{"semana": "X", "tema": "str", "horas": float, "prioridad": int, "enfoque": "str"}}].
  "justificacion": str breve.
"""
            
            try:
                response = ai_p.MODEL.generate_content(
                    prompt,
                    generation_config=genai.GenerationConfig(
                        response_mime_type="application/json",
                        temperature=0.7
                    )
                )
                
                text_resp = response.text.strip()
                if text_resp.startswith("```json"):
                    text_resp = text_resp[7:]
                elif text_resp.startswith("```"):
                    text_resp = text_resp[3:]
                if text_resp.endswith("```"):
                    text_resp = text_resp[:-3]
                    
                res_json = json.loads(text_resp.strip())
                
                dist_sugerida = res_json.get("distribucion_semanas", [])
                if not dist_sugerida and "distribucion" in res_json:
                     dist_sugerida = res_json.get("distribucion")
                
                # Guardar en base de datos la sugerencia detectada
                sugerencia = SugerenciaEstudioService._crear_o_actualizar_sugerencia(
                    db, id_usuario, id_contexto, TipoSugerencia.POR_PESO, 
                    res_json.get("tema", "Estudio General"),
                    float(res_json.get("horas", 2.0)),
                    dist_sugerida,
                    res_json.get("justificacion", "Basado en tu consulta"),
                    int(res_json.get("prioridad", 2))
                )
                
                return res_json.get("texto_conversacional", "Aquí tienes tu sugerencia de estudio.")
                
            except Exception as e:
                print(f"Error generando sugerencia con IA: {e}")
                # Fallback
                return SugerenciaEstudioService._fallback_sugerencia(db, id_usuario, id_contexto, pregunta)
        else:
            return SugerenciaEstudioService._fallback_sugerencia(db, id_usuario, id_contexto, pregunta)
            
    @staticmethod
    def _fallback_sugerencia(db: Session, id_usuario: int, id_contexto: int, pregunta: str) -> str:
        sugerencia = SugerenciaEstudioService.generar_sugerencia_por_riesgo(db, id_usuario, id_contexto)
        if sugerencia:
            return SugerenciaEstudioService.formatear_respuesta(sugerencia)
        return "No tengo suficiente información de tus notas o del sílabo para darte una sugerencia ahora mismo."

    @staticmethod
    def serializar_sugerencia(sugerencia: SugerenciaEstudio) -> dict:
        if not sugerencia:
            return None
        return {
            "id_sugerencia": sugerencia.id_sugerencia,
            "id_contexto": sugerencia.id_contexto,
            "tipo_sugerencia": sugerencia.tipo_sugerencia.value if hasattr(sugerencia.tipo_sugerencia, "value") else sugerencia.tipo_sugerencia,
            "tema_o_evidencia": sugerencia.tema_o_evidencia,
            "horas_sugeridas": sugerencia.horas_sugeridas,
            "distribucion_sugerida": sugerencia.distribucion_sugerida,
            "justificacion": sugerencia.justificacion,
            "prioridad": sugerencia.prioridad,
            "estado": sugerencia.estado.value if hasattr(sugerencia.estado, "value") else sugerencia.estado,
            "fecha_generacion": sugerencia.fecha_generacion.isoformat() if sugerencia.fecha_generacion else None
        }
