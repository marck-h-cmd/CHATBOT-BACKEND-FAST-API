from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional

from app.database.connection import get_db
from app.core.security import SecurityService
from app.database.models import Usuario

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> Usuario:
    """Dependencia para obtener usuario actual autenticado"""
    return await SecurityService.get_current_user(credentials, db)


async def get_current_active_user(
    current_user: Usuario = Depends(get_current_user)
) -> Usuario:
    """Dependencia para obtener usuario activo"""
    if not current_user.es_activo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usuario inactivo"
        )
    return current_user


async def get_current_estudiante(
    current_user: Usuario = Depends(get_current_active_user)
) -> Usuario:
    """Dependencia para verificar que sea estudiante"""
    if current_user.rol != "estudiante":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado. Se requiere rol de estudiante"
        )
    return current_user


async def get_current_docente(
    current_user: Usuario = Depends(get_current_active_user)
) -> Usuario:
    """Dependencia para verificar que sea docente o admin"""
    if current_user.rol not in ["docente", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado. Se requiere rol de docente o administrador"
        )
    return current_user