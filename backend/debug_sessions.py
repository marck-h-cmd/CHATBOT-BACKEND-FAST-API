import sys
sys.path.insert(0, '/backend')

from app.database.connection import SessionLocal
from app.database.models import SesionUsuario, Usuario
from datetime import datetime

db = SessionLocal()

print("Sesiones en la base de datos:")
sesiones = db.query(SesionUsuario).all()

if sesiones:
    for sesion in sesiones:
        user = db.query(Usuario).filter(Usuario.id == sesion.id_usuario).first()
        print(f"\nSesión ID: {sesion.id}")
        print(f"  Usuario: {user.email if user else 'Unknown'}")
        print(f"  Es activa: {sesion.es_activa}")
        print(f"  Fecha inicio: {sesion.fecha_inicio}")
        print(f"  Fecha expiracion: {sesion.fecha_expiracion}")
        print(f"  Ahora: {datetime.utcnow()}")
        print(f"  Expirada: {sesion.fecha_expiracion < datetime.utcnow()}")
        print(f"  Token length: {len(sesion.token) if sesion.token else 0}")
else:
    print("No hay sesiones en la base de datos")

db.close()
