"""
Seeder para crear un usuario administrador
"""

import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.database.models import Usuario, RolUsuario
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ADMIN_USER = {
    "nombres": "Administrador",
    "apellidos": "Sistema",
    "email": "admin@unitru.edu.pe",
    "codigo_universitario": "ADMIN001",
    "password": "admin123",
    "rol": RolUsuario.ADMIN
}

def seed_admin():
    """Crea un usuario administrador en la base de datos"""
    db: Session = next(get_db())
    
    try:
        # Verificar si ya existe un admin
        existing_admin = db.query(Usuario).filter(
            Usuario.rol == RolUsuario.ADMIN
        ).first()
        
        if existing_admin:
            print(f"⚠️  Ya existe un usuario administrador: {existing_admin.email}")
            return
        
        # Crear nuevo admin
        # Truncar contraseña a 72 bytes (límite bcrypt)
        password = ADMIN_USER["password"][:72]
        hashed_password = pwd_context.hash(password)
        new_admin = Usuario(
            nombres=ADMIN_USER["nombres"],
            apellidos=ADMIN_USER["apellidos"],
            email=ADMIN_USER["email"],
            codigo_universitario=ADMIN_USER["codigo_universitario"],
            hashed_password=hashed_password,
            rol=ADMIN_USER["rol"],
            es_activo=True,
            email_verificado=True
        )
        
        db.add(new_admin)
        db.commit()
        
        print(f"✅ Usuario administrador creado exitosamente")
        print(f"   Email: {ADMIN_USER['email']}")
        print(f"   Contraseña: {ADMIN_USER['password']}")
        print(f"   Código: {ADMIN_USER['codigo_universitario']}")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error al crear usuario administrador: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    print("🌱 Iniciando seeder de usuario administrador\n")
    seed_admin()
    print("\n✨ Seeder completado exitosamente")
