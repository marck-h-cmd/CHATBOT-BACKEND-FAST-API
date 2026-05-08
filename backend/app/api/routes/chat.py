from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.database.connection import get_db
from app.services.chat_handler import ChatHandler
from app.api.dependencies import get_current_active_user, get_current_estudiante
from app.database.models import Usuario, Silabo, SilaboUsuario

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
    if silabo.es_oficial:
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