from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.services.dashboard_service import DashboardService
from app.api.dependencies import get_current_user_from_token
from app.database.models import Usuario, RolUsuario

router = APIRouter(prefix="/metrics", tags=["Dashboard & Métricas"])

def check_admin(user: Usuario):
    try:
        rol_value = user.rol.value if hasattr(user.rol, "value") else str(user.rol)
    except Exception:
        rol_value = str(user.rol)
    
    rol_clean = str(rol_value).split(".")[-1].upper()
    if rol_clean not in ["ADMIN", "DOCENTE"]:
        raise HTTPException(status_code=403, detail="Acceso exclusivo para administradores")

@router.get("/debug")
async def debug_endpoint(current_user: Usuario = Depends(get_current_user_from_token)):
    """Debug endpoint to check authentication"""
    return {
        "user_id": current_user.id,
        "email": current_user.email,
        "rol": str(current_user.rol),
        "es_activo": current_user.es_activo
    }

@router.get("/dashboard")
async def get_dashboard_summary(
    current_user: Usuario = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    check_admin(current_user)
    return DashboardService.get_resumen_operativo(db)

@router.get("/tickets")
async def get_ticket_metrics(
    current_user: Usuario = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    check_admin(current_user)
    return DashboardService.get_gestion_tickets(db)

@router.get("/riesgo")
async def get_risk_metrics(
    current_user: Usuario = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    check_admin(current_user)
    return DashboardService.get_riesgo_academico(db)

@router.get("/mejora-continua")
async def get_improvement_metrics(
    current_user: Usuario = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    check_admin(current_user)
    return DashboardService.get_mejora_continua(db)

@router.get("/conocimiento")
async def get_knowledge_metrics(
    current_user: Usuario = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    check_admin(current_user)
    return DashboardService.get_conocimiento_silabos(db)