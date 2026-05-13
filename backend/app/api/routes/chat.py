from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List, Any, cast
import datetime
from app.database.connection import get_db
from app.services.chat_handler import ChatHandler
from app.api.dependencies import get_current_active_user, get_current_estudiante
from app.database.models import Usuario, Silabo, SilaboUsuario, SesionChat

router = APIRouter(prefix="/chat", tags=["Chat"])


class ChatRequest(BaseModel):
    id_silabo: int
    pregunta: str


class ChatResponse(BaseModel):
    respuesta: str
    intent: str
    fragmentos_usados: int
    tiempo_ms: int
    escalado: bool
    id_solicitud: int


@router.post("/consultar", response_model=ChatResponse)
async def consultar_chat(
    request: ChatRequest,
    current_user: Usuario = Depends(get_current_estudiante),
    db: Session = Depends(get_db)
):
    """Procesa una consulta del usuario autenticado"""
    
    if not request.pregunta.strip():
        raise HTTPException(400, "La pregunta no puede estar vacía")
    
    # Verificar que el sílabo pertenece al usuario o es oficial
    silabo = db.query(Silabo).filter(Silabo.id == request.id_silabo).first()
    
    if not silabo:
        raise HTTPException(404, "Sílabo no encontrado")
    
    # Verificar acceso
    if silabo.es_oficial is True:
        # Sílabo oficial, todos pueden acceder
        pass
    else:
        # Sílabo subido por usuario, verificar propiedad
        silabo_usuario = db.query(SilaboUsuario).filter(
            SilaboUsuario.id_silabo == request.id_silabo,
            SilaboUsuario.id_usuario == current_user.id
        ).first()
        
        if not silabo_usuario:
            raise HTTPException(403, "No tienes acceso a este sílabo")
    
    resultado = ChatHandler.procesar_consulta(
        db=db,
        id_usuario=str(current_user.id),
        id_silabo=request.id_silabo,
        pregunta=request.pregunta
    )
    
    return ChatResponse(**resultado)


@router.get("/silabos")
async def get_mis_silabos(
    current_user: Usuario = Depends(get_current_estudiante),
    db: Session = Depends(get_db)
):
    """Obtiene los sílabos a los que tiene acceso el usuario"""
    
    # Sílabos oficiales
    silabos_oficiales = db.query(Silabo).filter(Silabo.es_oficial == True).all()
    
    # Sílabos subidos por el usuario
    silabos_usuario = db.query(Silabo).join(
        SilaboUsuario, SilaboUsuario.id_silabo == Silabo.id
    ).filter(
        SilaboUsuario.id_usuario == current_user.id
    ).all()
    
    return {
        "oficiales": [{"id": s.id, "nombre": s.nombre_archivo, "oficial": True} for s in silabos_oficiales],
        "mis_silabos": [{"id": s.id, "nombre": s.nombre_archivo, "oficial": False} for s in silabos_usuario]
    }


# CRUD para SesionChat

def _to_bool(value: Any) -> bool:
    return bool(cast(bool, value))


def _iso_or_none(value: Any) -> Optional[str]:
    datetime_value = cast(Optional[datetime.datetime], value)
    return datetime_value.isoformat() if datetime_value else None


def _format_sesion(sesion: SesionChat) -> dict:
    return {
        "id": cast(int, sesion.id),
        "id_usuario": cast(int, sesion.id_usuario),
        "id_silabo": cast(Optional[int], sesion.id_silabo),
        "titulo": cast(Optional[str], sesion.titulo),
        "fecha_inicio": _iso_or_none(sesion.fecha_inicio),
        "fecha_fin": _iso_or_none(sesion.fecha_fin),
        "activa": _to_bool(sesion.activa)
    }


class SesionChatCreate(BaseModel):
    id_silabo: Optional[int] = None
    titulo: Optional[str] = None


class SesionChatUpdate(BaseModel):
    titulo: Optional[str] = None
    activa: Optional[bool] = None


def _get_sesion(db: Session, id_sesion: int) -> SesionChat:
    sesion = db.query(SesionChat).filter(SesionChat.id == id_sesion).first()
    if not sesion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sesión no encontrada")
    return sesion


def _can_access_sesion(db: Session, sesion: SesionChat, current_user: Usuario) -> bool:
    return cast(int, sesion.id_usuario) == cast(int, current_user.id)


@router.get("/sessions", response_model=List[dict])
async def listar_sesiones(
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Lista sesiones de chat del usuario"""
    sesiones = db.query(SesionChat).filter(SesionChat.id_usuario == cast(int, current_user.id)).all()
    return [_format_sesion(s) for s in sesiones]


@router.get("/sessions/{id_sesion}")
async def obtener_sesion(
    id_sesion: int,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    sesion = _get_sesion(db, id_sesion)
    if not _can_access_sesion(db, sesion, current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes acceso a esta sesión")
    return _format_sesion(sesion)


@router.post("/sessions")
async def crear_sesion(
    sesion_data: SesionChatCreate,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    sesion = SesionChat(
        id_usuario=cast(int, current_user.id),
        fecha_inicio=datetime.datetime.utcnow(),
        activa=True,
        **sesion_data.dict()
    )
    db.add(sesion)
    db.commit()
    db.refresh(sesion)
    return _format_sesion(sesion)


@router.put("/sessions/{id_sesion}")
async def actualizar_sesion(
    id_sesion: int,
    sesion_data: SesionChatUpdate,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    sesion = _get_sesion(db, id_sesion)
    if not _can_access_sesion(db, sesion, current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permisos para actualizar esta sesión")

    update_data = sesion_data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(sesion, key, value)
    db.commit()
    db.refresh(sesion)
    return _format_sesion(sesion)


@router.delete("/sessions/{id_sesion}")
async def eliminar_sesion(
    id_sesion: int,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    sesion = _get_sesion(db, id_sesion)
    if not _can_access_sesion(db, sesion, current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permisos para eliminar esta sesión")

    db.delete(sesion)
    db.commit()
    return {"message": "Sesión eliminada correctamente"}