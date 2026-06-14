"""
Fallback parser usando regex cuando Gemini no está disponible
Rápido y sin dependencias externas
"""

import re
from typing import Dict, List


class FallbackParser:
    """Parser de respaldo con regex optimizado"""
    
    @classmethod
    def extraer(cls, texto: str) -> Dict:
        """Extrae información usando regex como fallback"""
        
        return {
            "codigo_curso": cls._buscar(texto, r"código[:\s]*(\d{4,10})", "0000"),
            "nombre_curso": cls._buscar(texto, r"SILABO DE (.*?)(?:\n|$)", "Curso sin nombre"),
            "ciclo": cls._buscar(texto, r"Ciclo[:\s]*([IVXLCDM]+|\d+)", "No especificado"),
            "periodo": cls._buscar(texto, r"Semestre académico[:\s]*([\d\-]+)", "No especificado"),
            "docente": cls._buscar(texto, r"Coordinador[:\s]*([A-Za-zÁÉÍÓÚÑáéíóúñ\s]+)", "No especificado"),
            "email_docente": cls._buscar_email(texto),
            "nota_aprobatoria": cls._buscar_numero(texto, r"nota aprobatoria[:\s]*(\d+)", 14),
            "evidencias": cls._extraer_evidencias(texto),
            "unidades": cls._extraer_unidades(texto),
            "formulas": cls._extraer_formulas(texto),
            "tutoria": cls._extraer_tutoria(texto),
            "reglas": cls._extraer_reglas(texto)
        }
    
    @classmethod
    def _buscar(cls, texto: str, patron: str, default: str) -> str:
        """Búsqueda genérica con regex"""
        match = re.search(patron, texto, re.IGNORECASE)
        return match.group(1).strip() if match else default
    
    @classmethod
    def _buscar_numero(cls, texto: str, patron: str, default: int) -> int:
        """Búsqueda de números con regex"""
        match = re.search(patron, texto, re.IGNORECASE)
        return int(match.group(1)) if match else default
    
    @classmethod
    def _buscar_email(cls, texto: str) -> str:
        """Búsqueda de email"""
        patron = r"([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})"
        match = re.search(patron, texto)
        return match.group(1) if match else ""
    
    @classmethod
    def _extraer_evidencias(cls, texto: str) -> Dict:
        """Extrae evidencias PFD, TAD, ELD"""
        evidencias = {}
        patron = r"(PFD|TAD|ELD)\s*\|\s*([^|]+)\|\s*(\d+)"
        matches = re.findall(patron, texto, re.IGNORECASE)
        
        for match in matches:
            evidencias[match[0].upper()] = {
                "nombre": match[1].strip(),
                "peso": int(match[2])
            }
        
        # Valores por defecto
        for ev in ["PFD", "TAD", "ELD"]:
            if ev not in evidencias:
                evidencias[ev] = {"nombre": ev, "peso": 1}
        
        return evidencias
    
    @classmethod
    def _extraer_unidades(cls, texto: str) -> List[Dict]:
        """Extrae unidades temáticas"""
        unidades = []
        patron = r"Unidad\s+([IVX]+|\d+)[:\s]*([^\n]{10,100})"
        matches = re.findall(patron, texto, re.IGNORECASE)
        
        for i, match in enumerate(matches[:3], 1):
            unidades.append({
                "id": f"U{i}",
                "nombre": match[1].strip(),
                "semanas": cls._get_semanas(i),
                "competencias": [],
                "evidencias": [
                    {"tipo": "PFD", "peso": 1},
                    {"tipo": "TAD", "peso": 1 if i == 1 else 2},
                    {"tipo": "ELD", "peso": 2 if i != 2 else 1}
                ]
            })
        
        # Si no se encontraron, crear por defecto
        if not unidades:
            for i in range(1, 4):
                unidades.append({
                    "id": f"U{i}",
                    "nombre": f"Unidad {i}",
                    "semanas": cls._get_semanas(i),
                    "competencias": [],
                    "evidencias": [
                        {"tipo": "PFD", "peso": 1},
                        {"tipo": "TAD", "peso": 1 if i == 1 else 2},
                        {"tipo": "ELD", "peso": 2 if i != 2 else 1}
                    ]
                })
        
        return unidades
    
    @classmethod
    def _get_semanas(cls, i: int) -> str:
        rangos = {1: "Semana 1-5", 2: "Semana 6-10", 3: "Semana 11-16"}
        return rangos.get(i, f"Semana {(i-1)*5+1}-{i*5}")
    
    @classmethod
    def _extraer_formulas(cls, texto: str) -> Dict:
        """Extrae fórmulas de evaluación"""
        formulas = {}
        patron = r"(PU1|PU2|PU3|PP)\s*=\s*([^\n]+)"
        matches = re.findall(patron, texto, re.IGNORECASE)
        
        for match in matches:
            formulas[match[0].upper()] = match[1].strip()
        
        # Valores por defecto
        defaults = {
            "PU1": "PU1 = (PFD + TAD + ELD×2) / 4",
            "PU2": "PU2 = (PFD + TAD×2 + ELD) / 4",
            "PU3": "PU3 = (PFD + TAD×2 + ELD) / 4",
            "PP": "PP = (PU1 + PU2 + PU3) / 3"
        }
        
        for key, default in defaults.items():
            if key not in formulas:
                formulas[key] = default
        
        return formulas
    
    @classmethod
    def _extraer_tutoria(cls, texto: str) -> Dict:
        """Extrae información de tutoría"""
        tutoria = {
            "dia": "Jueves",
            "horario": "12:00 - 13:00",
            "email": "",
            "canales": ["Email", "WhatsApp"]
        }
        
        # Buscar día
        dia_match = re.search(r"Día[:\s]*([A-Za-zéúíóáñ]+)", texto, re.IGNORECASE)
        if dia_match:
            tutoria["dia"] = dia_match.group(1).capitalize()
        
        # Buscar horario
        hora_match = re.search(r"Horario[:\s]*([\d\s:,-]+)", texto, re.IGNORECASE)
        if hora_match:
            tutoria["horario"] = hora_match.group(1).strip()
        
        # Buscar email
        email_match = re.search(r"([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})", texto)
        if email_match:
            tutoria["email"] = email_match.group(1)
        
        return tutoria
    
    @classmethod
    def _extraer_reglas(cls, texto: str) -> Dict:
        """Extrae reglas del sílabo"""
        reglas = {
            "asistencia_minima": 70,
            "redondeo": "Medio punto (0.5) favorece al estudiante",
            "inhabilitacion_umbral": 30
        }
        
        asis_match = re.search(r"asistencia.*?(\d+)%", texto, re.IGNORECASE)
        if asis_match:
            reglas["asistencia_minima"] = int(asis_match.group(1))
        
        return reglas