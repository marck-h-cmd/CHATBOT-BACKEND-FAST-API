from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.database.connection import get_db
from app.services.chat_handler import ChatHandler

router = APIRouter(prefix="/chat", tags=["Chat"])

class ChatRequest(BaseModel):
    id_usuario: str
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
async def consultar_chat(request: ChatRequest, db: Session = Depends(get_db)):
    """Procesa una consulta del usuario"""
    
    if not request.pregunta.strip():
        raise HTTPException(400, "La pregunta no puede estar vacía")
    
    resultado = ChatHandler.procesar_consulta(
        db=db,
        id_usuario=request.id_usuario,
        id_silabo=request.id_silabo,
        pregunta=request.pregunta
    )
    
    return ChatResponse(**resultado)

@router.get("/health")
async def health_check():
    return {"status": "OK", "service": "Chatbot ITIL 4"}