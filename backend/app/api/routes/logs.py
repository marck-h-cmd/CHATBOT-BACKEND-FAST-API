from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List, Any, cast
import datetime
from app.database.connection import get_db
from app.database.models import Usuario, LogIngestion
from app.api.dependencies import get_current_active_user

router = APIRouter(prefix="/logs", tags=["Logs"])


def _to_bool(value: Any) -> bool:
    return bool(cast(bool, value))


def _iso_or_none(value: Any) -> Optional[str]:
    datetime_value = cast(Optional[datetime.datetime], value)
    return datetime_value.isoformat() if datetime_value else None


def _format_log(log: LogIngestion) -> dict:
    return {
        "id": cast(int, log.id),
        "id_silabo": cast(Optional[int], log.id_silabo),
        "id_usuario": cast(Optional[int], log.id_usuario),
        "exito": _to_bool(log.exito),
        "error_mensaje": cast(Optional[str], log.error_mensaje),
        "parsing_detected": cast(Optional[Any], log.parsing_detected),
        "fecha": _iso_or_none(log.fecha)
    }


class LogIngestionCreate(BaseModel):
    id_silabo: Optional[int] = None
    id_usuario: Optional[int] = None
    exito: bool
    error_mensaje: Optional[str] = None
    parsing_detected: Optional[Any] = None


class LogIngestionUpdate(BaseModel):
    exito: Optional[bool] = None
    error_mensaje: Optional[str] = None
    parsing_detected: Optional[Any] = None


def _get_log(db: Session, id_log: int) -> LogIngestion:
    log = db.query(LogIngestion).filter(LogIngestion.id == id_log).first()
    if not log:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Log no encontrado")
    return log


def _is_admin_or_docente(current_user: Usuario) -> bool:
    try:
        rol_value = current_user.rol.value if hasattr(current_user.rol, "value") else str(current_user.rol)
    except Exception:
        rol_value = str(current_user.rol)
    return rol_value.upper() in ["ADMIN", "DOCENTE"]


# CRUD para LogIngestion

@router.get("/", response_model=List[dict])
async def listar_logs(
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Lista logs de ingestion (solo admin/docente)"""
    if not _is_admin_or_docente(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permisos para ver logs")

    logs = db.query(LogIngestion).all()
    return [_format_log(l) for l in logs]


@router.get("/{id_log}")
async def obtener_log(
    id_log: int,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if not _is_admin_or_docente(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permisos para ver logs")

    log = _get_log(db, id_log)
    return _format_log(log)


@router.post("/")
async def crear_log(
    log_data: LogIngestionCreate,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if not _is_admin_or_docente(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permisos para crear logs")

    log = LogIngestion(**log_data.dict())
    db.add(log)
    db.commit()
    db.refresh(log)
    return _format_log(log)


@router.put("/{id_log}")
async def actualizar_log(
    id_log: int,
    log_data: LogIngestionUpdate,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if not _is_admin_or_docente(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permisos para actualizar logs")

    log = _get_log(db, id_log)
    update_data = log_data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(log, key, value)
    db.commit()
    db.refresh(log)
    return _format_log(log)


@router.delete("/{id_log}")
async def eliminar_log(
    id_log: int,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if not _is_admin_or_docente(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permisos para eliminar logs")

    log = _get_log(db, id_log)
    db.delete(log)
    db.commit()
    return {"message": "Log eliminado correctamente"}