"""
Seeder para insertar cursos oficiales del Plan de Estudios de Ingeniería de Sistemas 2018
"""

import sys
import os

# Agregar el directorio padre al path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.database.connection import get_db, engine
from app.database.models import Curso

COURSES_DATA = [
    # I Ciclo
    {"codigo_curso": "EG-101", "nombre_curso": "Desarrollo del Pensamiento Lógico Matemático", "ciclo_referencial": "I", "creditos": 3, "escuela": "Dpto. de Matemáticas"},
    {"codigo_curso": "EG-102", "nombre_curso": "Lectura Crítica y Redacción de Textos Académicos", "ciclo_referencial": "I", "creditos": 3, "escuela": "Dpto. de Lengua y Literatura"},
    {"codigo_curso": "EG-103", "nombre_curso": "Desarrollo Personal", "ciclo_referencial": "I", "creditos": 3, "escuela": "Dpto. de Ciencias Sicológicas"},
    {"codigo_curso": "EG-104", "nombre_curso": "Introducción al Análisis Matemático", "ciclo_referencial": "I", "creditos": 4, "escuela": "Dpto. de Matemáticas"},
    {"codigo_curso": "EG-105", "nombre_curso": "Estadística General", "ciclo_referencial": "I", "creditos": 4, "escuela": "Dpto. de Estadística"},
    {"codigo_curso": "EE-101", "nombre_curso": "Introducción a la Ingeniería de Sistemas", "ciclo_referencial": "I", "creditos": 2, "escuela": "Dpto. de Ing. Sistemas"},
    {"codigo_curso": "EE-102", "nombre_curso": "Introducción a la Programación", "ciclo_referencial": "I", "creditos": 3, "escuela": "Dpto. de Ing. Sistemas"},
    {"codigo_curso": "EL-101", "nombre_curso": "Técnicas de comunicación eficaz", "ciclo_referencial": "I", "creditos": 1, "escuela": "Dpto. de Comunicación Social"},
    {"codigo_curso": "EL-102", "nombre_curso": "Taller de Música", "ciclo_referencial": "I", "creditos": 1, "escuela": "Dpto. de Ciencias Sociales"},
    {"codigo_curso": "EL-103", "nombre_curso": "Taller de Liderazgo y trabajo en equipo", "ciclo_referencial": "I", "creditos": 1, "escuela": "Dpto. de Ciencias Sicológicas"},
    
    # II Ciclo
    {"codigo_curso": "EG-201", "nombre_curso": "Ética, Convivencia Humana y Ciudadanía", "ciclo_referencial": "II", "creditos": 3, "escuela": "Dpto. de Filosofía y Arte"},
    {"codigo_curso": "EG-202", "nombre_curso": "Sociedad, Cultura y Ecología", "ciclo_referencial": "II", "creditos": 3, "escuela": "Dpto. de Ciencias Sociales"},
    {"codigo_curso": "EG-203", "nombre_curso": "Cultura Investigativa y Pensamiento Crítico", "ciclo_referencial": "II", "creditos": 3, "escuela": "Dpto. de Ciencias Sociales"},
    {"codigo_curso": "EG-204", "nombre_curso": "Análisis Matemático", "ciclo_referencial": "II", "creditos": 4, "escuela": "Dpto. de Matemáticas"},
    {"codigo_curso": "EG-205", "nombre_curso": "Física General", "ciclo_referencial": "II", "creditos": 4, "escuela": "Dpto. de Física"},
    {"codigo_curso": "EE-201", "nombre_curso": "Programación Orientada a Objetos I", "ciclo_referencial": "II", "creditos": 4, "escuela": "Dpto. de Ing. Sistemas"},
    {"codigo_curso": "EL-201", "nombre_curso": "Taller de Manejo de TIC", "ciclo_referencial": "II", "creditos": 1, "escuela": "Dpto. de Ing. Sistemas"},
    {"codigo_curso": "EL-202", "nombre_curso": "Taller de Danzas Folklóricas", "ciclo_referencial": "II", "creditos": 1, "escuela": "Dpto. de Filosofía y Arte"},
    {"codigo_curso": "EL-203", "nombre_curso": "Taller de Deporte", "ciclo_referencial": "II", "creditos": 1, "escuela": "Dpto. de Educación"},
    
    # III Ciclo
    {"codigo_curso": "EP-301", "nombre_curso": "Administración General", "ciclo_referencial": "III", "creditos": 3, "escuela": "Dpto. de Administración"},
    {"codigo_curso": "EE-301", "nombre_curso": "Sistémica", "ciclo_referencial": "III", "creditos": 3, "escuela": "Dpto. de Ing. Sistemas"},
    {"codigo_curso": "EP-302", "nombre_curso": "Estadística Aplicada", "ciclo_referencial": "III", "creditos": 3, "escuela": "Dpto. de Estadística"},
    {"codigo_curso": "EP-303", "nombre_curso": "Matemática Aplicada", "ciclo_referencial": "III", "creditos": 3, "escuela": "Dpto. de Matemáticas"},
    {"codigo_curso": "EP-304", "nombre_curso": "Física Electrónica", "ciclo_referencial": "III", "creditos": 3, "escuela": "Dpto. de Física"},
    {"codigo_curso": "EE-302", "nombre_curso": "Programación Orientada a Objetos II", "ciclo_referencial": "III", "creditos": 4, "escuela": "Dpto. de Ing. Sistemas"},
    {"codigo_curso": "EL-301", "nombre_curso": "Ingeniería Gráfica", "ciclo_referencial": "III", "creditos": 3, "escuela": "Dpto. de Ing. Sistemas"},
    {"codigo_curso": "EL-302", "nombre_curso": "Sicología Organizacional", "ciclo_referencial": "III", "creditos": 3, "escuela": "Dpto. de Ciencias Sicológicas"},
    
    # IV Ciclo
    {"codigo_curso": "EP-401", "nombre_curso": "Economía General", "ciclo_referencial": "IV", "creditos": 3, "escuela": "Dpto. de Economía"},
    {"codigo_curso": "EE-401", "nombre_curso": "Diseño Web", "ciclo_referencial": "IV", "creditos": 3, "escuela": "Dpto. de Ing. Sistemas"},
    {"codigo_curso": "EP-402", "nombre_curso": "Pensamiento de Diseño", "ciclo_referencial": "IV", "creditos": 3, "escuela": "Dpto. de Ing. Sistemas"},
    {"codigo_curso": "EP-403", "nombre_curso": "Gestión por Procesos", "ciclo_referencial": "IV", "creditos": 3, "escuela": "Dpto. de Ing. Sistemas"},
    {"codigo_curso": "EE-402", "nombre_curso": "Sistemas Digitales", "ciclo_referencial": "IV", "creditos": 3, "escuela": "Dpto. de Ing. Sistemas"},
    {"codigo_curso": "EE-403", "nombre_curso": "Estructura de Datos Orientado a Objetos", "ciclo_referencial": "IV", "creditos": 4, "escuela": "Dpto. de Ing. Sistemas"},
    {"codigo_curso": "EL-401", "nombre_curso": "Computación Gráfica y Visual", "ciclo_referencial": "IV", "creditos": 3, "escuela": "Dpto. de Ing. Sistemas"},
    {"codigo_curso": "EL-402", "nombre_curso": "Plataformas Tecnológicas", "ciclo_referencial": "IV", "creditos": 3, "escuela": "Dpto. de Ing. Sistemas"},
    
    # V Ciclo
    {"codigo_curso": "EP-501", "nombre_curso": "Contabilidad Gerencial", "ciclo_referencial": "V", "creditos": 3, "escuela": "Dpto. de Contabilidad y Finanzas"},
    {"codigo_curso": "EE-501", "nombre_curso": "Tecnologías Web", "ciclo_referencial": "V", "creditos": 3, "escuela": "Dpto. de Ing. Sistemas"},
    {"codigo_curso": "EP-502", "nombre_curso": "Investigación de Operaciones", "ciclo_referencial": "V", "creditos": 3, "escuela": "Dpto. de Ing. Sistemas"},
    {"codigo_curso": "EE-502", "nombre_curso": "Ingeniería de Datos I", "ciclo_referencial": "V", "creditos": 4, "escuela": "Dpto. de Ing. Sistemas"},
    {"codigo_curso": "EE-503", "nombre_curso": "Arquitectura y Organización de Computadoras", "ciclo_referencial": "V", "creditos": 3, "escuela": "Dpto. de Ing. Sistemas"},
    {"codigo_curso": "EE-504", "nombre_curso": "Sistemas de Información", "ciclo_referencial": "V", "creditos": 4, "escuela": "Dpto. de Ing. Sistemas"},
    {"codigo_curso": "EL-501", "nombre_curso": "Teleinformática", "ciclo_referencial": "V", "creditos": 3, "escuela": "Dpto. de Ing. Sistemas"},
    {"codigo_curso": "EL-502", "nombre_curso": "Transformación Digital", "ciclo_referencial": "V", "creditos": 3, "escuela": "Dpto. de Ing. Sistemas"},
    
    # VI Ciclo
    {"codigo_curso": "EP-601", "nombre_curso": "Finanzas Corporativas", "ciclo_referencial": "VI", "creditos": 3, "escuela": "Dpto. de Economía"},
    {"codigo_curso": "EE-601", "nombre_curso": "Sistemas Inteligentes", "ciclo_referencial": "VI", "creditos": 3, "escuela": "Dpto. de Ing. Sistemas"},
    {"codigo_curso": "EP-602", "nombre_curso": "Ingeniería Económica", "ciclo_referencial": "VI", "creditos": 3, "escuela": "Dpto. de Ing. Industrial"},
    {"codigo_curso": "EE-602", "nombre_curso": "Ingeniería de Datos II", "ciclo_referencial": "VI", "creditos": 4, "escuela": "Dpto. de Ing. Sistemas"},
    {"codigo_curso": "EE-603", "nombre_curso": "Sistemas Operativos", "ciclo_referencial": "VI", "creditos": 3, "escuela": "Dpto. de Ing. Sistemas"},
    {"codigo_curso": "EE-604", "nombre_curso": "Ingeniería de Requerimientos", "ciclo_referencial": "VI", "creditos": 3, "escuela": "Dpto. de Ing. Sistemas"},
    {"codigo_curso": "EL-601", "nombre_curso": "Ingeniería Ambiental", "ciclo_referencial": "VI", "creditos": 3, "escuela": "Dpto. de Ing. Ambiental"},
    {"codigo_curso": "EL-602", "nombre_curso": "Gestión del Talento Humano", "ciclo_referencial": "VI", "creditos": 3, "escuela": "Dpto. de Administración"},
    
    # VII Ciclo
    {"codigo_curso": "EP-701", "nombre_curso": "Cadena de Suministro", "ciclo_referencial": "VII", "creditos": 3, "escuela": "Dpto. de Ing. Industrial"},
    {"codigo_curso": "EE-701", "nombre_curso": "Gestión de Servicios de TIC", "ciclo_referencial": "VII", "creditos": 3, "escuela": "Dpto. de Ing. Sistemas"},
    {"codigo_curso": "EI-701", "nombre_curso": "Metodología de la Investigación Científica", "ciclo_referencial": "VII", "creditos": 3, "escuela": "Dpto. de Ing. Sistemas"},
    {"codigo_curso": "EE-702", "nombre_curso": "Planeamiento Estratégico de la Información", "ciclo_referencial": "VII", "creditos": 3, "escuela": "Dpto. de Ing. Sistemas"},
    {"codigo_curso": "EE-703", "nombre_curso": "Redes y Comunicaciones I", "ciclo_referencial": "VII", "creditos": 3, "escuela": "Dpto. de Ing. Sistemas"},
    {"codigo_curso": "EE-704", "nombre_curso": "Ingeniería del Software I", "ciclo_referencial": "VII", "creditos": 4, "escuela": "Dpto. de Ing. Sistemas"},
    {"codigo_curso": "EL-701", "nombre_curso": "Administración de Base de Datos", "ciclo_referencial": "VII", "creditos": 3, "escuela": "Dpto. de Ing. Sistemas"},
    {"codigo_curso": "EL-702", "nombre_curso": "Negocios Electrónicos", "ciclo_referencial": "VII", "creditos": 3, "escuela": "Dpto. de Ing. Sistemas"},
    
    # VIII Ciclo
    {"codigo_curso": "EP-801", "nombre_curso": "Marketing y Medios Sociales", "ciclo_referencial": "VIII", "creditos": 3, "escuela": "Dpto. de Ing. Sistemas"},
    {"codigo_curso": "EE-801", "nombre_curso": "Seguridad de la Información", "ciclo_referencial": "VIII", "creditos": 3, "escuela": "Dpto. de Ing. Sistemas"},
    {"codigo_curso": "EE-802", "nombre_curso": "Internet de las Cosas", "ciclo_referencial": "VIII", "creditos": 3, "escuela": "Dpto. de Ing. Sistemas"},
    {"codigo_curso": "EE-803", "nombre_curso": "Inteligencia de Negocios", "ciclo_referencial": "VIII", "creditos": 3, "escuela": "Dpto. de Ing. Sistemas"},
    {"codigo_curso": "EE-804", "nombre_curso": "Redes y Comunicaciones II", "ciclo_referencial": "VIII", "creditos": 3, "escuela": "Dpto. de Ing. Sistemas"},
    {"codigo_curso": "EE-805", "nombre_curso": "Ingeniería del Software II", "ciclo_referencial": "VIII", "creditos": 4, "escuela": "Dpto. de Ing. Sistemas"},
    {"codigo_curso": "EL-801", "nombre_curso": "Deontología y Derecho Informático", "ciclo_referencial": "VIII", "creditos": 3, "escuela": "Dpto. de Derecho"},
    {"codigo_curso": "EL-802", "nombre_curso": "Arquitectura basada en Microservicios", "ciclo_referencial": "VIII", "creditos": 3, "escuela": "Dpto. de Ing. Sistemas"},
    
    # IX Ciclo
    {"codigo_curso": "EE-901", "nombre_curso": "Gestión de Proyectos de TIC", "ciclo_referencial": "IX", "creditos": 1, "escuela": "Dpto. de Ing. Sistemas"},
    {"codigo_curso": "EE-902", "nombre_curso": "Auditoría Informática", "ciclo_referencial": "IX", "creditos": 3, "escuela": "Dpto. de Ing. Sistemas"},
    {"codigo_curso": "EI-901", "nombre_curso": "Tesis I", "ciclo_referencial": "IX", "creditos": 4, "escuela": "Dpto. de Ing. Sistemas"},
    {"codigo_curso": "EE-903", "nombre_curso": "Analítica de Negocios", "ciclo_referencial": "IX", "creditos": 3, "escuela": "Dpto. de Ing. Sistemas"},
    {"codigo_curso": "EE-904", "nombre_curso": "Computación en la Nube", "ciclo_referencial": "IX", "creditos": 3, "escuela": "Dpto. de Ing. Sistemas"},
    {"codigo_curso": "EE-905", "nombre_curso": "Ingeniería Web", "ciclo_referencial": "IX", "creditos": 3, "escuela": "Dpto. de Ing. Sistemas"},
    {"codigo_curso": "EL-901", "nombre_curso": "Emprendedurismo Tecnológico", "ciclo_referencial": "IX", "creditos": 3, "escuela": "Dpto. de Ing. Sistemas"},
    {"codigo_curso": "EL-902", "nombre_curso": "Hackeo Ético", "ciclo_referencial": "IX", "creditos": 3, "escuela": "Dpto. de Ing. Sistemas"},
    
    # X Ciclo
    {"codigo_curso": "EE-X01", "nombre_curso": "Sistemas de Información Empresarial", "ciclo_referencial": "X", "creditos": 4, "escuela": "Dpto. de Ing. Sistemas"},
    {"codigo_curso": "EE-X02", "nombre_curso": "Gobierno de TIC", "ciclo_referencial": "X", "creditos": 3, "escuela": "Dpto. de Ing. Sistemas"},
    {"codigo_curso": "EI-X01", "nombre_curso": "Tesis II", "ciclo_referencial": "X", "creditos": 4, "escuela": "Dpto. de Ing. Sistemas"},
    {"codigo_curso": "EE-X03", "nombre_curso": "Arquitectura Empresarial", "ciclo_referencial": "X", "creditos": 3, "escuela": "Dpto. de Ing. Sistemas"},
    {"codigo_curso": "EP-X01", "nombre_curso": "Responsabilidad Social Corporativa", "ciclo_referencial": "X", "creditos": 3, "escuela": "Dpto. Ing. Industrial"},
    {"codigo_curso": "EE-X04", "nombre_curso": "Aplicaciones Móviles", "ciclo_referencial": "X", "creditos": 3, "escuela": "Dpto. de Ing. Sistemas"},
    {"codigo_curso": "EE-X05", "nombre_curso": "Prácticas Pre Profesionales", "ciclo_referencial": "X", "creditos": 4, "escuela": "Dpto. de Ing. Sistemas"},
]


