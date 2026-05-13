from typing import List, Dict
import re

class ChunkerService:
    
    CHUNK_SIZE = 500
    CHUNK_OVERLAP = 50
    
    @staticmethod
    def crear_chunks(texto: str, metadata_base: Dict = None ) -> List[Dict]:
        """Divide el texto en chunks con metadata"""
        chunks = []
        palabras = texto.split()
        
        # Detectar secciones por palabras clave
        secciones = ChunkerService._detectar_secciones(texto)
        
        # Crear chunks por sección
        for nombre_seccion, contenido in secciones.items():
            chunk_metadata = {
                "tipo_seccion": nombre_seccion,
                "fuente": metadata_base.get("nombre_curso", "Silabo") if metadata_base else "Silabo",
                "unidad": ChunkerService._detectar_unidad(contenido)
            }
            
            # Dividir sección larga en sub-chunks
            if len(contenido) > ChunkerService.CHUNK_SIZE:
                sub_chunks = ChunkerService._dividir_texto(contenido)
                for i, sub in enumerate(sub_chunks):
                    chunks.append({
                        "texto": sub,
                        "metadata": {**chunk_metadata, "parte": i+1, "total_partes": len(sub_chunks)}
                    })
            else:
                chunks.append({
                    "texto": contenido,
                    "metadata": chunk_metadata
                })
        
        return chunks
    
    @staticmethod
    def _detectar_secciones(texto: str) -> Dict[str, str]:
        """Detecta y separa secciones del sílabo"""
        secciones = {}
        
        # Patrones de secciones comunes en sílabos UNT
        patrones = {
            "competencias": r"(COMPETENCIAS|COMPETENCIA GENERAL|RESULTADOS DEL ESTUDIANTE)[\s\S]*?(?=(?:\n\s*(?:IV\.?|SUMARIO|EVALUACIÓN)|$))",
            "evaluacion": r"(EVALUACIÓN|SISTEMA DE EVALUACIÓN|CRITERIOS DE EVALUACIÓN)[\s\S]*?(?=(?:\n\s*(?:V\.?|BIBLIOGRAFÍA|ANEXOS)|$))",
            "contenidos": r"(CONTENIDOS|PROGRAMACIÓN ACADÉMICA|UNIDADES)[\s\S]*?(?=(?:\n\s*(?:EVALUACIÓN|IV\.?)|$))",
            "metodologia": r"(METODOLOGÍA|ESTRATEGIAS DIDÁCTICAS)[\s\S]*?(?=(?:\n\s*(?:EVALUACIÓN|V\.?)|$))",
            "tutoria": r"(CONSEJERÍA ACADÉMICA|TUTORÍA)[\s\S]*?(?=(?:\n\s*(?:VI\.?)|$))"
        }
        
        for nombre, patron in patrones.items():
            match = re.search(patron, texto, re.IGNORECASE)
            if match:
                secciones[nombre] = match.group(0).strip()
        
        # Si no se detectaron secciones, incluir todo el texto
        if not secciones:
            secciones["general"] = texto[:5000]
        
        return secciones
    
    @staticmethod
    def _dividir_texto(texto: str) -> List[str]:
        """Divide texto largo en chunks con overlap"""
        palabras = texto.split()
        chunks = []
        
        for i in range(0, len(palabras), ChunkerService.CHUNK_SIZE - ChunkerService.CHUNK_OVERLAP):
            chunk = " ".join(palabras[i:i + ChunkerService.CHUNK_SIZE])
            if chunk:
                chunks.append(chunk)
        
        return chunks
    
    @staticmethod
    def _detectar_unidad(texto: str) -> str:
        """Detecta a qué unidad pertenece un fragmento"""
        if re.search(r"Unidad\s+I|U1", texto, re.IGNORECASE):
            return "U1"
        elif re.search(r"Unidad\s+II|U2", texto, re.IGNORECASE):
            return "U2"
        elif re.search(r"Unidad\s+III|U3", texto, re.IGNORECASE):
            return "U3"
        return "GENERAL"
