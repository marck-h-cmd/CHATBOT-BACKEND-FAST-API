from sqlalchemy.orm import Session
from typing import Dict, List
import time
from app.core.intent_classifier import IntentClassifier
from app.services.rag_retriever import RAGRetriever
from app.services.rule_engine import RuleEngine
from app.services.itil_desk import ITILServiceDesk
from app.config import Config

class ChatHandler:
    
    @staticmethod
    def procesar_consulta(
        db: Session,
        id_usuario: str,
        id_silabo: int,
        pregunta: str
    ) -> Dict:
        start_time = time.time()
        
        # 1. Clasificar intención
        intent, params = IntentClassifier.clasificar(pregunta)
        
        # 2. Recuperar fragmentos relevantes del sílabo (RAG)
        fragmentos = RAGRetriever.recuperar_fragmentos(
            db, id_silabo, pregunta, top_k=5
        )
        
        # 3. Generar respuesta según intención
        respuesta = ""
        reglas_aplicadas = {}
        escalar = False
        
        if intent == "calcular_promedio":
            unidad = params.get("unidad", "PU1")
            # Intentar extraer notas del contexto
            resultado = ChatHandler._manejar_calculo(pregunta, params)
            respuesta = resultado["respuesta"]
            reglas_aplicadas = resultado.get("reglas", {})
            
        elif intent == "consultar_peso":
            evidencia = params.get("evidencia", "PFD")
            unidad = params.get("unidad", "U1")
            peso = RuleEngine.obtener_peso_evidencia(unidad, evidencia)
            if peso:
                respuesta = f"En el sílabo, la evidencia **{evidencia}** tiene peso **{peso}** en la unidad {unidad}. Esto significa que en la fórmula se multiplica por {peso}."
                reglas_aplicadas = {"peso": peso, "unidad": unidad, "evidencia": evidencia}
            else:
                respuesta = f"No encontré el peso de {evidencia} en {unidad}. Revisa el sílabo completo en la sección de evaluación."
                escalar = True
                
        elif intent == "simular_notas":
            notas = params.get("notas", {})
            unidad = params.get("unidad", "U1")
            resultado = ChatHandler._manejar_simulacion(notas, unidad)
            respuesta = resultado["respuesta"]
            reglas_aplicadas = resultado.get("reglas", {})
            
        elif intent == "evaluar_riesgo":
            # Intentar recuperar notas de sesiones anteriores
            notas_previas = ChatHandler._recuperar_notas_sesion(db, id_usuario, id_silabo)
            riesgo = RuleEngine.evaluar_riesgo(
                notas_previas.get("PU1"),
                notas_previas.get("PU2"),
                notas_previas.get("PU3")
            )
            
            respuesta = f"""
## ⚠️ Evaluación de Riesgo Académico

**Nivel:** {riesgo['color']} {riesgo['nivel']}
**Situación:** {riesgo['mensaje']}

**Recomendación:** {riesgo['recomendacion']}

---
### 📚 Apoyo disponible
- **Tutoría académica:** {Config.TUTORIA_DIA} {Config.TUTORIA_HORARIO}
- **Email docente:** {Config.TUTORIA_EMAIL}
- **Canales:** {', '.join(Config.TUTORIA_CANALES)}
            """
            reglas_aplicadas = riesgo
            
            # Registrar incidente si el riesgo es alto
            if riesgo["nivel"] in ["ALTO", "MUY ALTO"]:
                ITILServiceDesk.registrar_incidente(
                    db, id_usuario, id_silabo,
                    severidad=riesgo["nivel"],
                    promedio_actual=RuleEngine.calcular_promedio_final(
                        notas_previas.get("PU1", 0),
                        notas_previas.get("PU2", 0),
                        notas_previas.get("PU3", 0)
                    ) if all(v is not None for v in [notas_previas.get("PU1"), notas_previas.get("PU2")]) else 0,
                    nota_necesaria=0,
                    recomendacion=riesgo["recomendacion"]
                )
                
        elif intent == "consultar_tutoria":
            respuesta = f"""
## 📞 Servicio de Tutoría y Consejería Académica

El sílabo establece los siguientes canales de atención:

| Recurso | Información |
|---------|--------------|
| **Día** | {Config.TUTORIA_DIA} |
| **Horario** | {Config.TUTORIA_HORARIO} |
| **Email** | {Config.TUTORIA_EMAIL} |
| **Canales** | {', '.join(Config.TUTORIA_CANALES)} |

**¿Cuándo contactar?**
- Promedios por debajo de 14
- Dudas sobre evaluación
- Riesgo de desaprobación
- Problemas con el sílabo

*Este servicio está registrado como parte del Service Desk ITIL del chatbot.*
            """
            
        elif intent == "consultar_normas":
            respuesta = """
## 📋 Normas de Evaluación (según sílabo)

| Norma | Descripción |
|-------|-------------|
| **Nota aprobatoria** | 14 (mínimo) |
| **Redondeo** | Medio punto (0.5) a favor del estudiante |
| **Asistencia** | 70% mínimo (inhabilitación por 30% de incumplimiento) |
| **Nota 00** | Por no presentarse a exposición, examen o entrega |
| **Aplazados** | Semana 17 (evaluación de conocimientos) |

*Estas reglas están configuradas en el motor determinista del chatbot.*
            """
            
        elif intent == "saludar":
            respuesta = """
¡Hola! Soy tu asistente académico basado en ITIL 4 🤖

Puedo ayudarte con:
- 📊 **Fórmulas**: ¿Cómo se calcula PU1?, ¿qué es PP?
- ⚖️ **Pesos**: ¿Cuánto pesa ELD en unidad 2?
- 📝 **Simulación**: Si tengo PFD 12, TAD 10, ELD 8
- ⚠️ **Riesgo**: Evaluar si estoy en riesgo de desaprobación
- 📞 **Tutoría**: Horarios y canales de atención

¿En qué puedo ayudarte hoy?
            """
            
        else:
            # Respuesta usando RAG + fragmentos recuperados
            if fragmentos:
                # Construir respuesta con los fragmentos recuperados
                contexto = "\n\n".join([f"[{f['tipo']}] {f['texto'][:300]}" for f in fragmentos[:3]])
                respuesta = f"""
Basado en tu sílabo, esto es lo que encontré:

{contexto}

---
💡 **Sugerencia:** Para consultas específicas sobre fórmulas, intenta:
- "¿cómo se calcula PU1?"
- "¿cuánto pesa TAD en unidad 3?"
- "simular PFD=12, TAD=14, ELD=16 en U2"
                """
            else:
                respuesta = """
No encontré información específica en tu sílabo para esa consulta.

**Opciones:**
1. Verifica que el sílabo se haya subido correctamente
2. Prueba preguntar de otra forma
3. Consulta directamente al docente: {Config.TUTORIA_EMAIL}

Si el problema persiste, se registrará como incidente de servicio para mejorar el sistema.
                """
                escalar = True
        
        tiempo_ms = int((time.time() - start_time) * 1000)
        
        # Registrar solicitud en ITIL Service Desk
        solicitud = ITILServiceDesk.registrar_solicitud(
            db=db,
            id_usuario=id_usuario,
            id_silabo=id_silabo,
            tipo=intent,
            pregunta=pregunta,
            respuesta=respuesta,
            fragmentos_usados=fragmentos[:3],
            reglas_aplicadas=reglas_aplicadas,
            tiempo_ms=tiempo_ms,
            escalar=escalar
        )
        
        return {
            "respuesta": respuesta,
            "intent": intent,
            "fragmentos_usados": len(fragmentos),
            "tiempo_ms": tiempo_ms,
            "escalado": escalar,
            "id_solicitud": solicitud.id
        }
    
    @staticmethod
    def _manejar_calculo(pregunta: str, params: Dict) -> Dict:
        unidad = params.get("unidad", "PU1")
        notas = params.get("notas", {})
        
        if "PU1" in pregunta.upper() or unidad == "PU1":
            # Sugerir ingresar notas
            return {
                "respuesta": f"""
Para calcular **{unidad}** necesitas ingresar tus notas.

**Fórmula:** {RuleEngine.obtener_formula(unidad)}

Ejemplo: _"Simular en {unidad} PFD=12, TAD=14, ELD=16"_

La fórmula del sílabo es: (PFD × peso + TAD × peso + ELD × peso) / suma_pesos
                """,
                "reglas": {"unidad": unidad, "formula": RuleEngine.obtener_formula(unidad)}
            }
        else:
            return {
                "respuesta": f"Para cálculos específicos, usa el comando de simulación. Ejemplo: 'simular en {unidad} PFD=12, TAD=14, ELD=16'",
                "reglas": {}
            }
    
    @staticmethod
    def _manejar_simulacion(notas: Dict, unidad: str) -> Dict:
        if all(k in notas for k in ["PFD", "TAD", "ELD"]):
            promedio = RuleEngine.calcular_promedio_unidad(
                unidad, notas["PFD"], notas["TAD"], notas["ELD"]
            )
            aprueba_unidad = promedio >= Config.NOTA_APROBACION
            
            return {
                "respuesta": f"""
## 📊 Simulación de {unidad}

| Evidencia | Nota | Peso |
|-----------|------|------|
| PFD | {notas['PFD']} | {RuleEngine.obtener_peso_evidencia(unidad, 'PFD')} |
| TAD | {notas['TAD']} | {RuleEngine.obtener_peso_evidencia(unidad, 'TAD')} |
| ELD | {notas['ELD']} | {RuleEngine.obtener_peso_evidencia(unidad, 'ELD')} |

**Promedio calculado:** {promedio}

**Estado:** {'✅ Aprobado' if aprueba_unidad else '⚠️ Necesitas mejorar'}

{'Para aprobar, enfócate en las evidencias de mayor peso.' if not aprueba_unidad else ''}
                """,
                "reglas": {
                    "unidad": unidad,
                    "notas": notas,
                    "promedio": promedio,
                    "aprueba": aprueba_unidad
                }
            }
        else:
            return {
                "respuesta": f"Para simular necesitas las 3 notas: PFD, TAD y ELD. Ejemplo: 'simular en {unidad} PFD=12, TAD=14, ELD=16'",
                "reglas": {}
            }
    
    @staticmethod
    def _recuperar_notas_sesion(db: Session, id_usuario: str, id_silabo: int) -> Dict:
        """Recupera las últimas notas del usuario en este silabo"""
        # Buscar en solicitudes anteriores con simulación
        from app.database.models import SolicitudServicio
        solicitudes = db.query(SolicitudServicio).filter(
            SolicitudServicio.id_usuario == id_usuario,
            SolicitudServicio.id_silabo == id_silabo,
            SolicitudServicio.tipo == "simular_notas"
        ).order_by(SolicitudServicio.fecha.desc()).limit(3).all()
        
        notas = {"PU1": None, "PU2": None, "PU3": None}
        for s in solicitudes:
            reglas = s.reglas_aplicadas or {}
            if reglas.get("unidad") == "U1":
                notas["PU1"] = reglas.get("promedio")
            elif reglas.get("unidad") == "U2":
                notas["PU2"] = reglas.get("promedio")
            elif reglas.get("unidad") == "U3":
                notas["PU3"] = reglas.get("promedio")
        
        return notas