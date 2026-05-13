from fastapi import APIRouter, Depends, Request, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional, Any, cast, List
import datetime
from pydantic import BaseModel
from app.database.connection import get_db
from app.core.security import AuthService, SecurityService
from app.api.dependencies import get_current_user, get_current_active_user
from app.schemas.auth import (
    UsuarioRegistro, UsuarioLogin, TokenResponse, 
    RefreshTokenRequest, ChangePasswordRequest, ApiResponse,
    UsuarioResponse
)
from app.database.models import Usuario, SesionUsuario, TokenBlacklist

router = APIRouter(prefix="/auth", tags=["Autenticación"])


@router.post("/registro", response_model=ApiResponse)
async def registrar_usuario(
    user_data: UsuarioRegistro,
    request: Request,
    db: Session = Depends(get_db)
):
    """Registra un nuevo usuario con email @unitru.edu.pe"""
    
    usuario = AuthService.registrar_usuario(
        db=db,
        codigo_universitario=user_data.codigo_universitario,
        email=user_data.email,
        nombres=user_data.nombres,
        apellidos=user_data.apellidos,
        password=user_data.password
    )
    
    return ApiResponse(
        success=True,
        message="Usuario registrado correctamente",
        data={"usuario": usuario.to_dict()}
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    credentials: UsuarioLogin,
    request: Request,
    db: Session = Depends(get_db)
):
    """Inicia sesión y devuelve tokens JWT"""
    
    # Obtener IP y User-Agent
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    
    result = AuthService.login(
        db=db,
        email=credentials.email,
        password=credentials.password,
        ip_address=ip_address,
        user_agent=user_agent
    )
    
    return TokenResponse(**result)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    refresh_data: RefreshTokenRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """Renueva el token de acceso"""
    
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    
    result = AuthService.refresh_token(
        db=db,
        refresh_token=refresh_data.refresh_token,
        ip_address=ip_address,
        user_agent=user_agent
    )
    
    return TokenResponse(**result)


