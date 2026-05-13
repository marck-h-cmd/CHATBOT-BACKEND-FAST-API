import fitz  # PyMuPDF
from typing import Dict

from app.services.ai_parser import gemini_parser, GEMINI_DISPONIBLE
from app.config import Config


class PDFParserService:
    """
    Servicio de parsing de PDF usando Gemini API (una sola llamada)
    """
    
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
        """
        Extrae secciones del sílabo en UNA SOLA llamada a Gemini
        Mantiene la misma interfaz para compatibilidad con frontend
        """
        # Una sola llamada a Gemini (optimizado)
        resultado_ia = gemini_parser.extraer_estructura_completa(texto)
        
        # Determinar confiabilidad
        confiabilidad = "ALTA"
        advertencias = []
        
        if not Config.USE_GEMINI or not GEMINI_DISPONIBLE:
            confiabilidad = "MEDIA"
            advertencias.append("Usando modo estándar (sin IA)")
        
        if resultado_ia.get("codigo_curso") == "0000":
            confiabilidad = "BAJA"
            advertencias.append("No se detectó código de curso")
        
        # Formato esperado por el frontend (compatible)
        return {
            "competencias": "",
            "contenidos": "",
            "evaluacion": "",
            "evidencias": resultado_ia.get("evidencias", {}),
            "unidades": resultado_ia.get("unidades", []),
            "tutoria": resultado_ia.get("tutoria", {}),
            "fechas": resultado_ia.get("periodo", ""),
            "formulas": resultado_ia.get("formulas", {}),
            "nota_aprobatoria": resultado_ia.get("nota_aprobatoria", 14),
            "codigo_curso": resultado_ia.get("codigo_curso", "0000"),
            "nombre_curso": resultado_ia.get("nombre_curso", "Curso sin nombre"),
            "docente": resultado_ia.get("docente", "No especificado"),
            "email_docente": resultado_ia.get("email_docente", ""),
            "reglas": resultado_ia.get("reglas", {}),
            "confiabilidad": confiabilidad,
            "advertencias": advertencias,
            "usando_gemini": Config.USE_GEMINI and GEMINI_DISPONIBLE
        }
    
    @staticmethod
    def validar_estructura(secciones: Dict) -> Dict:
        """Valida la estructura extraída"""
        advertencias = secciones.get("advertencias", [])
        
        if not secciones.get("evidencias"):
            advertencias.append("No se detectaron evidencias")
        
        if not secciones.get("formulas"):
            advertencias.append("No se detectaron fórmulas")
        
        return {
            "confiabilidad": secciones.get("confiabilidad", "MEDIA"),
            "advertencias": advertencias,
            "es_oficial": False,
            "usando_gemini": secciones.get("usando_gemini", False)
        }