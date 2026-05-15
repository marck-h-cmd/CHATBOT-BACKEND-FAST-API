"""
Servicio de parsing de sílabos usando Gemini API
Una sola llamada para extraer toda la estructura del sílabo
Optimizado para minimizar consumo de tokens
"""

import json
import re
from typing import Dict, Optional, List

from app.config import Config

# Configurar Gemini en modo lazy (no falla el arranque del servidor si no está disponible)
GEMINI_DISPONIBLE: bool = False
MODEL = None
_GEMINI_INIT_ATTEMPTED: bool = False


def _unique_model_names(names: List[Optional[str]]) -> List[str]:
    unique: List[str] = []
    for name in names:
        if not name:
            continue
        if name not in unique:
            unique.append(name)
    return unique


def _init_gemini() -> None:
    global GEMINI_DISPONIBLE, MODEL, _GEMINI_INIT_ATTEMPTED

    if _GEMINI_INIT_ATTEMPTED:
        return
    _GEMINI_INIT_ATTEMPTED = True

    if not Config.USE_GEMINI:
        return
    if not Config.GEMINI_API_KEY:
        return

    try:
        import google.generativeai as genai  # type: ignore
    except Exception:
        return

    try:
        genai.configure(api_key=Config.GEMINI_API_KEY)

        modelos_a_probar = _unique_model_names(
            [
                Config.GEMINI_MODEL,
                "gemini-flash-lite-latest",
                "gemini-2.5-flash",
                "gemini-2.5-pro",
                "gemini-2.0-flash",
                "gemini-2.0-pro",
                "gemini-1.5-flash",
                "gemini-1.5-pro",
                "gemini-1.5-flash-latest",
                "gemini-1.5-pro-latest",
            ]
        )

        for modelo in modelos_a_probar:
            try:
                MODEL = genai.GenerativeModel(modelo)
                GEMINI_DISPONIBLE = True
                print(f"✅ Gemini API configurada (modelo: {modelo})")
                return
            except Exception:
                continue
    except Exception:
        GEMINI_DISPONIBLE = False
        MODEL = None


