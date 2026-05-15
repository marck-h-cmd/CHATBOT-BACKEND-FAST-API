from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

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


async def get_current_user_from_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> Usuario:
    """Dependencia para obtener usuario autenticado solo del token JWT (sin validar sesión)"""
    token = credentials.credentials
    
    # Decodificar token
    try:
        payload = SecurityService.decode_token(token)
    except HTTPException as e:
        raise
    
    # Verificar tipo de token
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido para este endpoint",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id: int = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido: usuario no identificado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Obtener usuario (sin verificar sesión en BD)
    user = db.query(Usuario).filter(Usuario.id == user_id, Usuario.es_activo == True).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado o inactivo",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user


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
    try:
        rol_value = current_user.rol.value if hasattr(current_user.rol, "value") else str(current_user.rol)
    except Exception:
        rol_value = str(current_user.rol)
    rol_clean = str(rol_value).split(".")[-1].upper()
    if rol_clean != "ESTUDIANTE":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado. Se requiere rol de estudiante"
        )
    return current_user


async def get_current_docente(
    current_user: Usuario = Depends(get_current_active_user)
) -> Usuario:
    """Dependencia para verificar que sea docente o admin"""
    try:
        rol_value = current_user.rol.value if hasattr(current_user.rol, "value") else str(current_user.rol)
    except Exception:
        rol_value = str(current_user.rol)
    rol_clean = str(rol_value).split(".")[-1].upper()
    if rol_clean not in ["DOCENTE", "ADMIN"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado. Se requiere rol de docente o administrador"
        )
    return current_user