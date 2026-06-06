import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.connection import SessionLocal
from app.api.routes.syllabus import generar_y_guardar_chunks
from app.database.models import Silabo

def generate_missing_chunks():
    db = SessionLocal()
    try:
        # Obtener todos los sílabos para regenerar sus chunks con la nueva regla
        silabos = db.query(Silabo).all()
        
        print(f"Se encontraron {len(silabos)} sílabos para regenerar chunks.")
        
        for silabo in silabos:
            if not silabo.texto_extraido:
                print(f"El sílabo ID {silabo.id_silabo} no tiene texto extraído.")
                continue
                
            print(f"Regenerando chunks para sílabo ID {silabo.id_silabo} ({silabo.nombre_archivo})...")
            
            if silabo.curso:
                chunks_creados = generar_y_guardar_chunks(db, silabo, silabo.curso)
                print(f"  -> {chunks_creados} chunks generados exitosamente.")
            else:
                print(f"  -> Saltado: No tiene curso asociado.")
            
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    generate_missing_chunks()
