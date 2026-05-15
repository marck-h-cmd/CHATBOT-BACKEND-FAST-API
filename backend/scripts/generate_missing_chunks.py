import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.connection import SessionLocal
from app.database.models import Silabo, SilaboChunk, TipoSeccionChunk
from app.services.chunker import ChunkerService
from app.services.embeddings import embedding_service

def generate_missing_chunks():
    db = SessionLocal()
    try:
        # Obtener todos los sílabos para regenerar sus chunks con la nueva regla (incluye general)
        silabos = db.query(Silabo).all()
        
        print(f"Se encontraron {len(silabos)} sílabos para regenerar chunks.")
        
        for silabo in silabos:
            if not silabo.texto_extraido:
                print(f"El sílabo ID {silabo.id_silabo} no tiene texto extraído.")
                continue
                
            print(f"Regenerando chunks para sílabo ID {silabo.id_silabo} ({silabo.nombre_archivo})...")
            
            # Eliminar chunks existentes
            db.query(SilaboChunk).filter(SilaboChunk.id_silabo == silabo.id_silabo).delete()
            
            metadata_base = {"nombre_curso": silabo.curso.nombre_curso if silabo.curso else "Curso Desconocido"}
            chunks_creados = ChunkerService.crear_chunks(silabo.texto_extraido, metadata_base)
            
            for c in chunks_creados:
                emb = embedding_service.generar_embedding(c["texto"])
                
                # Mapear tipo de sección a Enum válido
                tipo_str = c["metadata"].get("tipo_seccion", "").upper()
                tipo_enum = TipoSeccionChunk.CONTENIDOS
                if "COMPETENCIA" in tipo_str:
                    tipo_enum = TipoSeccionChunk.COMPETENCIAS
                elif "EVALUA" in tipo_str or "CRITERIO" in tipo_str:
                    tipo_enum = TipoSeccionChunk.EVALUACION
                elif "TUTOR" in tipo_str:
                    tipo_enum = TipoSeccionChunk.TUTORIA
                elif "SUMILLA" in tipo_str:
                    tipo_enum = TipoSeccionChunk.SUMILLA
                elif "FORMULA" in tipo_str:
                    tipo_enum = TipoSeccionChunk.FORMULA
                
                nuevo_chunk = SilaboChunk(
                    id_silabo=silabo.id_silabo,
                    contenido=c["texto"],
                    tipo_seccion=tipo_enum,
                    embedding=emb,
                    metadata_json=c["metadata"]
                )
                db.add(nuevo_chunk)
            
            db.commit()
            print(f"  -> {len(chunks_creados)} chunks generados exitosamente.")
            
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    generate_missing_chunks()
