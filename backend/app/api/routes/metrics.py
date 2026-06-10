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

@router.get("/my-activity")
async def get_my_activity(
    current_user: Usuario = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Obtiene la actividad semanal de consultas al asistente del usuario actual"""
    import datetime
    from sqlalchemy import func
    from app.database.models import MensajeChat, SesionChat
    
    # Obtener los últimos 7 días (incluyendo hoy)
    hoy = datetime.date.today()
    dias = []
    # Generar los últimos 7 días terminando hoy
    for i in range(6, -1, -1):
        dia = hoy - datetime.timedelta(days=i)
        dias.append(dia)
        
    actividad_por_dia = {}
    trad = {
        "Mon": "Lun", "Tue": "Mar", "Wed": "Mie", 
        "Thu": "Jue", "Fri": "Vie", "Sat": "Sab", "Sun": "Dom"
    }
    for d in dias:
        name_eng = d.strftime("%a")
        name_esp = trad.get(name_eng, name_eng)
        actividad_por_dia[d] = {"name": name_esp, "actividad": 0}
        
    # Obtener el inicio del rango (hace 6 días a las 00:00)
    inicio = datetime.datetime.combine(dias[0], datetime.time.min)
    
    # Hacer el query
    mensajes = db.query(
        func.date(MensajeChat.fecha_envio).label("fecha"),
        func.count(MensajeChat.id_mensaje).label("cantidad")
    ).join(SesionChat).filter(
        SesionChat.id_usuario == current_user.id,
        MensajeChat.remitente == "usuario",
        MensajeChat.fecha_envio >= inicio
    ).group_by(func.date(MensajeChat.fecha_envio)).all()
    
    for m in mensajes:
        if not m.fecha:
            continue
            
        if isinstance(m.fecha, str):
            try:
                # SQLite returns date as string, e.g. "2026-06-10"
                f_date = datetime.datetime.strptime(m.fecha.split()[0], "%Y-%m-%d").date()
            except Exception:
                continue
        elif isinstance(m.fecha, datetime.date):
            f_date = m.fecha
        elif isinstance(m.fecha, datetime.datetime):
            f_date = m.fecha.date()
        else:
            continue
            
        if f_date in actividad_por_dia:
            actividad_por_dia[f_date]["actividad"] = m.cantidad
            
    return [actividad_por_dia[d] for d in dias]

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