from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database.connection import get_db
from app.services.chat_handler import ChatHandler
from app.api.dependencies import get_current_active_user
from app.database.models import Usuario, ContextoCursoUsuario

router = APIRouter(prefix="/chat", tags=["Chat & Service Desk"])

class ChatRequest(BaseModel):
    id_contexto: int
    pregunta: str

class ChatResponse(BaseModel):
    respuesta: str
    intent: str
    fragmentos_usados: int
    tiempo_ms: int
    escalado: bool

@router.post("/consultar", response_model=ChatResponse)
async def consultar_chat(
    request: ChatRequest,
    current_user: Usuario = Depends(get_current_active_user),
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
        pregunta=request.pregunta
    )
    
    return ChatResponse(**resultado)