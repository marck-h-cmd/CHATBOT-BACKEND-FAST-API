from app.database.connection import SessionLocal
from app.database.models import Silabo, EstadoVerificacion

db = SessionLocal()
try:
    pendientes = db.query(Silabo).filter(Silabo.estado_validacion == EstadoVerificacion.PENDIENTE_CONFIRMACION).all()
    print(f"Total pendientes: {len(pendientes)}")
    for s in pendientes:
        print(f"ID: {s.id_silabo}, Curso: {s.curso.nombre_curso}, Estado: {s.estado_validacion}")
    
    aprobados = db.query(Silabo).filter(Silabo.estado_validacion == EstadoVerificacion.APROBADO).all()
    print(f"\nTotal aprobados: {len(aprobados)}")
    for s in aprobados:
        print(f"ID: {s.id_silabo}, Curso: {s.curso.nombre_curso}, Estado: {s.estado_validacion}")
finally:
    db.close()