def seed_courses():
    """Inserta los cursos oficiales del plan de estudios en la base de datos"""
    db: Session = next(get_db())
    
    try:
        # Contar cursos existentes
        existing_count = db.query(Curso).count()
        print(f"Cursos existentes en la base de datos: {existing_count}")
        
        # Insertar cursos
        inserted_count = 0
        skipped_count = 0
        
        for course_data in COURSES_DATA:
            # Verificar si el curso ya existe por código
            existing = db.query(Curso).filter(
                Curso.codigo_curso == course_data["codigo_curso"]
            ).first()
            
            if existing:
                print(f"⏭️  Curso ya existe: {course_data['codigo_curso']} - {course_data['nombre_curso']}")
                skipped_count += 1
            else:
                new_course = Curso(**course_data)
                db.add(new_course)
                inserted_count += 1
                print(f"✅ Insertando: {course_data['codigo_curso']} - {course_data['nombre_curso']}")
        
        db.commit()
        
        print(f"\n=== Resumen ===")
        print(f"📊 Total de cursos en el plan: {len(COURSES_DATA)}")
        print(f"✅ Cursos insertados: {inserted_count}")
        print(f"⏭️  Cursos saltados (ya existían): {skipped_count}")
        print(f"📚 Total de cursos en la base de datos: {db.query(Curso).count()}")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error al insertar cursos: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print("🌱 Iniciando seeder de cursos del Plan de Estudios de Ingeniería de Sistemas 2018\n")
    seed_courses()
    print("\n✨ Seeder completado exitosamente")
