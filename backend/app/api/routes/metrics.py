from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.services.dashboard_service import DashboardService
from app.api.dependencies import get_current_active_user
from app.database.models import Usuario, RolUsuario

router = APIRouter(prefix="/metrics", tags=["Dashboard & Métricas"])

def check_admin(user: Usuario):
    if user.rol != RolUsuario.ADMIN:
        raise HTTPException(status_code=403, detail="Acceso exclusivo para administradores")

@router.get("/dashboard")
async def get_dashboard_summary(
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    check_admin(current_user)
    return DashboardService.get_resumen_operativo(db)

@router.get("/tickets")
async def get_ticket_metrics(
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    check_admin(current_user)
    return DashboardService.get_gestion_tickets(db)

@router.get("/riesgo")
async def get_risk_metrics(
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    check_admin(current_user)
    return DashboardService.get_riesgo_academico(db)

@router.get("/mejora-continua")
async def get_improvement_metrics(
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    check_admin(current_user)
    return DashboardService.get_mejora_continua(db)

@router.get("/conocimiento")
async def get_knowledge_metrics(
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    check_admin(current_user)
    return DashboardService.get_conocimiento_silabos(db)