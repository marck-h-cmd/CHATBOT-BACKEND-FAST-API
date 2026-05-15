from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List, Any, cast
import datetime
from app.database.connection import get_db
from app.database.models import Usuario, SolicitudServicio, IncidenteAcademico, Silabo
from app.api.dependencies import get_current_user_from_token

router = APIRouter(prefix="/services", tags=["Services"])


def _to_bool(value: Any) -> bool:
    return bool(cast(bool, value))


def _iso_or_none(value: Any) -> Optional[str]:
    datetime_value = cast(Optional[datetime.datetime], value)
    return datetime_value.isoformat() if datetime_value else None


def _format_solicitud(solicitud: SolicitudServicio) -> dict:
    return {
        "id": cast(int, solicitud.id_solicitud),
        "id_usuario": cast(int, solicitud.id_usuario),
        "id_silabo": cast(Optional[int], solicitud.id_silabo),
        "categoria": cast(str, solicitud.categoria),
        "descripcion": cast(str, solicitud.descripcion),
        "respuesta_generada": cast(Optional[str], solicitud.respuesta_generada),
        "tiempo_respuesta_ms": cast(Optional[int], solicitud.tiempo_respuesta_ms),
        "fecha": _iso_or_none(solicitud.fecha_creacion),
        "estado": cast(str, solicitud.estado),
        "escalada": _to_bool(solicitud.escalada_a_docente)
    }


def _format_incidente(incidente: IncidenteAcademico) -> dict:
    return {
        "id": cast(int, incidente.id_incidente),
        "id_usuario": cast(int, incidente.id_usuario),
        "id_silabo": cast(Optional[int], incidente.id_silabo),
        "severidad": cast(Optional[str], incidente.severidad),
        "promedio_actual": cast(Optional[float], incidente.promedio_actual),
        "nota_necesaria": cast(Optional[float], incidente.nota_necesaria),
        "recomendacion": cast(Optional[str], incidente.recomendacion),
        "estado": cast(str, incidente.estado),
        "escalada": _to_bool(incidente.escalado_a_tutoria),
        "fecha_creacion": _iso_or_none(incidente.fecha_creacion),
        "fecha_cierre": _iso_or_none(incidente.fecha_cierre)
    }


class SolicitudServicioCreate(BaseModel):
    id_silabo: Optional[int] = None
    tipo: Optional[str] = None
    pregunta: Optional[str] = None
    respuesta: Optional[str] = None
    fragmentos_usados: Optional[Any] = None
    reglas_aplicadas: Optional[Any] = None
    tiempo_respuesta_ms: Optional[int] = None
    estado: Optional[str] = "completada"
    escalada: Optional[bool] = False


class SolicitudServicioUpdate(BaseModel):
    tipo: Optional[str] = None
    pregunta: Optional[str] = None
    respuesta: Optional[str] = None
    fragmentos_usados: Optional[Any] = None
    reglas_aplicadas: Optional[Any] = None
    tiempo_respuesta_ms: Optional[int] = None
    estado: Optional[str] = None
    escalada: Optional[bool] = None


class IncidenteAcademicoCreate(BaseModel):
    id_silabo: Optional[int] = None
    severidad: Optional[str] = None
    promedio_actual: Optional[float] = None
    nota_necesaria: Optional[float] = None
    recomendacion: Optional[str] = None
    notificado: Optional[bool] = False
    resuelto: Optional[bool] = False
    fecha_resolucion: Optional[datetime.datetime] = None


class IncidenteAcademicoUpdate(BaseModel):
    severidad: Optional[str] = None
    promedio_actual: Optional[float] = None
    nota_necesaria: Optional[float] = None
    recomendacion: Optional[str] = None
    notificado: Optional[bool] = None
    resuelto: Optional[bool] = None
    fecha_resolucion: Optional[datetime.datetime] = None


def _get_solicitud(db: Session, id_solicitud: int) -> SolicitudServicio:
    solicitud = db.query(SolicitudServicio).filter(SolicitudServicio.id_solicitud == id_solicitud).first()
    if not solicitud:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Solicitud no encontrada")
    return solicitud


def _get_incidente(db: Session, id_incidente: int) -> IncidenteAcademico:
    incidente = db.query(IncidenteAcademico).filter(IncidenteAcademico.id_incidente == id_incidente).first()
    if not incidente:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incidente no encontrado")
    return incidente


def _is_admin_or_docente(current_user: Usuario) -> bool:
    try:
        rol_value = current_user.rol.value if hasattr(current_user.rol, "value") else str(current_user.rol)
    except Exception:
        rol_value = str(current_user.rol)
    rol_clean = str(rol_value).split(".")[-1].upper()
    return rol_clean in ["ADMIN", "DOCENTE"]


def _can_access_solicitud(db: Session, solicitud: SolicitudServicio, current_user: Usuario) -> bool:
    if _is_admin_or_docente(current_user):
        return True
    return cast(int, solicitud.id_usuario) == cast(int, current_user.id)


def _can_access_incidente(db: Session, incidente: IncidenteAcademico, current_user: Usuario) -> bool:
    if _is_admin_or_docente(current_user):
        return True
    return cast(int, incidente.id_usuario) == cast(int, current_user.id)


# CRUD para SolicitudServicio

