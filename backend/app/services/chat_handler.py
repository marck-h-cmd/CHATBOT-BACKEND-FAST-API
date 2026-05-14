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
        pregunta: str
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
        reglas_aplicadas = {}
        escalar = False
        
        # REGLA: ¿Puede calcular?
        puede_calcular = False
        if silabo:
            puede_calcular = RuleEngine.validar_acceso_calculos(silabo)

        if intent in ["calcular_promedio", "simular_notas", "evaluar_riesgo"]:
            if not puede_calcular:
                respuesta = "🔒 **Cálculos Deshabilitados**: Este sílabo está en revisión o no ha sido validado administrativamente. Solo puedo responder consultas generales sobre el contenido."
                intent = "consulta_bloqueada"
            else:
                if intent == "calcular_promedio":
                    respuesta = "Lógica de cálculo PU/PP según fórmulas del sílabo."
                elif intent == "simular_notas":
                    respuesta = "Lógica de simulación con notas ingresadas."
                elif intent == "evaluar_riesgo":
                    riesgo = RuleEngine.evaluar_riesgo(contexto.pu1, contexto.pu2, contexto.pu3, silabo)
                    respuesta = f"Tu riesgo actual es: {riesgo['nivel']}. {riesgo['recomendacion']}"
                    
                    if riesgo["nivel"] == "ALTA":
                        ITILServiceDesk.registrar_incidente_academico(
                            db, id_usuario, id_contexto, silabo.id_silabo if silabo else None,
                            "ALTA", "Riesgo académico detectado por sistema", 
                            pp_proyectado=0 
                        )
        
        elif intent == "saludar":
            respuesta = "¡Hola! Soy tu asistente de Service Desk Académico. ¿En qué puedo ayudarte?"
        else:
            # Consulta general (RAG)
            if fragmentos:
                respuesta = "Basado en el sílabo: " + fragmentos[0]["texto"][:500]
            else:
                respuesta = "No encontré información específica en el sílabo. He escalado esto como una solicitud de información."
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