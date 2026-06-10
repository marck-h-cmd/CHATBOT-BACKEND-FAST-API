from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.api.dependencies import get_current_active_user
from app.database.models import Usuario, SugerenciaEstudio, EstadoSugerencia
from typing import List, Dict, Any
from datetime import datetime, timedelta

router = APIRouter(prefix="/sugerencias", tags=["Sugerencias de Estudio"])

@router.get("", response_model=List[Dict[str, Any]])
async def get_sugerencias(
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    sugerencias = db.query(SugerenciaEstudio).filter(
        SugerenciaEstudio.id_usuario == current_user.id
    ).order_by(SugerenciaEstudio.fecha_generacion.desc()).all()
    
    # Auto-expirar sugerencias > 24h si siguen pendientes
    now = datetime.now()
    updated = False
    for s in sugerencias:
        if s.estado == EstadoSugerencia.PENDIENTE and s.fecha_generacion:
            if now - s.fecha_generacion > timedelta(hours=24):
                s.estado = EstadoSugerencia.EXPIRADA
                updated = True
                
    if updated:
        db.commit()
    
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
    fecha_programada: str = None,
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
    
    # Manejar notificaciones programadas
    from app.database.models import NotificacionProgramada, EstadoNotificacion
    
    # Cancelar cualquier notificación pendiente para esta sugerencia
    db.query(NotificacionProgramada).filter(
        NotificacionProgramada.id_sugerencia == id_sugerencia,
        NotificacionProgramada.estado == EstadoNotificacion.PENDIENTE
    ).update({NotificacionProgramada.estado: EstadoNotificacion.CANCELADA}, synchronize_session=False)
    db.commit()
    
    # Programar notificación si es ACEPTADA
    if nuevo_estado == EstadoSugerencia.ACEPTADA:
        from app.services.notificacion_service import NotificacionService
        from datetime import datetime
        if not fecha_programada:
            raise HTTPException(status_code=400, detail="fecha_programada es requerida para aceptar la sugerencia")
        try:
            # Reemplazar Z por +00:00 para asegurar parseo correcto en python
            fecha_dt = datetime.fromisoformat(fecha_programada.replace('Z', '+00:00'))
        except ValueError:
            raise HTTPException(status_code=400, detail="Formato de fecha inválido")
            
        NotificacionService.programar_recordatorio(db, id_sugerencia, fecha_dt)
    
    return {"message": "Estado actualizado", "estado": sugerencia.estado}