@router.get("/requests", response_model=List[dict])
async def listar_solicitudes(
    current_user: Usuario = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Lista solicitudes de servicio"""
    if _is_admin_or_docente(current_user):
        solicitudes = db.query(SolicitudServicio).all()
    else:
        solicitudes = db.query(SolicitudServicio).filter(SolicitudServicio.id_usuario == cast(int, current_user.id)).all()
    return [_format_solicitud(s) for s in solicitudes]


@router.get("/requests/{id_solicitud}")
async def obtener_solicitud(
    id_solicitud: int,
    current_user: Usuario = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    solicitud = _get_solicitud(db, id_solicitud)
    if not _can_access_solicitud(db, solicitud, current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes acceso a esta solicitud")
    return _format_solicitud(solicitud)


@router.post("/requests")
async def crear_solicitud(
    solicitud_data: SolicitudServicioCreate,
    current_user: Usuario = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    payload = solicitud_data.model_dump(exclude_unset=True)
    solicitud = SolicitudServicio(
        id_usuario=cast(int, current_user.id),
        id_silabo=payload.get("id_silabo"),
        categoria=payload.get("tipo") or payload.get("categoria") or "general",
        descripcion=payload.get("pregunta") or payload.get("descripcion") or "",
        respuesta_generada=payload.get("respuesta") or payload.get("respuesta_generada"),
        tiempo_respuesta_ms=payload.get("tiempo_respuesta_ms"),
        estado=payload.get("estado") or "RESUELTA",
        escalada_a_docente=payload.get("escalada") or False,
    )
    db.add(solicitud)
    db.commit()
    db.refresh(solicitud)
    return _format_solicitud(solicitud)


@router.put("/requests/{id_solicitud}")
async def actualizar_solicitud(
    id_solicitud: int,
    solicitud_data: SolicitudServicioUpdate,
    current_user: Usuario = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    solicitud = _get_solicitud(db, id_solicitud)
    if not _can_access_solicitud(db, solicitud, current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permisos para actualizar esta solicitud")

    update_data = solicitud_data.model_dump(exclude_unset=True)
    mapping = {
        "tipo": "categoria",
        "pregunta": "descripcion",
        "respuesta": "respuesta_generada",
        "escalada": "escalada_a_docente",
    }
    for key, value in update_data.items():
        setattr(solicitud, mapping.get(key, key), value)
    db.commit()
    db.refresh(solicitud)
    return _format_solicitud(solicitud)


@router.delete("/requests/{id_solicitud}")
async def eliminar_solicitud(
    id_solicitud: int,
    current_user: Usuario = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    solicitud = _get_solicitud(db, id_solicitud)
    if not _can_access_solicitud(db, solicitud, current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permisos para eliminar esta solicitud")

    db.delete(solicitud)
    db.commit()
    return {"message": "Solicitud eliminada correctamente"}


# CRUD para IncidenteAcademico

@router.get("/incidents", response_model=List[dict])
async def listar_incidentes(
    current_user: Usuario = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Lista incidentes académicos"""
    if _is_admin_or_docente(current_user):
        incidentes = db.query(IncidenteAcademico).all()
    else:
        incidentes = db.query(IncidenteAcademico).filter(IncidenteAcademico.id_usuario == cast(int, current_user.id)).all()
    return [_format_incidente(i) for i in incidentes]


@router.get("/incidents/{id_incidente}")
async def obtener_incidente(
    id_incidente: int,
    current_user: Usuario = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    incidente = _get_incidente(db, id_incidente)
    if not _can_access_incidente(db, incidente, current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes acceso a este incidente")
    return _format_incidente(incidente)


@router.post("/incidents")
async def crear_incidente(
    incidente_data: IncidenteAcademicoCreate,
    current_user: Usuario = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    payload = incidente_data.model_dump(exclude_unset=True)
    incidente = IncidenteAcademico(
        id_usuario=cast(int, current_user.id),
        id_silabo=payload.get("id_silabo"),
        severidad=payload.get("severidad") or "MEDIA",
        descripcion=payload.get("recomendacion") or "",
        promedio_actual=payload.get("promedio_actual"),
        nota_necesaria=payload.get("nota_necesaria"),
        recomendacion=payload.get("recomendacion"),
        escalado_a_tutoria=payload.get("notificado") or False,
        fecha_cierre=payload.get("fecha_resolucion"),
    )
    db.add(incidente)
    db.commit()
    db.refresh(incidente)
    return _format_incidente(incidente)


@router.put("/incidents/{id_incidente}")
async def actualizar_incidente(
    id_incidente: int,
    incidente_data: IncidenteAcademicoUpdate,
    current_user: Usuario = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    incidente = _get_incidente(db, id_incidente)
    if not _can_access_incidente(db, incidente, current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permisos para actualizar este incidente")

    update_data = incidente_data.model_dump(exclude_unset=True)
    mapping = {
        "notificado": "escalado_a_tutoria",
        "resuelto": "estado",
        "fecha_resolucion": "fecha_cierre",
    }
    for key, value in update_data.items():
        setattr(incidente, mapping.get(key, key), value)
    db.commit()
    db.refresh(incidente)
    return _format_incidente(incidente)


@router.delete("/incidents/{id_incidente}")
async def eliminar_incidente(
    id_incidente: int,
    current_user: Usuario = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    incidente = _get_incidente(db, id_incidente)
    if not _can_access_incidente(db, incidente, current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permisos para eliminar este incidente")

    db.delete(incidente)
    db.commit()
    return {"message": "Incidente eliminado correctamente"}