class GeminiParserService:
    """
    Servicio de parsing con UNA SOLA llamada a Gemini
    Extrae toda la estructura del sílabo en un solo prompt
    """
    
    # Prompt único y optimizado
    PROMPT_UNICO = """
    Analiza este sílabo universitario y extrae SOLO la información solicitada.
    Responde EXCLUSIVAMENTE con un objeto JSON válido, sin texto adicional.
    
    JSON requerido:
    {
        "codigo_curso": "código numérico",
        "nombre_curso": "nombre completo",
        "ciclo": "ej: VII",
        "periodo": "ej: 2026-I",
        "docente": "nombre del coordinador",
        "email_docente": "email institucional",
        "nota_aprobatoria": 14,
        "evidencias": {
            "SIGLA_EXACTA_1": {"nombre": "nombre completo de la evidencia", "peso": 1},
            "SIGLA_EXACTA_2": {"nombre": "nombre completo de la evidencia", "peso": 2}
        },
        "unidades": [
            {"id": "U1", "nombre": "nombre", "semanas": "rango", "competencias": []}
        ],
        "formulas": {
            "PU1": "fórmula",
            "PU2": "fórmula",
            "PU3": "fórmula",
            "PP": "fórmula"
        },
        "tutoria": {
            "dia": "día",
            "horario": "horario",
            "email": "email",
            "canales": ["canal1", "canal2"]
        },
        "reglas": {
            "asistencia_minima": 70,
            "redondeo": "regla",
            "inhabilitacion_umbral": 30
        }
    }
    
    Si falta info, usa valores por defecto. Extrae hasta 3 unidades.
    
    --- INICIO DEL SÍLABO ---
    """
    
    @classmethod
    def extraer_estructura_completa(cls, texto: str, curso_esperado: str = "", periodo_esperado: str = "") -> Dict:
        """
        Extrae toda la estructura del sílabo en UNA SOLA llamada a Gemini
        Incluye cálculo de puntaje de confianza
        """
        _init_gemini()
        if not GEMINI_DISPONIBLE or not MODEL:
            resultado = cls._extraer_fallback(texto)
        else:
            try:
                # Limitar texto para optimizar tokens (primeros 25000 caracteres)
                texto_limitado = texto[:20000] if len(texto) > 20000 else texto
                
                # Una sola llamada con Structured JSON Output
                import google.generativeai as genai
                prompt = cls.PROMPT_UNICO + "\n\n" + texto_limitado
                response = MODEL.generate_content(
                    prompt,
                    generation_config=genai.GenerationConfig(
                        response_mime_type="application/json",
                        temperature=0.1
                    )
                )
                
                # Obtener texto garantizado como JSON
                respuesta_texto = response.text
                if not respuesta_texto or not respuesta_texto.strip():
                    raise ValueError("Respuesta JSON vacía")
                
                resultado = json.loads(respuesta_texto)
                resultado = cls._validar_estructura(resultado)
                
            except Exception as e:
                print(f"⚠️ Error en Gemini, usando fallback: {e}")
                resultado = cls._extraer_fallback(texto)

        # Calcular puntaje de confianza (Lógica de negocio)
        puntaje, coincidencias = cls.calcular_puntaje_confianza(
            resultado, texto, curso_esperado, periodo_esperado
        )
        
        resultado["puntaje_confianza"] = puntaje
        resultado["coincidencias"] = coincidencias
        return resultado

    @classmethod
    def calcular_puntaje_confianza(cls, data: Dict, texto_completo: str, curso_ref: str, periodo_ref: str) -> tuple:
        """
        Calcula score 0-100 basado en reglas ITIL 4
        """
        score = 0
        coincidencias = {
            "curso": False,
            "codigo": False,
            "periodo": "DESCONOCIDO",
            "estructura": False,
            "legibilidad": True
        }

        # 1. Coincidencia de nombre de curso (25 pts)
        nombre_extraido = data.get("nombre_curso", "").upper()
        if curso_ref and curso_ref.upper() in nombre_extraido:
            score += 25
            coincidencias["curso"] = True
        elif curso_ref and any(word in nombre_extraido for word in curso_ref.upper().split() if len(word) > 3):
            score += 15
            coincidencias["curso"] = True

        # 2. Coincidencia de código (20 pts)
        codigo_extraido = data.get("codigo_curso", "")
        if codigo_extraido and len(codigo_extraido) > 2:
            score += 20
            coincidencias["codigo"] = True

        # 3. Coincidencia de periodo (20 pts)
        periodo_extraido = data.get("periodo", "")
        if periodo_ref and periodo_ref in periodo_extraido:
            score += 20
            coincidencias["periodo"] = "ACTUAL"
        elif periodo_extraido:
            coincidencias["periodo"] = "NO_COINCIDE"

        # 4. Estructura mínima - Evaluación (25 pts)
        formulas = data.get("formulas", {})
        if formulas.get("PU1") and formulas.get("PP"):
            score += 25
            coincidencias["estructura"] = True

        # 5. Legibilidad / Extracción (10 pts)
        if len(texto_completo) > 500:
            score += 10
            
        return min(score, 100), coincidencias
    
    @classmethod
    def _extraer_fallback(cls, texto: str) -> Dict:
        """Fallback rápido cuando Gemini no está disponible"""
        from app.services.ai_parser_fallback import FallbackParser
        return FallbackParser.extraer(texto)
    
    @classmethod
    def _validar_estructura(cls, resultado: Dict) -> Dict:
        """Valida y completa la estructura extraída"""
        
        defaults = {
            "codigo_curso": "0000",
            "nombre_curso": "Curso sin nombre",
            "ciclo": "No especificado",
            "periodo": "No especificado",
            "docente": "No especificado",
            "email_docente": "",
            "nota_aprobatoria": 14,
            "evidencias": {},
            "unidades": [],
            "formulas": {},
            "tutoria": {
                "dia": "Jueves",
                "horario": "12:00 - 13:00",
                "email": "",
                "canales": ["Email", "WhatsApp"]
            },
            "reglas": {
                "asistencia_minima": 70,
                "redondeo": "Medio punto (0.5) favorece al estudiante",
                "inhabilitacion_umbral": 30
            }
        }
        
        # Completar campos faltantes
        for key, default_value in defaults.items():
            if key not in resultado or not resultado.get(key):
                resultado[key] = default_value
        
        # Asegurar que tenga al menos 3 unidades
        if len(resultado.get("unidades", [])) < 3:
            unidades_existentes = {u.get("id", "") for u in resultado.get("unidades", [])}
            for i in range(1, 4):
                unidad_id = f"U{i}"
                if unidad_id not in unidades_existentes:
                    resultado["unidades"].append({
                        "id": unidad_id,
                        "nombre": f"Unidad {i}",
                        "semanas": cls._get_semanas_default(i),
                        "competencias": []
                    })
        return resultado
    
    @classmethod
    def _get_semanas_default(cls, unidad_num: int) -> str:
        rangos = {1: "Semana 1-6", 2: "Semana 7-11", 3: "Semana 12-16"}
        return rangos.get(unidad_num, f"Semana {(unidad_num-1)*5+1}-{unidad_num*5}")


# Instancia global
gemini_parser = GeminiParserService()
