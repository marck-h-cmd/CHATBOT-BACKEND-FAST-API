"""
Script de migración para agregar campos OTP a la tabla usuario.
Ejecutar: python -m backend.scripts.add_otp_fields
"""
import os
import sys

# Asegurar que el backend está en el path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.connection import engine, Base
from sqlalchemy import text


def add_otp_fields():
    """Agrega las columnas otp_code y otp_expires_at a la tabla usuario."""
    with engine.connect() as conn:
        # Verificar si las columnas ya existen
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'usuario' AND column_name IN ('otp_code', 'otp_expires_at')
        """))
        existing = {row[0] for row in result}

        if 'otp_code' not in existing:
            conn.execute(text("ALTER TABLE usuario ADD COLUMN otp_code VARCHAR(6)"))
            print("✅ Columna otp_code agregada")
        else:
            print("ℹ️ Columna otp_code ya existe")

        if 'otp_expires_at' not in existing:
            conn.execute(text("ALTER TABLE usuario ADD COLUMN otp_expires_at TIMESTAMP"))
            print("✅ Columna otp_expires_at agregada")
        else:
            print("ℹ️ Columna otp_expires_at ya existe")

        conn.commit()
        print("\n🎉 Migración OTP completada exitosamente.")


if __name__ == "__main__":
    add_otp_fields()
