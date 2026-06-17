from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
import math

from app.database.connection import get_db
from app.api.dependencies import get_current_admin
from app.database.models import Usuario

router = APIRouter(prefix="/users", tags=["Usuarios"])

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
