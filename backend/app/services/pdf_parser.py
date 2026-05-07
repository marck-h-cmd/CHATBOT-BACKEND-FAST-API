import fitz  # PyMuPDF
import re
from typing import Dict, List, Optional

class PDFParserService:
    
    @staticmethod
    def extraer_texto(pdf_bytes: bytes) -> str:
        """Extrae texto completo del PDF"""
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        texto = ""
        for page in doc:
            texto += page.get_text()
        doc.close()
        return texto
    
    @staticmethod
    def extraer_secciones(texto: str) -> Dict:
        """Extrae secciones clave del sílabo"""
        secciones = {
            "competencias": "",
            "contenidos": "",
            "evaluacion": "",
            "evidencias": {},
            "unidades": [],
            "tutoria": "",
            "fechas": ""
        }
        
        # Buscar tabla de evaluación (PFD, TAD, ELD)
        # Formato típico: PFD | Examen de unidad | 1
        patron_evidencia = r"(PFD|TAD|ELD)\s*\|\s*([^|]+)\|\s*(\d+)"
        matches = re.findall(patron_evidencia, texto, re.IGNORECASE)
        
        for match in matches:
            tipo = match[0].upper()
            nombre = match[1].strip()
            peso = int(match[2])
            secciones["evidencias"][tipo] = {"nombre": nombre, "peso": peso}
        
        # Buscar fórmulas de unidad
        patron_formula = r"(PU1|PU2|PU3|PP)\s*=\s*([^\n]+)"
        formulas = re.findall(patron_formula, texto, re.IGNORECASE)
        secciones["formulas"] = {f[0].upper(): f[1].strip() for f in formulas}
        
        # Buscar nota aprobatoria
        patron_nota = r"nota aprobatoria es (\d+)" 
        nota_match = re.search(patron_nota, texto, re.IGNORECASE)
        if nota_match:
            secciones["nota_aprobatoria"] = int(nota_match.group(1))
        
        # Buscar tutoría
        if "consejería" in texto.lower() or "tutoría" in texto.lower():
            secciones["tutoria"] = PDFParserService._extraer_tutoria(texto)
        
        # Segmentar unidades
        secciones["unidades"] = PDFParserService._extraer_unidades(texto)
        
        return secciones
    
    @staticmethod
    def _extraer_tutoria(texto: str) -> Dict:
        """Extrae información de consejería/tutoría"""
        tutoria = {}
        
        patron_dia = r"(?:Día|DIAS?)[:\s]*([A-Za-zéúíóáñ]+)"
        patron_horario = r"(?:Horario|HORA)[:\s]*([\d\s:,-]+)"
        patron_correo = r"([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})"
        
        dia_match = re.search(patron_dia, texto, re.IGNORECASE)
        horario_match = re.search(patron_horario, texto, re.IGNORECASE)
        correo_match = re.search(patron_correo, texto)
        
        if dia_match:
            tutoria["dia"] = dia_match.group(1)
        if horario_match:
            tutoria["horario"] = horario_match.group(1)
        if correo_match:
            tutoria["email"] = correo_match.group(1)
        
        return tutoria
    
    @staticmethod
    def _extraer_unidades(texto: str) -> List[Dict]:
        """Extrae las unidades temáticas"""
        unidades = []
        patron_unidad = r"Unidad\s+([IVX]+|U?\d+)[:\s]*([^\n]+)"
        matches = re.findall(patron_unidad, texto, re.IGNORECASE)
        
        for i, match in enumerate(matches, 1):
            unidades.append({
                "id": f"U{i}",
                "nombre": match[1].strip(),
                "semanas": f"Semana {i*5-4}-{i*5}" if i <= 3 else "",
                "competencias": []
            })
        
        return unidades if unidades else [
            {"id": "U1", "nombre": "Introducción", "semanas": "1-5"},
            {"id": "U2", "nombre": "Desarrollo", "semanas": "6-11"},
            {"id": "U3", "nombre": "Aplicación", "semanas": "12-16"}
        ]
    
    @staticmethod
    def validar_estructura(secciones: Dict) -> Dict:
        """Valida si la estructura extraída es confiable"""
        advertencias = []
        
        if not secciones.get("evidencias"):
            advertencias.append("No se detectaron evidencias PFD/TAD/ELD")
        
        if not secciones.get("formulas"):
            advertencias.append("No se detectaron fórmulas de evaluación")
        
        if not secciones.get("nota_aprobatoria"):
            advertencias.append("No se detectó la nota aprobatoria, se usará 14 por defecto")
        
        confiabilidad = "ALTA" if len(advertencias) == 0 else "MEDIA" if len(advertencias) <= 2 else "BAJA"
        
        return {
            "confiabilidad": confiabilidad,
            "advertencias": advertencias,
            "es_oficial": False  # Solo es oficial si viene del sílabo precargado
        }