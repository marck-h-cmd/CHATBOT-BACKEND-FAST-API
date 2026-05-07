import re
from typing import Dict, Tuple

class IntentClassifier:
    
    PATRONES = {
        "calcular_promedio": [
            r"(cómo se calcula|qué promedio saco|cuánto es).*?(pu1|pu2|pu3|pp|unidad\s+[123])",
            r"(calcula|dime).*?(promedio)",
            r"(qué nota necesito|cuánto me falta)"
        ],
        "consultar_peso": [
            r"(cuánto pesa|qué peso tiene|ponderación).*?(pfd|tad|eld|evidencia)",
            r"(cómo influye|qué valor tiene).*?(pfd|tad|eld)"
        ],
        "simular_notas": [
            r"(si tengo|con notas|supongamos que).*?(pfd|tad|eld)",
            r"(simular|calcular).*?(notas|promedio)"
        ],
        "evaluar_riesgo": [
            r"(estoy en riesgo|voy a aprobar|apruebo|desapruebo|riesgo académico)",
            r"(puedo pasar|qué probabilidad tengo)"
        ],
        "consultar_tutoria": [
            r"(tutoría|consejería|docente|ayuda|consultar con)",
            r"(dónde puedo|horario.*?tutor)"
        ],
        "consultar_normas": [
            r"(asistencia|inasistencia|inhabilitación|nota cero)",
            r"(aplazados|recuperación|qué pasa si)"
        ],
        "consultar_fechas": [
            r"(fecha|cuándo|semana|plazo|entrega)"
        ],
        "saludar": [
            r"(hola|buenos días|buenas tardes|hey|saludos)"
        ]
    }
    
    @classmethod
    def clasificar(cls, pregunta: str) -> Tuple[str, Dict]:
        """Clasifica la intención de la pregunta"""
        pregunta_lower = pregunta.lower()
        
        for intent, patrones in cls.PATRONES.items():
            for patron in patrones:
                if re.search(patron, pregunta_lower, re.IGNORECASE):
                    return cls._extraer_params(intent, pregunta_lower)
        
        return "informacion_general", {}
    
    @classmethod
    def _extraer_params(cls, intent: str, pregunta: str) -> Tuple[str, Dict]:
        params = {}
        
        # Extraer unidad
        unidad_match = re.search(r"(pu1|pu2|pu3|unidad\s*[123])", pregunta, re.IGNORECASE)
        if unidad_match:
            unidad = unidad_match.group(1).upper()
            if "UNIDAD" in unidad:
                num = re.search(r"\d", unidad)
                if num:
                    params["unidad"] = f"U{num.group()}"
            else:
                params["unidad"] = unidad.upper()
        
        # Extraer evidencia
        evidencia_match = re.search(r"(PFD|TAD|ELD)", pregunta, re.IGNORECASE)
        if evidencia_match:
            params["evidencia"] = evidencia_match.group(1).upper()
        
        # Extraer notas (para simulación)
        notas = {}
        pfd_match = re.search(r"PFD\s*[:=]?\s*(\d+(?:\.\d+)?)", pregunta, re.IGNORECASE)
        tad_match = re.search(r"TAD\s*[:=]?\s*(\d+(?:\.\d+)?)", pregunta, re.IGNORECASE)
        eld_match = re.search(r"ELD\s*[:=]?\s*(\d+(?:\.\d+)?)", pregunta, re.IGNORECASE)
        
        if pfd_match:
            notas["PFD"] = float(pfd_match.group(1))
        if tad_match:
            notas["TAD"] = float(tad_match.group(1))
        if eld_match:
            notas["ELD"] = float(eld_match.group(1))
        
        if notas:
            params["notas"] = notas
        
        return intent, params