"""
Seeder para entorno de Producción
Crea las estructuras base (periodos, cursos) y un administrador específico.
NO incluye: silabos, incidentes, estudiantes, ni chunks.
"""

import sys
import os
import subprocess


sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.database.models import Usuario, RolUsuario
from app.core.security import SecurityService

ADMIN_PROD = {
    "nombres": "Soporte",
    "apellidos": "Sylia",
    "email": "syliahelp67@unitru.edu.pe",
    "codigo_universitario": "ADMIN_PROD",
    "password": "password123", # Temporal, el usuario debería cambiarla
    "rol": RolUsuario.ADMIN
}

def run_script(script_path):
    script_name = os.path.basename(script_path)
    print(f"\n{'='*50}")
    print(f"  Ejecutando: {script_name}")
    print(f"{'='*50}")

    result = subprocess.run([sys.executable, script_path], capture_output=False)

    if result.returncode != 0:
        print(f"  ❌ Error en {script_name}")
        return False

    print(f"  ✅ {script_name} OK")
    return True

def seed_admin_prod():
    """Crea el usuario administrador de producción en la base de datos"""
    db: Session = next(get_db())
    
    try:
        # Verificar si ya existe el admin con ese email
        existing_admin = db.query(Usuario).filter(
            Usuario.email == ADMIN_PROD["email"]
        ).first()
        
        if existing_admin:
            print(f"⚠️  Ya existe el usuario administrador: {existing_admin.email}")
            return
        
        # Crear nuevo admin
        password = ADMIN_PROD["password"]
        hashed_password = SecurityService.hash_password(password)
        new_admin = Usuario(
            nombres=ADMIN_PROD["nombres"],
            apellidos=ADMIN_PROD["apellidos"],
            email=ADMIN_PROD["email"],
            codigo_universitario=ADMIN_PROD["codigo_universitario"],
            hashed_password=hashed_password,
            rol=ADMIN_PROD["rol"],
            es_activo=True,
            email_verificado=True
        )
        
        db.add(new_admin)
        db.commit()
        
        print(f"✅ Usuario administrador de producción creado exitosamente")
        print(f"   Email: {ADMIN_PROD['email']}")
        print(f"   Contraseña Temporal: {ADMIN_PROD['password']}")
        print("   ⚠️ RECUERDA CAMBIAR LA CONTRASEÑA LUEGO DE INICIAR SESIÓN")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error al crear usuario administrador: {e}")
        raise
    finally:
        db.close()

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))

    scripts = [
        "init_db.py",      # Crear tablas (sin borrar datos)
        "seed_periods.py", # Periodos académicos
        "seed_courses.py", # Catálogo de cursos
    ]

    print("🌱 Iniciando Seed de PRODUCCIÓN")
    print("   (Solo datos estructurales y Admin oficial. NO incluye silabos ni alumnos)")

    for script in scripts:
        script_full_path = os.path.join(base_dir, script)
        if not run_script(script_full_path):
            print("\n🚨 Seed interrumpido por errores.")
            sys.exit(1)

    print(f"\n{'='*50}")
    print("  Creando Admin de Producción...")
    print(f"{'='*50}")
    seed_admin_prod()

    print("\n" + "="*50)
    print("  ✅ Seed de producción completado exitosamente.")
    print("="*50)

if __name__ == "__main__":
    main()
