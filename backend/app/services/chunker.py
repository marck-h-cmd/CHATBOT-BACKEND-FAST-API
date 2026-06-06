from typing import List, Dict
import re

class ChunkerService:
    
    CHUNK_SIZE = 500
    CHUNK_OVERLAP = 50
    
    @staticmethod
    def crear_chunks(texto: str, metadata_base: Dict = None ) -> List[Dict]:
        """Divide el texto en chunks con metadata"""
        chunks = []
        
        # Detectar secciones por palabras clave
        secciones = ChunkerService._detectar_secciones(texto)
        
        # Crear chunks por sección
        for nombre_seccion, contenido in secciones.items():
            if not contenido.strip():
                continue
                
            if nombre_seccion == "contenidos":
                # Intentar separar por unidades explícitamente
                unidades_split = re.split(r'(?i)\b(I\s+UNIDAD|UNIDAD\s+I|II\s+UNIDAD|UNIDAD\s+II|III\s+UNIDAD|UNIDAD\s+III)\b', contenido)
                
                if len(unidades_split) > 1:
                    current_u = "GENERAL"
                    for part in unidades_split:
                        part_strip = part.strip()
                        if not part_strip:
                            continue
                            
                        # Detectar si esta parte es un separador de unidad
                        if re.match(r'(?i)\b(I\s+UNIDAD|UNIDAD\s+I)\b', part_strip):
                            current_u = "U1"
                            continue
                        elif re.match(r'(?i)\b(II\s+UNIDAD|UNIDAD\s+II)\b', part_strip):
                            current_u = "U2"
                            continue
                        elif re.match(r'(?i)\b(III\s+UNIDAD|UNIDAD\s+III)\b', part_strip):
                            current_u = "U3"
                            continue
                            
                        if len(part_strip) > 50:
                            chunk_metadata = {
                                "tipo_seccion": nombre_seccion,
                                "fuente": metadata_base.get("nombre_curso", "Silabo") if metadata_base else "Silabo",
                                "unidad": current_u
                            }
                            
                            # Dividir si es muy largo
                            if len(part_strip) > ChunkerService.CHUNK_SIZE:
                                sub_chunks = ChunkerService._dividir_texto(part_strip)
                                for i, sub in enumerate(sub_chunks):
                                    chunks.append({
                                        "texto": sub,
                                        "metadata": {**chunk_metadata, "parte": i+1, "total_partes": len(sub_chunks)}
                                    })
                            else:
                                chunks.append({
                                    "texto": part_strip,
                                    "metadata": chunk_metadata
                                })
                    continue # Saltar la lógica por defecto ya que lo manejamos aquí

            # Lógica por defecto para otras secciones
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
            "sumilla": r"(SUMILLA|FUNDAMENTACIÓN)[\s\S]*?(?=(?:\n\s*(?:II\.?|COMPETENCIAS|COMPETENCIA GENERAL)|$))",
            "competencias": r"(COMPETENCIAS|COMPETENCIA GENERAL|RESULTADOS DEL ESTUDIANTE)[\s\S]*?(?=(?:\n\s*(?:IV\.?|SUMARIO|EVALUACIÓN|PROGRAMACIÓN ACADÉMICA)|$))",
            "evaluacion": r"(EVALUACIÓN|SISTEMA DE EVALUACIÓN|CRITERIOS DE EVALUACIÓN)[\s\S]*?(?=(?:\n\s*(?:V\.?|VI\.?|BIBLIOGRAFÍA|ANEXOS|EXÁ?MENES SUSTITUTORIOS|EXAMEN DE APLAZADOS|TUTORÍA|CONSEJERÍA ACADÉMICA)|$))",
            "aplazados_susti": r"(EXÁ?MENES SUSTITUTORIOS|EXAMEN DE APLAZADOS)[\s\S]*?(?=(?:\n\s*(?:VI\.?|VII\.?|BIBLIOGRAFÍA|ANEXOS)|$))",
            "contenidos": r"(CONTENIDOS|PROGRAMACIÓN ACADÉMICA|UNIDADES)[\s\S]*?(?=(?:\n\s*(?:EVALUACIÓN|SISTEMA DE EVALUACIÓN|V\.?|METODOLOGÍA|ESTRATEGIAS DIDÁCTICAS)|$))",
            "metodologia": r"(METODOLOGÍA|ESTRATEGIAS DIDÁCTICAS)[\s\S]*?(?=(?:\n\s*(?:EVALUACIÓN|SISTEMA DE EVALUACIÓN|V\.?|VI\.?)|$))",
            "tutoria": r"(CONSEJERÍA ACADÉMICA|TUTORÍA)[\s\S]*?(?=(?:\n\s*(?:VI\.?|VII\.?|VIII\.?|BIBLIOGRAFÍA|REFERENCIAS)|$))",
            "capacidades": r"(CAPACIDADES|RESULTADOS DE APRENDIZAJE)[\s\S]*?(?=(?:\n\s*(?:CONTENIDOS|ESTRATEGIAS|IV\.?|PROGRAMACIÓN ACADÉMICA)|$))",
        }
        
        for nombre, patron in patrones.items():
            match = re.search(patron, texto, re.IGNORECASE)
            if match:
                secciones[nombre] = match.group(0).strip()
        
        # Siempre incluir el inicio del documento como 'general' (cabecera del curso)
        if "general" not in secciones:
            secciones["general"] = texto[:3000]
        
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
