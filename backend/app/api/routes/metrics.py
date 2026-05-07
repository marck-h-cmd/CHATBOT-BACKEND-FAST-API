from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.services.itil_desk import ITILServiceDesk

router = APIRouter(prefix="/metrics", tags=["Metrics"])

@router.get("/service-desk")
async def obtener_metricas(db: Session = Depends(get_db)):
    """Obtiene métricas del Service Desk ITIL"""
    metricas = ITILServiceDesk.obtener_metricas(db)
    return metricas

@router.get("/health")
async def health():
    return {"status": "operational", "service": "ITIL Service Desk Metrics"}