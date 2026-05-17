from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.api.dependencies import get_current_active_user
from app.database.models import Usuario, SugerenciaEstudio, EstadoSugerencia
from typing import List, Dict, Any

router = APIRouter(prefix="/sugerencias", tags=["Sugerencias de Estudio"])

@router.get("/", response_model=List[Dict[str, Any]])
async def get_sugerencias(
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    sugerencias = db.query(SugerenciaEstudio).filter(
        SugerenciaEstudio.id_usuario == current_user.id
    ).order_by(SugerenciaEstudio.fecha_generacion.desc()).all()
    
    return [
        {
            "id_sugerencia": s.id_sugerencia,
            "id_contexto": s.id_contexto,
            "tipo_sugerencia": s.tipo_sugerencia,
            "tema_o_evidencia": s.tema_o_evidencia,
            "horas_sugeridas": s.horas_sugeridas,
            "distribucion_sugerida": s.distribucion_sugerida,
            "justificacion": s.justificacion,
            "prioridad": s.prioridad,
            "estado": s.estado,
            "fecha_generacion": s.fecha_generacion.isoformat() if s.fecha_generacion else None
        }
        for s in sugerencias
    ]

@router.put("/{id_sugerencia}/estado")
async def update_sugerencia_estado(
    id_sugerencia: int,
    estado: str,
    dias_antes: int = 1,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    try:
        nuevo_estado = EstadoSugerencia(estado)
    except ValueError:
        raise HTTPException(status_code=400, detail="Estado inválido")
        
    sugerencia = db.query(SugerenciaEstudio).filter(
        SugerenciaEstudio.id_sugerencia == id_sugerencia,
        SugerenciaEstudio.id_usuario == current_user.id
    ).first()
    
    if not sugerencia:
        raise HTTPException(status_code=404, detail="Sugerencia no encontrada")
        
    sugerencia.estado = nuevo_estado
    db.commit()
    
    # Programar notificación si es ACEPTADA
    if nuevo_estado == EstadoSugerencia.ACEPTADA:
        from app.services.notificacion_service import NotificacionService
        NotificacionService.programar_recordatorio(db, id_sugerencia, dias_antes)
    
    return {"message": "Estado actualizado", "estado": sugerencia.estado}
