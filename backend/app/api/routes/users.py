from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from pydantic import BaseModel
from typing import List, Optional
import math

from app.database.connection import get_db
from app.api.dependencies import get_current_admin
from app.database.models import Usuario, RolUsuario

router = APIRouter(prefix="/users", tags=["Usuarios"])

class UserStatusUpdate(BaseModel):
    es_activo: bool


@router.get("/")
async def get_users(
    search: Optional[str] = None,
    estado: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_admin: Usuario = Depends(get_current_admin)
):
    """Obtiene la lista de usuarios. Solo para administradores."""
    query = db.query(Usuario)
    
    # Búsqueda dinámica
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Usuario.nombres.ilike(search_term),
                Usuario.apellidos.ilike(search_term),
                Usuario.email.ilike(search_term),
                Usuario.codigo_universitario.ilike(search_term)
            )
        )
    
    # Filtro por estado
    if estado:
        if estado.upper() == "ACTIVO":
            query = query.filter(Usuario.es_activo == True)
        elif estado.upper() == "INACTIVO":
            query = query.filter(Usuario.es_activo == False)

    # Ordenar por fecha de registro descendente
    query = query.order_by(Usuario.fecha_registro.desc())
    
    total = query.count()
    users = query.offset(skip).limit(limit).all()
    
    # Serializar resultados
    return {
        "success": True,
        "message": "Usuarios recuperados exitosamente",
        "data": {
            "total": total,
            "skip": skip,
            "limit": limit,
            "total_pages": math.ceil(total / limit) if limit > 0 else 0,
            "users": [user.to_dict() for user in users]
        }
    }

@router.patch("/{user_id}/status")
async def update_user_status(
    user_id: int,
    status_data: UserStatusUpdate,
    db: Session = Depends(get_db),
    current_admin: Usuario = Depends(get_current_admin)
):
    """Cambia el estado activo/inactivo de un usuario estudiante. Solo para administradores."""
    # Buscar el usuario
    user = db.query(Usuario).filter(Usuario.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )
    
    # Validar que sea un estudiante
    if user.rol != RolUsuario.ESTUDIANTE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Solo se puede cambiar el estado de usuarios con rol ESTUDIANTE"
        )
        
    # Actualizar estado
    user.es_activo = status_data.es_activo
    db.commit()
    db.refresh(user)
    
    return {
        "success": True,
        "message": f"Estado del estudiante actualizado a {'activo' if user.es_activo else 'inactivo'}",
        "data": user.to_dict()
    }

