#!/usr/bin/env python3
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.connection import engine, SessionLocal
from app.database.models import Base

print("🚀 Inicializando base de datos...")

try:
    # Intentar crear extensión vector (opcional)
    with engine.connect() as conn:
        try:
            conn.execute("CREATE EXTENSION IF NOT EXISTS vector")
            conn.commit()
            print("✅ Extensión vector creada (pgvector disponible)")
        except Exception as e:
            print(f"⚠️ No se pudo crear extensión vector: {e}")
            print("   El sistema funcionará con búsqueda por palabras clave (fallback)")
except Exception as e:
    print(f"⚠️ Error verificando extensión: {e}")

# Crear todas las tablas
Base.metadata.create_all(bind=engine)
print("✅ Tablas creadas correctamente")

# Verificar tablas
from sqlalchemy import inspect
inspector = inspect(engine)
tables = inspector.get_table_names()
print(f"\n📋 Tablas creadas ({len(tables)}):")
for table in sorted(tables):
    print(f"   - {table}")

print("\n✅ Base de datos inicializada correctamente")