from fastapi import APIRouter, Depends, Request, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional

from app.database.connection import get_db
from app.core.security import AuthService, SecurityService
from app.api.dependencies import get_current_user, get_current_active_user
from app.schemas.auth import (
    UsuarioRegistro, UsuarioLogin, TokenResponse, 
    RefreshTokenRequest, ChangePasswordRequest, ApiResponse,
    UsuarioResponse
)
from app.database.models import Usuario

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
        sesion.fecha_cierre = datetime.utcnow()
        
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