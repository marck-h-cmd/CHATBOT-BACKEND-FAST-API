from app.database.connection import SessionLocal
from app.database.models import Silabo, EstadoVerificacion, ContextoCursoUsuario, OrigenContexto

db = SessionLocal()
try:
    id_silabo = 26
    silabo = db.query(Silabo).filter(Silabo.id_silabo == id_silabo).first()
    if silabo:
        print(f"Original state: {silabo.estado_validacion}")
        silabo.estado_validacion = EstadoVerificacion.APROBADO
        
        contextos = db.query(ContextoCursoUsuario).filter(
            ContextoCursoUsuario.id_curso == silabo.id_curso,
            ContextoCursoUsuario.id_periodo == silabo.id_periodo
        ).all()
        
        for ctx in contextos:
            ctx.id_silabo_asignado = silabo.id_silabo
            ctx.estado_verificacion = EstadoVerificacion.OFICIAL
            
        db.commit()
        db.refresh(silabo)
        print(f"New state: {silabo.estado_validacion}")
    else:
        print("Silabo not found")
finally:
    db.close()
