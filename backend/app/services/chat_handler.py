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
        historial: List[Dict] = None,
        id_sesion: Optional[int] = None
    ) -> Dict:
        start_time = time.time()
        
        # 0. Cargar contexto y sílabo
        contexto = db.query(ContextoCursoUsuario).filter(ContextoCursoUsuario.id_contexto == id_contexto).first()
        if not contexto:
            raise ValueError("Contexto no encontrado")
            
        silabo = contexto.silabo_asignado
        if not silabo:
            silabo = db.query(Silabo).filter(Silabo.id_curso == contexto.id_curso).first()

        # 0.1 Gestionar Sesión de Chat
        from app.database.models import SesionChat, MensajeChat
        
        if id_sesion:
            sesion = db.query(SesionChat).filter(SesionChat.id_sesion == id_sesion, SesionChat.id_usuario == id_usuario).first()
        else:
            # Buscar última sesión activa para este contexto
            sesion = db.query(SesionChat).filter(
                SesionChat.id_usuario == id_usuario,
                SesionChat.id_contexto == id_contexto
            ).order_by(SesionChat.fecha_inicio.desc()).first()
            
            if not sesion:
                sesion = SesionChat(id_usuario=id_usuario, id_contexto=id_contexto)
                db.add(sesion)
                db.commit()
                db.refresh(sesion)
        
        id_sesion = sesion.id_sesion

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

        # Si el intent es de cálculo pero no tiene acceso
        if intent in ["calcular_promedio", "simular_notas", "evaluar_riesgo"] and not puede_calcular:
            respuesta = "🔒 **Cálculos Deshabilitados**: El sílabo no ha sido validado oficialmente. Solo puedo responder consultas teóricas generales."
            intent = "consulta_bloqueada"
            
        elif intent == "evaluar_riesgo" and puede_calcular:
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
            
        elif intent == "sugerir_tiempo":
            from app.services.sugerencia_estudio_service import SugerenciaEstudioService
            respuesta = SugerenciaEstudioService.responder_consulta_tiempo(db, id_usuario, id_contexto, pregunta)
            
        else:
            # FLUJO AGENTIC RAG
            from app.services.ai_parser import _init_gemini
            import app.services.ai_parser as ai_p
            
            _init_gemini()
            
            if ai_p.GEMINI_DISPONIBLE and ai_p.MODEL:
                nombre_curso = contexto.curso.nombre_curso if contexto and contexto.curso else "Desconocido"
                nombre_periodo = contexto.periodo.nombre if contexto and contexto.periodo else "Desconocido"
                
                info_estructurada = ""
                formulas = {}
                nota_min = "14"
                if silabo and silabo.reglas_json:
                    rj = silabo.reglas_json
                    if isinstance(rj, dict):
                        nota_min = rj.get("nota_aprobatoria", "14 (por reglamento)")
                        formulas = rj.get("formulas", rj)
                        info_estructurada = f"- Nota Mínima Aprobatoria: {nota_min}\n- Fórmulas Oficiales: {formulas}"
                
                contexto_text = "\n\n".join([f"Fragmento {i+1}: {f['texto']}" for i, f in enumerate(fragmentos)]) if fragmentos else "No se encontraron fragmentos específicos."
                
                # Cargar historial desde la DB si no viene en el request (Optimización)
                if not historial:
                    mensajes_previos = db.query(MensajeChat).filter(
                        MensajeChat.id_sesion == id_sesion
                    ).order_by(MensajeChat.fecha_envio.desc()).limit(10).all()
                    
                    historial = []
                    for m in reversed(mensajes_previos):
                        role = "user" if m.remitente == "usuario" else "assistant"
                        historial.append({"role": role, "content": m.contenido})

                # Formatear el historial conversacional
                historial_text = ""
                if historial:
                    recent_history = historial[-6:] # Un poco más de contexto
                    historial_text = "[HISTORIAL DE LA CHARLA RECIENTE]\n"
                    for h in recent_history:
                        role_label = "Estudiante" if h.get("role") == "user" else "Asistente"
                        historial_text += f"{role_label}: {h.get('content')}\n"
                    historial_text += "\n"

                instruccion_extra = ""
                if intent in ["calcular_promedio", "simular_notas"] and puede_calcular:
                    instruccion_extra = f"""
                    [MODO CÁLCULO ACTIVO]
                    USA OBLIGATORIAMENTE LAS FÓRMULAS: {formulas}. Realiza el cálculo paso a paso. Nota mínima: {nota_min}.
                    REGLAS IMPORTANTES DE EXÁMENES DE RECUPERACIÓN:
                    - SUSTITUTORIO: Reemplaza la nota de unidad más baja del estudiante si le favorece.
                    - APLAZADO: Se suma al promedio final de las 3 unidades y se divide entre 2. Es decir, Promedio Aplazado = (Promedio 3 Unidades + Nota Aplazado) / 2.
                    Ten esto muy en cuenta si el estudiante pregunta sobre qué nota necesita en aplazados o sustitutorio.
                    """

                prompt = f"""Eres Sylia, una asistente académica y asesora amigable, empática y natural.
                        Tu objetivo es ayudar al estudiante a entender su curso, planificar su estudio y responder sus dudas, pero hazlo como si fueras un tutor humano de confianza: sé flexible, no repitas siempre las mismas frases, y siéntete libre de dar consejos breves y proactivos cuando lo veas conveniente.
                        Usa la siguiente información como base para tus respuestas, pero puedes adaptarla para que suene más conversacional:

                        [CURSO] {nombre_curso} ({nombre_periodo})
                        {info_estructurada}
                        {instruccion_extra}

                        [RAG]
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
                    print(f"Error Gemini: {e}")
                    respuesta = "Lo siento, tuve un problema al procesar tu consulta. Intenta de nuevo."
                    
            else:
                respuesta = "Motor IA no disponible."
                
            if not fragmentos and intent not in ["calcular_promedio", "simular_notas", "saludar", "evaluar_riesgo"]:
                escalar = True
        
        tiempo_ms = int((time.time() - start_time) * 1000)
        
        # 4. Persistir Mensajes en la Base de Datos
        msg_usuario = MensajeChat(
            id_sesion=id_sesion,
            remitente="usuario",
            contenido=pregunta,
            tipo_consulta=intent
        )
        msg_asistente = MensajeChat(
            id_sesion=id_sesion,
            remitente="asistente",
            contenido=respuesta,
            tipo_consulta=intent,
            tiempo_respuesta_ms=tiempo_ms
        )
        db.add(msg_usuario)
        db.add(msg_asistente)
        db.commit()

        # 5. Registrar Solicitud de Servicio (ITIL)
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
            "id_sesion": id_sesion,
            "fragmentos_usados": len(fragmentos),
            "tiempo_ms": tiempo_ms,
            "escalado": escalar
        }