@router.post("/logout", response_model=ApiResponse)
async def logout(
    request: Request,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Cierra la sesión actual"""
    
    # Obtener token del header
    auth_header = request.headers.get("authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token no proporcionado"
        )
    
    token = auth_header.replace("Bearer ", "")
    
    # También obtener refresh_token del body si existe
    refresh_token = None
    try:
        body = await request.json()
        refresh_token = body.get("refresh_token")
    except:
        pass
    
    AuthService.logout(db, token, refresh_token)
    
    return ApiResponse(
        success=True,
        message="Sesión cerrada correctamente"
    )


@router.post("/cambiar-password", response_model=ApiResponse)
async def cambiar_password(
    password_data: ChangePasswordRequest,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Cambia la contraseña del usuario autenticado"""
    
    AuthService.cambiar_password(
        db=db,
        usuario=current_user,
        current_password=password_data.current_password,
        new_password=password_data.new_password
    )
    
    return ApiResponse(
        success=True,
        message="Contraseña actualizada correctamente"
    )


@router.get("/me", response_model=UsuarioResponse)
async def get_current_user_info(
    current_user: Usuario = Depends(get_current_active_user)
):
    """Obtiene la información del usuario autenticado"""
    return UsuarioResponse.model_validate(current_user)


@router.get("/sesiones", response_model=ApiResponse)
async def get_sesiones_activas(
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Obtiene las sesiones activas del usuario"""
    
    from app.database.models import SesionUsuario
    
    sesiones = db.query(SesionUsuario).filter(
        SesionUsuario.id_usuario == current_user.id,
        SesionUsuario.es_activa == True
    ).all()
    
    return ApiResponse(
        success=True,
        message="Sesiones activas",
        data={
            "total": len(sesiones),
            "sesiones": [
                {
                    "id": s.id,
                    "fecha_inicio": s.fecha_inicio.isoformat(),
                    "fecha_expiracion": s.fecha_expiracion.isoformat(),
                    "ip_address": s.ip_address,
                    "user_agent": s.user_agent
                }
                for s in sesiones
            ]
        }
    )


@router.post("/cerrar-todas-sesiones", response_model=ApiResponse)
async def cerrar_todas_sesiones(
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Cierra todas las sesiones activas del usuario (excepto la actual)"""
    
    from app.database.models import SesionUsuario, TokenBlacklist
    from app.core.security import SecurityService
    
    # Obtener token actual del header (no cerrar esta sesión)
    # Esta funcionalidad se implementará si es necesario
    
    sesiones = db.query(SesionUsuario).filter(
        SesionUsuario.id_usuario == current_user.id,
        SesionUsuario.es_activa == True
    ).all()
    
    cerradas = 0
    for sesion in sesiones:
        sesion.es_activa = False
        sesion.fecha_cierre = datetime.datetime.utcnow()
        
        # Agregar token a blacklist
        blacklist = TokenBlacklist(
            token=sesion.token,
            fecha_expiracion=sesion.fecha_expiracion
        )
        db.add(blacklist)
        cerradas += 1
    
    db.commit()
    
    return ApiResponse(
        success=True,
        message=f"Se cerraron {cerradas} sesiones",
        data={"sesiones_cerradas": cerradas}
    )


# CRUD para SesionUsuario

def _to_bool(value: Any) -> bool:
    return bool(cast(bool, value))


def _iso_or_none(value: Any) -> Optional[str]:
    datetime_value = cast(Optional[datetime.datetime], value)
    return datetime_value.isoformat() if datetime_value else None


def _format_sesion_usuario(sesion: SesionUsuario) -> dict:
    return {
        "id": cast(int, sesion.id),
        "id_usuario": cast(int, sesion.id_usuario),
        "token": cast(str, sesion.token),
        "fecha_inicio": _iso_or_none(sesion.fecha_inicio),
        "fecha_expiracion": _iso_or_none(sesion.fecha_expiracion),
        "fecha_cierre": _iso_or_none(sesion.fecha_cierre),
        "ip_address": cast(Optional[str], sesion.ip_address),
        "user_agent": cast(Optional[str], sesion.user_agent),
        "es_activa": _to_bool(sesion.es_activa)
    }


def _format_token_blacklist(token: TokenBlacklist) -> dict:
    return {
        "id": cast(int, token.id),
        "token": cast(str, token.token),
        "fecha_expiracion": _iso_or_none(token.fecha_expiracion)
    }


class SesionUsuarioUpdate(BaseModel):
    es_activa: Optional[bool] = None


def _get_sesion_usuario(db: Session, id_sesion: int) -> SesionUsuario:
    sesion = db.query(SesionUsuario).filter(SesionUsuario.id == id_sesion).first()
    if not sesion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sesión no encontrada")
    return sesion


def _get_token_blacklist(db: Session, id_token: int) -> TokenBlacklist:
    token = db.query(TokenBlacklist).filter(TokenBlacklist.id == id_token).first()
    if not token:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Token en blacklist no encontrado")
    return token


def _is_admin(current_user: Usuario) -> bool:
    return cast(str, current_user.rol) == "admin"


def _can_access_sesion_usuario(db: Session, sesion: SesionUsuario, current_user: Usuario) -> bool:
    if _is_admin(current_user):
        return True
    return cast(int, sesion.id_usuario) == cast(int, current_user.id)


@router.get("/sessions", response_model=List[dict])
async def listar_sesiones_usuario(
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Lista sesiones de usuario (solo admin ve todas, usuarios ven las suyas)"""
    if _is_admin(current_user):
        sesiones = db.query(SesionUsuario).all()
    else:
        sesiones = db.query(SesionUsuario).filter(SesionUsuario.id_usuario == cast(int, current_user.id)).all()
    return [_format_sesion_usuario(s) for s in sesiones]


@router.get("/sessions/{id_sesion}")
async def obtener_sesion_usuario(
    id_sesion: int,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    sesion = _get_sesion_usuario(db, id_sesion)
    if not _can_access_sesion_usuario(db, sesion, current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes acceso a esta sesión")
    return _format_sesion_usuario(sesion)


@router.put("/sessions/{id_sesion}")
async def actualizar_sesion_usuario(
    id_sesion: int,
    sesion_data: SesionUsuarioUpdate,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    sesion = _get_sesion_usuario(db, id_sesion)
    if not _can_access_sesion_usuario(db, sesion, current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permisos para actualizar esta sesión")

    update_data = sesion_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(sesion, key, value)
    db.commit()
    db.refresh(sesion)
    return _format_sesion_usuario(sesion)


@router.delete("/sessions/{id_sesion}")
async def eliminar_sesion_usuario(
    id_sesion: int,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if not _is_admin(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo administradores pueden eliminar sesiones")

    sesion = _get_sesion_usuario(db, id_sesion)
    db.delete(sesion)
    db.commit()
    return {"message": "Sesión eliminada correctamente"}


# CRUD para TokenBlacklist

@router.get("/blacklist", response_model=List[dict])
async def listar_tokens_blacklist(
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Lista tokens en blacklist (solo admin)"""
    if not _is_admin(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo administradores pueden ver la blacklist")

    tokens = db.query(TokenBlacklist).all()
    return [_format_token_blacklist(t) for t in tokens]


@router.get("/blacklist/{id_token}")
async def obtener_token_blacklist(
    id_token: int,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if not _is_admin(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo administradores pueden ver tokens en blacklist")

    token = _get_token_blacklist(db, id_token)
    return _format_token_blacklist(token)


@router.delete("/blacklist/{id_token}")
async def eliminar_token_blacklist(
    id_token: int,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if not _is_admin(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo administradores pueden eliminar tokens de blacklist")

    token = _get_token_blacklist(db, id_token)
    db.delete(token)
    db.commit()
    return {"message": "Token eliminado de blacklist correctamente"}
