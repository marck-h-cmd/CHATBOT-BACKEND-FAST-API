"""
Seeder para insertar periodos académicos en la base de datos
"""

import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.database.models import PeriodoAcademico

PERIODS_DATA = [
    {
        "anio": 2023,
        "termino": "I",
        "nombre": "2023-I",
        "es_actual": False,
        "fecha_inicio": "2023-03-01",
        "fecha_fin": "2023-07-15"
    },
    {
        "anio": 2023,
        "termino": "II",
        "nombre": "2023-II",
        "es_actual": False,
        "fecha_inicio": "2023-08-01",
        "fecha_fin": "2023-12-15"
    },
    {
        "anio": 2024,
        "termino": "I",
        "nombre": "2024-I",
        "es_actual": False,
        "fecha_inicio": "2024-03-01",
        "fecha_fin": "2024-07-15"
    },
    {
        "anio": 2024,
        "termino": "II",
        "nombre": "2024-II",
        "es_actual": False,
        "fecha_inicio": "2024-08-01",
        "fecha_fin": "2024-12-15"
    },
    {
        "anio": 2024,
        "termino": "Verano",
        "nombre": "2024-Verano",
        "es_actual": False,
        "fecha_inicio": "2024-01-15",
        "fecha_fin": "2024-02-28"
    },
    {
        "anio": 2025,
        "termino": "I",
        "nombre": "2025-I",
        "es_actual": False,
        "fecha_inicio": "2025-03-01",
        "fecha_fin": "2025-07-15"
    },
    {
        "anio": 2025,
        "termino": "II",
        "nombre": "2025-II",
        "es_actual": False,
        "fecha_inicio": "2025-08-01",
        "fecha_fin": "2025-12-15"
    },
    {
        "anio": 2026,
        "termino": "I",
        "nombre": "2026-I",
        "es_actual": True,
        "fecha_inicio": "2026-03-01",
        "fecha_fin": "2026-07-15"
    },
]

def seed_periods():
    """Inserta periodos académicos en la base de datos"""
    db: Session = next(get_db())
    
    try:
        # Contar periodos existentes
        existing_count = db.query(PeriodoAcademico).count()
        print(f"Periodos existentes en la base de datos: {existing_count}")
        
        # Insertar periodos
        inserted_count = 0
        skipped_count = 0
        
        for period_data in PERIODS_DATA:
            # Verificar si el periodo ya existe por nombre
            existing = db.query(PeriodoAcademico).filter(
                PeriodoAcademico.nombre == period_data["nombre"]
            ).first()
            
            if existing:
                print(f"⏭️  Periodo ya existe: {period_data['nombre']}")
                if existing.es_actual != period_data.get("es_actual", False):
                    existing.es_actual = period_data.get("es_actual", False)
                    print(f"🔄 Actualizando estado es_actual de {period_data['nombre']} a {period_data.get('es_actual', False)}")
                skipped_count += 1
            else:
                new_period = PeriodoAcademico(**period_data)
                db.add(new_period)
                inserted_count += 1
                print(f"✅ Insertando: {period_data['nombre']}")
        
        db.commit()
        
        print(f"\n=== Resumen ===")
        print(f"📊 Total de periodos en el plan: {len(PERIODS_DATA)}")
        print(f"✅ Periodos insertados: {inserted_count}")
        print(f"⏭️  Periodos saltados (ya existían): {skipped_count}")
        print(f"📅 Total de periodos en la base de datos: {db.query(PeriodoAcademico).count()}")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error al insertar periodos: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    print("🌱 Iniciando seeder de periodos académicos\n")
    seed_periods()
    print("\n✨ Seeder completado exitosamente")
