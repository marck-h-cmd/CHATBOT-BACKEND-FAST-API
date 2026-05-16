import sys
import os

# Agregar el directorio padre al path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.database.connection import SessionLocal
from app.database.models import Silabo, Curso, PeriodoAcademico, TipoSilabo, AmbitoUso, EstadoVerificacion

def seed_official_silabo():
    db = SessionLocal()
    try:
        # Buscar curso oficial
        curso = db.query(Curso).filter(Curso.codigo_curso == "EE-701").first() # GESTION DE SERVICIOS DE TIC
        if not curso:
            print("⚠️ No se encontró el curso EE-701. Asegúrate de ejecutar seed_courses.py primero.")
            return

        # Buscar periodo actual
        periodo = db.query(PeriodoAcademico).filter(PeriodoAcademico.es_actual == True).first()
        
        # Verificar si ya existe el sílabo oficial
        existing = db.query(Silabo).filter(Silabo.id_curso == curso.id_curso, Silabo.es_oficial == True).first()
        
        if existing:
            print(f"⏭️ Sílabo oficial ya existe para {curso.nombre_curso}")
            return

        # Crear sílabo oficial
        nuevo_silabo = Silabo(
            id_curso=curso.id_curso,
            id_periodo=periodo.id_periodo if periodo else None,
            tipo_silabo=TipoSilabo.OFICIAL,
            ambito_uso=AmbitoUso.PUBLICADO,
            estado_validacion=EstadoVerificacion.OFICIAL,
            nombre_archivo="silabo_oficial_gestion_tic.pdf",
            es_oficial=True,
            es_validado=True,
            texto_extraido="SÍLABO OFICIAL DE GESTIÓN DE SERVICIOS DE TIC..." # Texto base
        )
        
        db.add(nuevo_silabo)
        db.commit()
        print(f"✅ Sílabo oficial creado para {curso.nombre_curso}")
        
    except Exception as e:
        print(f"❌ Error creando sílabo oficial: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_official_silabo()
