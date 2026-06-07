from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database.connection import get_db
from app.services.chat_handler import ChatHandler
from app.api.dependencies import get_current_active_user, check_chat_rate_limit
from app.database.models import Usuario, ContextoCursoUsuario

router = APIRouter(prefix="/chat", tags=["Chat & Service Desk"])

from typing import List, Dict, Optional

class ChatRequest(BaseModel):
    id_contexto: int
    pregunta: str
    id_sesion: Optional[int] = None
    historial: Optional[List[Dict[str, str]]] = []

class ChatResponse(BaseModel):
    respuesta: str
    intent: str
    id_sesion: int
    fragmentos_usados: int
    tiempo_ms: int
    escalado: bool
    riesgo: Optional[str] = None
    sugerencia: Optional[Dict] = None

@router.post("/consultar", response_model=ChatResponse)
async def consultar_chat(
    request: ChatRequest,
    current_user: Usuario = Depends(check_chat_rate_limit),
    db: Session = Depends(get_db)
):
    # Verificar que el contexto pertenece al usuario
    contexto = db.query(ContextoCursoUsuario).filter(
        ContextoCursoUsuario.id_contexto == request.id_contexto,
        ContextoCursoUsuario.id_usuario == current_user.id
    ).first()
    
    if not contexto:
        raise HTTPException(status_code=403, detail="No tienes acceso a este curso/contexto")

    resultado = ChatHandler.procesar_consulta(
        db=db,
        id_usuario=current_user.id,
        id_contexto=request.id_contexto,
        pregunta=request.pregunta,
        historial=request.historial,
        id_sesion=request.id_sesion
    )
    
    return ChatResponse(**resultado)

@router.get("/sessions/{id_contexto}")
async def get_sessions(
    id_contexto: int,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    from app.database.models import SesionChat
    sessions = db.query(SesionChat).filter(
        SesionChat.id_contexto == id_contexto,
        SesionChat.id_usuario == current_user.id
    ).order_by(SesionChat.fecha_inicio.desc()).all()
    
    return [
        {
            "id_sesion": s.id_sesion,
            "fecha_inicio": s.fecha_inicio,
            "resumen": s.resumen
        } for s in sessions
    ]

@router.get("/history/{id_sesion}")
async def get_history(
    id_sesion: int,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    from app.database.models import SesionChat, MensajeChat
    
    # Verificar propiedad de la sesión
    sesion = db.query(SesionChat).filter(
        SesionChat.id_sesion == id_sesion,
        SesionChat.id_usuario == current_user.id
    ).first()
    
    if not sesion:
        raise HTTPException(status_code=403, detail="No tienes acceso a esta sesión de chat")
        
    mensajes = db.query(MensajeChat).filter(
        MensajeChat.id_sesion == id_sesion
    ).order_by(MensajeChat.fecha_envio.asc()).all()
    
    return [
        {
            "role": "user" if m.remitente == "usuario" else "assistant",
            "content": m.contenido,
            "intent": m.tipo_consulta,
            "timestamp": m.fecha_envio.isoformat()
        } for m in mensajes
    ]
