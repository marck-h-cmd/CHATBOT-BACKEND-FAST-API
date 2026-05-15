from sqlalchemy.orm import Session
from typing import Dict, List, Optional
import time
from app.core.intent_classifier import IntentClassifier
from app.services.rag_retriever import RAGRetriever
from app.services.rule_engine import RuleEngine
from app.services.itil_desk import ITILServiceDesk
from app.database.models import ContextoCursoUsuario, Silabo, EstadoVerificacion, AmbitoUso
from app.config import Config

class ChatHandler:
    
    @staticmethod
    def procesar_consulta(
        db: Session,
        id_usuario: int,
        id_contexto: int,
        pregunta: str,
        historial: List[Dict] = None
    ) -> Dict:
        start_time = time.time()
        
        # 0. Cargar contexto y sílabo
        contexto = db.query(ContextoCursoUsuario).filter(ContextoCursoUsuario.id_contexto == id_contexto).first()
        if not contexto:
            raise ValueError("Contexto no encontrado")
            
        silabo = contexto.silabo_asignado
        if not silabo:
            # Fallback: buscar cualquier sílabo del curso si no hay uno asignado
            silabo = db.query(Silabo).filter(Silabo.id_curso == contexto.id_curso).first()

        # 1. Clasificar intención
        intent, params = IntentClassifier.clasificar(pregunta)
        
        # 2. Recuperar fragmentos relevantes (RAG)
        fragmentos = []
        if silabo:
            fragmentos = RAGRetriever.recuperar_fragmentos(db, silabo.id_silabo, pregunta, top_k=5)
        
        # 3. Generar respuesta según intención
        respuesta = ""
        respuesta = ""
        reglas_aplicadas = {}
        escalar = False
        
        # REGLA: ¿Puede calcular?
        puede_calcular = False
        if silabo:
            puede_calcular = RuleEngine.validar_acceso_calculos(silabo)

        # Si el intent es de cálculo pero no tiene acceso
        if intent in ["calcular_promedio", "simular_notas", "evaluar_riesgo"] and not puede_calcular:
            respuesta = "🔒 **Cálculos Deshabilitados**: El sílabo no ha sido validado oficialmente. Solo puedo responder consultas teóricas generales."
            intent = "consulta_bloqueada"
            
        elif intent == "evaluar_riesgo" and puede_calcular:
            # Caso especial: Evaluación de riesgo usa lógica dura de negocio
            riesgo = RuleEngine.evaluar_riesgo(contexto.pu1, contexto.pu2, contexto.pu3, silabo)
            respuesta = f"Tu riesgo actual es: **{riesgo['nivel']}**.\n{riesgo['recomendacion']}"
            
            if riesgo["nivel"] == "ALTA":
                ITILServiceDesk.registrar_incidente_academico(
                    db, id_usuario, id_contexto, silabo.id_silabo if silabo else None,
                    "ALTA", "Riesgo académico detectado por sistema", 
                    pp_proyectado=0 
                )
                
        elif intent == "saludar":
            respuesta = "¡Hola! Soy Sylia, tu Asistente Académico. Estoy aquí para resolver tus dudas sobre el sílabo, fechas y simular tus promedios. ¿En qué te ayudo hoy?"
            
        else:
            # FLUJO AGENTIC RAG (Preguntas generales y Simulaciones/Cálculos)
            from app.services.ai_parser import _init_gemini
            import app.services.ai_parser as ai_p
            
            _init_gemini()
            
            if ai_p.GEMINI_DISPONIBLE and ai_p.MODEL:
                nombre_curso = contexto.curso.nombre_curso if contexto and contexto.curso else "Desconocido"
                nombre_periodo = contexto.periodo.nombre if contexto and contexto.periodo else "Desconocido"
                
                info_estructurada = ""
                formulas = {}
                evidencias = {}
                nota_min = "14"
                if silabo and silabo.reglas_json:
                    rj = silabo.reglas_json
                    if isinstance(rj, dict):
                        nota_min = rj.get("nota_aprobatoria", "14 (por reglamento)")
                        formulas = rj.get("formulas", rj)
                        evidencias = rj.get("evidencias", {})
                        info_estructurada = f"- Nota Mínima Aprobatoria: {nota_min}\n- Fórmulas Oficiales: {formulas}\n- Diccionario de Siglas (Evidencias): {evidencias}\n- Reglas adicionales: {rj.get('reglas', {})}"
                
                contexto_text = "\n\n".join([f"Fragmento {i+1}: {f['texto']}" for i, f in enumerate(fragmentos)]) if fragmentos else "No se encontraron fragmentos específicos."
                
                # Formatear el historial conversacional
                historial_text = ""
                if historial and isinstance(historial, list):
                    recent_history = historial[-5:]
                    if recent_history:
                        historial_text = "[HISTORIAL DE LA CHARLA RECIENTE]\n"
                        for h in recent_history:
                            role = "Estudiante" if h.get("role") == "user" else "Asistente"
                            historial_text += f"{role}: {h.get('content')}\n"
                        historial_text += "\n"

                # Instrucciones dinámicas según el Intent
                instruccion_extra = ""
                if intent in ["calcular_promedio", "simular_notas"] and puede_calcular:
                    instruccion_extra = f"""
[MODO CÁLCULO ACTIVO]
El estudiante quiere simular o calcular sus notas.
USA OBLIGATORIAMENTE LAS FÓRMULAS OFICIALES PROVISTAS: {formulas}.
1. Realiza el cálculo paso a paso mostrando tu razonamiento matemático.
2. Si el estudiante dice siglas como PFD o TAD, usa el diccionario de siglas provisto.
3. Si te faltan notas para hacer el cálculo, asume escenarios (ej. "Si sacas 14 en el final...") o pregúntale amablemente.
4. Resalta la nota final en negrita. Menciona si aprueba o no sabiendo que la nota mínima es {nota_min}.
"""

                prompt = f"""Eres un asesor académico universitario de alto nivel.
Responde de forma natural, amigable y muy clara, utilizando EXCLUSIVAMENTE la información a continuación.
Si no encuentras la respuesta, dilo honestamente sin inventar.

[INFORMACIÓN GENERAL DEL CURSO]
- Curso: {nombre_curso}
- Periodo: {nombre_periodo}
{info_estructurada}

{instruccion_extra}

[DOCUMENTOS Y REGLAMENTOS (RAG)]
{contexto_text}

{historial_text}
Estudiante: {pregunta}
Asistente: """
                try:
                    import google.generativeai as genai
                    response = ai_p.MODEL.generate_content(
                        prompt,
                        generation_config=genai.GenerationConfig(temperature=0.2)
                    )
                    respuesta = response.text
                except Exception as e:
                    print(f"Error generando respuesta con Gemini: {e}")
                    respuesta = "Lo siento, estoy procesando demasiadas simulaciones en este momento. Por favor, intenta tu pregunta de nuevo en unos segundos."
            else:
                respuesta = "Lo siento, el motor de inteligencia artificial no está configurado."
                
            # Si a pesar de todo no hay fragmentos y no es una simulación, considerar escalar
            if not fragmentos and intent not in ["calcular_promedio", "simular_notas", "saludar", "evaluar_riesgo"]:
                escalar = True
        
        tiempo_ms = int((time.time() - start_time) * 1000)
        
        # 4. Registrar Solicitud de Servicio (ITIL)
        ITILServiceDesk.registrar_solicitud(
            db=db,
            id_usuario=id_usuario,
            id_contexto=id_contexto,
            id_silabo=silabo.id_silabo if silabo else None,
            categoria=intent,
            descripcion=pregunta,
            respuesta=respuesta,
            reglas_aplicadas=reglas_aplicadas,
            tiempo_ms=tiempo_ms,
            escalar=escalar
        )
        
        return {
            "respuesta": respuesta,
            "intent": intent,
            "fragmentos_usados": len(fragmentos),
            "tiempo_ms": tiempo_ms,
            "escalado": escalar
        }