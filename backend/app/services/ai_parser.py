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
            "PFD": {"nombre": "nombre de la evidencia", "peso": 1},
            "TAD": {"nombre": "nombre de la evidencia", "peso": 1},
            "ELD": {"nombre": "nombre de la evidencia", "peso": 2}
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
    def extraer_estructura_completa(cls, texto: str) -> Dict:
        """
        Extrae toda la estructura del sílabo en UNA SOLA llamada a Gemini
        """
        _init_gemini()
        if not GEMINI_DISPONIBLE or not MODEL:
            return cls._extraer_fallback(texto)
        
        try:
            # Limitar texto para optimizar tokens (primeros 25000 caracteres)
            texto_limitado = texto[:20000] if len(texto) > 20000 else texto
            
            # Una sola llamada
            prompt = cls.PROMPT_UNICO + "\n\n" + texto_limitado
            response = MODEL.generate_content(prompt)
            
            # Limpiar respuesta
            respuesta_texto = getattr(response, "text", None)
            if not isinstance(respuesta_texto, str) or not respuesta_texto.strip():
                try:
                    respuesta_texto = response.candidates[0].content.parts[0].text  # type: ignore[attr-defined]
                except Exception as e:
                    raise ValueError("Respuesta de Gemini sin texto utilizable") from e
            respuesta_texto = respuesta_texto.strip()
            # Eliminar marcadores de código
            respuesta_texto = re.sub(r'^```json\s*', '', respuesta_texto)
            respuesta_texto = re.sub(r'^```\s*', '', respuesta_texto)
            respuesta_texto = re.sub(r'\s*```$', '', respuesta_texto)
            
            # Parsear JSON
            resultado = json.loads(respuesta_texto)
            
            # Validar y completar estructura
            resultado = cls._validar_estructura(resultado)
            return resultado
            
        except json.JSONDecodeError as e:
            print(f"⚠️ Error parseando JSON de Gemini: {e}")
            return cls._extraer_fallback(texto)
        except Exception as e:
            print(f"⚠️ Error en llamada a Gemini: {e}")
            return cls._extraer_fallback(texto)
    
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
            "evidencias": {
                "PFD": {"nombre": "Examen de unidad", "peso": 1},
                "TAD": {"nombre": "Trabajo aplicativo", "peso": 1},
                "ELD": {"nombre": "Examen de laboratorio", "peso": 2}
            },
            "unidades": [],
            "formulas": {
                "PU1": "PU1 = (PFD + TAD + ELD×2) / 4",
                "PU2": "PU2 = (PFD + TAD×2 + ELD) / 4",
                "PU3": "PU3 = (PFD + TAD×2 + ELD) / 4",
                "PP": "PP = (PU1 + PU2 + PU3) / 3"
            },
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
        
        # Asegurar que tenga las 3 evidencias principales
        for ev in ["PFD", "TAD", "ELD"]:
            if ev not in resultado.get("evidencias", {}):
                resultado["evidencias"][ev] = defaults["evidencias"][ev]
        
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
                        "competencias": [],
                        "evidencias": [
                            {"tipo": "PFD", "peso": 1},
                            {"tipo": "TAD", "peso": 1 if i == 1 else 2},
                            {"tipo": "ELD", "peso": 2 if i != 2 else 1}
                        ]
                    })
        return resultado
    
    @classmethod
    def _get_semanas_default(cls, unidad_num: int) -> str:
        rangos = {1: "Semana 1-6", 2: "Semana 7-11", 3: "Semana 12-16"}
        return rangos.get(unidad_num, f"Semana {(unidad_num-1)*5+1}-{unidad_num*5}")


# Instancia global
gemini_parser = GeminiParserService()
