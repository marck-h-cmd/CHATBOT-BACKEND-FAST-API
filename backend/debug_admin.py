import sys
sys.path.insert(0, '/backend')

from app.database.connection import SessionLocal
from app.database.models import Usuario, RolUsuario

db = SessionLocal()

# Get admin user
admin = db.query(Usuario).filter(Usuario.email == "admin@unitru.edu.pe").first()

if admin:
    print(f"Admin encontrado:")
    print(f"  ID: {admin.id}")
    print(f"  Email: {admin.email}")
    print(f"  Rol: {admin.rol}")
    print(f"  Rol type: {type(admin.rol)}")
    print(f"  Rol value: {admin.rol.value if hasattr(admin.rol, 'value') else str(admin.rol)}")
    print(f"  Es activo: {admin.es_activo}")
    print(f"  Rol == RolUsuario.ADMIN: {admin.rol == RolUsuario.ADMIN}")
    print(f"\nRolUsuario enum values:")
    for rol in RolUsuario:
        print(f"  {rol.name} = {rol.value}")
else:
    print("Admin NO encontrado en la base de datos")

# List all users
print("\n\nTodos los usuarios:")
users = db.query(Usuario).all()
for u in users:
    print(f"  {u.email} - {u.rol}")

db.close()
