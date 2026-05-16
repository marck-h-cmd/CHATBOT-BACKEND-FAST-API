from app.database.connection import SessionLocal
from app.database.models import Silabo, EstadoVerificacion, AmbitoUso, ContextoCursoUsuario, OrigenContexto

db = SessionLocal()
try:
    id_silabo = 27
    silabo = db.query(Silabo).filter(Silabo.id_silabo == id_silabo).first()
    if silabo:
        print(f"Fixing Silabo {id_silabo}...")
        silabo.estado_validacion = EstadoVerificacion.APROBADO
        silabo.ambito_uso = AmbitoUso.PUBLICADO
        
        # Sincronizar todos los contextos que tengan este silabo asignado
        # O que pertenezcan al mismo curso/periodo
        contextos = db.query(ContextoCursoUsuario).filter(
            ContextoCursoUsuario.id_curso == silabo.id_curso,
            ContextoCursoUsuario.id_periodo == silabo.id_periodo
        ).all()
        
        print(f"Found {len(contextos)} contexts to update.")
        for ctx in contextos:
            ctx.id_silabo_asignado = silabo.id_silabo
            ctx.estado_verificacion = EstadoVerificacion.OFICIAL
            ctx.origen_contexto = OrigenContexto.OFICIAL
            print(f"Updated context {ctx.id_contexto} for user {ctx.id_usuario}")
            
        db.commit()
        print("Success!")
    else:
        print("Silabo 27 not found")
finally:
    db.close()
