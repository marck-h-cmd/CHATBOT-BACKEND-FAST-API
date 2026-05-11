#!/usr/bin/env python3
"""Script para inicializar la base de datos con datos precargados"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.connection import engine, SessionLocal
from app.database.models import Base, Curso, Silabo, ReglaEvaluacion
from app.services.rule_engine import RuleEngine
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

def init_database():
    """Inicializa la base de datos con el sílabo precargado"""
    
    try:
        with engine.begin() as conn:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
    except SQLAlchemyError as e:
        print(f"⚠️  No se pudo crear extensión vector (pgvector no instalado): {e}")
        print("   El sistema funcionará con búsqueda por palabras clave (fallback)")
        pass

    # Crear tablas
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    try:
        # Crear curso oficial
        curso = Curso(
            codigo="3445",
            nombre="GESTIÓN DE SERVICIOS DE TIC",
            ciclo="VII",
            periodo="2026-I",
            docente="Alberto Carlos Mendoza de los Santos",
            email_docente="amendozad@unitru.edu.pe",
            es_oficial=True,
            reglas_json=RuleEngine.REGLAS_OFICIALES
        )
        db.add(curso)
        db.commit()
        db.refresh(curso)
        
        # Crear silabo asociado
        silabo = Silabo(
            id_curso=curso.id,
            nombre_archivo="silabo_oficial_Gestion_TIC.pdf",
            texto_completo="Sílabo oficial del curso Gestión de Servicios de TIC",
            es_oficial=True,
            es_validado=True,
            aviso_fiabilidad="Sílabo oficial validado con reglas deterministas"
        )
        db.add(silabo)
        db.commit()
        
        print(f"✅ Base de datos inicializada correctamente")
        print(f"   Curso: {curso.nombre} (ID: {curso.id})")
        print(f"   Sílabo ID: {silabo.id}")
        
        # Mostrar reglas cargadas
        print(f"\n📋 Reglas de evaluación cargadas:")
        for unidad, reglas in RuleEngine.REGLAS_OFICIALES.items():
            print(f"   {unidad}: {reglas['formula']}")
        
    except Exception as e:
        print(f"❌ Error inicializando base de datos: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    init_database()
