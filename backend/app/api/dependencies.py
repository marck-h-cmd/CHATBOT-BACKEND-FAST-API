from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

from app.database.connection import get_db
from app.core.security import SecurityService
from app.database.models import Usuario, MensajeChat, SesionChat

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

async def get_current_admin(
    current_user: Usuario = Depends(get_current_active_user)
) -> Usuario:
    """Dependencia para verificar que sea administrador"""
    try:
        rol_value = current_user.rol.value if hasattr(current_user.rol, "value") else str(current_user.rol)
    except Exception:
        rol_value = str(current_user.rol)
    rol_clean = str(rol_value).split(".")[-1].upper()
    if rol_clean != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado. Se requiere rol de administrador"
        )
    return current_user

async def check_chat_rate_limit(
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Usuario:
    """Dependencia para verificar el límite de mensajes en el chat (configurable por env)"""
    from datetime import timedelta
    from app.config import Config
    
    now = datetime.now()
    three_hours_ago = now - timedelta(hours=3)
    twenty_four_hours_ago = now - timedelta(hours=24)
    
    limit_24h = Config.CHAT_RATE_LIMIT_24H
    limit_3h = Config.CHAT_RATE_LIMIT_3H
    
    # 1. Límite de 24 horas
    count_24h = db.query(MensajeChat).join(SesionChat).filter(
        SesionChat.id_usuario == current_user.id,
        MensajeChat.remitente == "usuario",
        MensajeChat.fecha_envio >= twenty_four_hours_ago
    ).count()

    if count_24h >= limit_24h:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Has superado el límite diario de {limit_24h} mensajes. Podrás seguir conversando mañana."
        )

    # 2. Límite de 3 horas
    count_3h = db.query(MensajeChat).join(SesionChat).filter(
        SesionChat.id_usuario == current_user.id,
        MensajeChat.remitente == "usuario",
        MensajeChat.fecha_envio >= three_hours_ago
    ).count()

    if count_3h >= limit_3h:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Has superado el límite de {limit_3h} mensajes por cada 3 horas. Por favor, intenta más tarde."
        )

    return current_user