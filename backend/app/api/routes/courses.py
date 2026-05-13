from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List, Any, cast
import datetime
from app.database.connection import get_db
from app.database.models import Usuario, Curso, ReglaEvaluacion
from app.api.dependencies import get_current_active_user

router = APIRouter(prefix="/courses", tags=["Courses"])


def _to_bool(value: Any) -> bool:
    return bool(cast(bool, value))


def _iso_or_none(value: Any) -> Optional[str]:
    datetime_value = cast(Optional[datetime.datetime], value)
    return datetime_value.isoformat() if datetime_value else None


def _format_curso(curso: Curso) -> dict:
    return {
        "id": cast(int, curso.id),
        "codigo": cast(str, curso.codigo),
        "nombre": cast(str, curso.nombre),
        "ciclo": cast(Optional[str], curso.ciclo),
        "periodo": cast(Optional[str], curso.periodo),
        "docente": cast(Optional[str], curso.docente),
        "email_docente": cast(Optional[str], curso.email_docente),
        "es_oficial": _to_bool(curso.es_oficial),
        "reglas_json": cast(Optional[Any], curso.reglas_json),
        "fecha_carga": _iso_or_none(curso.fecha_carga),
        "activo": _to_bool(curso.activo)
    }


def _format_regla_evaluacion(regla: ReglaEvaluacion) -> dict:
    return {
        "id": cast(int, regla.id),
        "id_curso": cast(int, regla.id_curso),
        "unidad": cast(Optional[str], regla.unidad),
        "formula": cast(Optional[str], regla.formula),
        "evidencias_json": cast(Optional[Any], regla.evidencias_json),
        "nota_aprobatoria": cast(float, regla.nota_aprobatoria),
        "descripcion": cast(Optional[str], regla.descripcion)
    }


class CursoCreate(BaseModel):
    codigo: str
    nombre: str
    ciclo: Optional[str] = None
    periodo: Optional[str] = None
    docente: Optional[str] = None
    email_docente: Optional[str] = None
    es_oficial: Optional[bool] = False
    reglas_json: Optional[Any] = None


class CursoUpdate(BaseModel):
    nombre: Optional[str] = None
    ciclo: Optional[str] = None
    periodo: Optional[str] = None
    docente: Optional[str] = None
    email_docente: Optional[str] = None
    es_oficial: Optional[bool] = None
    reglas_json: Optional[Any] = None
    activo: Optional[bool] = None


class ReglaEvaluacionCreate(BaseModel):
    id_curso: int
    unidad: Optional[str] = None
    formula: Optional[str] = None
    evidencias_json: Optional[Any] = None
    nota_aprobatoria: Optional[float] = 14.0
    descripcion: Optional[str] = None


class ReglaEvaluacionUpdate(BaseModel):
    unidad: Optional[str] = None
    formula: Optional[str] = None
    evidencias_json: Optional[Any] = None
    nota_aprobatoria: Optional[float] = None
    descripcion: Optional[str] = None


def _get_curso(db: Session, id_curso: int) -> Curso:
    curso = db.query(Curso).filter(Curso.id == id_curso).first()
    if not curso:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Curso no encontrado")
    return curso


def _get_regla_evaluacion(db: Session, id_regla: int) -> ReglaEvaluacion:
    regla = db.query(ReglaEvaluacion).filter(ReglaEvaluacion.id == id_regla).first()
    if not regla:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Regla de evaluación no encontrada")
    return regla


def _is_admin_or_docente(current_user: Usuario) -> bool:
    return cast(str, current_user.rol) in ["admin", "docente"]


# CRUD para Curso

@router.get("/", response_model=List[dict])
async def listar_cursos(
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Lista todos los cursos (solo admin/docente pueden ver todos)"""
    if _is_admin_or_docente(current_user):
        cursos = db.query(Curso).all()
    else:
        cursos = db.query(Curso).filter(Curso.activo == True).all()
    return [_format_curso(c) for c in cursos]


@router.get("/{id_curso}")
async def obtener_curso(
    id_curso: int,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    curso = _get_curso(db, id_curso)
    if not _is_admin_or_docente(current_user) and not _to_bool(curso.activo):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes acceso a este curso")
    return _format_curso(curso)


@router.post("/")
async def crear_curso(
    curso_data: CursoCreate,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if not _is_admin_or_docente(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permisos para crear cursos")

    # Verificar código único
    existing = db.query(Curso).filter(Curso.codigo == curso_data.codigo).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Código de curso ya existe")

    curso = Curso(**curso_data.dict())
    db.add(curso)
    db.commit()
    db.refresh(curso)
    return _format_curso(curso)


@router.put("/{id_curso}")
async def actualizar_curso(
    id_curso: int,
    curso_data: CursoUpdate,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if not _is_admin_or_docente(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permisos para actualizar cursos")

    curso = _get_curso(db, id_curso)
    update_data = curso_data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(curso, key, value)
    db.commit()
    db.refresh(curso)
    return _format_curso(curso)


@router.delete("/{id_curso}")
async def eliminar_curso(
    id_curso: int,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if not _is_admin_or_docente(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permisos para eliminar cursos")

    curso = _get_curso(db, id_curso)
    db.delete(curso)
    db.commit()
    return {"message": "Curso eliminado correctamente"}


# CRUD para ReglaEvaluacion

@router.get("/{id_curso}/rules", response_model=List[dict])
async def listar_reglas_evaluacion(
    id_curso: int,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Lista las reglas de evaluación de un curso"""
    curso = _get_curso(db, id_curso)
    if not _is_admin_or_docente(current_user) and not _to_bool(curso.activo):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes acceso a este curso")

    reglas = db.query(ReglaEvaluacion).filter(ReglaEvaluacion.id_curso == id_curso).all()
    return [_format_regla_evaluacion(r) for r in reglas]


@router.get("/rules/{id_regla}")
async def obtener_regla_evaluacion(
    id_regla: int,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    regla = _get_regla_evaluacion(db, id_regla)
    curso = _get_curso(db, cast(int, regla.id_curso))
    if not _is_admin_or_docente(current_user) and not _to_bool(curso.activo):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes acceso a esta regla")
    return _format_regla_evaluacion(regla)


@router.post("/{id_curso}/rules")
async def crear_regla_evaluacion(
    id_curso: int,
    regla_data: ReglaEvaluacionCreate,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if not _is_admin_or_docente(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permisos para crear reglas")

    curso = _get_curso(db, id_curso)
    regla = ReglaEvaluacion(id_curso=id_curso, **regla_data.dict(exclude={"id_curso"}))
    db.add(regla)
    db.commit()
    db.refresh(regla)
    return _format_regla_evaluacion(regla)


@router.put("/rules/{id_regla}")
async def actualizar_regla_evaluacion(
    id_regla: int,
    regla_data: ReglaEvaluacionUpdate,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if not _is_admin_or_docente(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permisos para actualizar reglas")

    regla = _get_regla_evaluacion(db, id_regla)
    update_data = regla_data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(regla, key, value)
    db.commit()
    db.refresh(regla)
    return _format_regla_evaluacion(regla)


@router.delete("/rules/{id_regla}")
async def eliminar_regla_evaluacion(
    id_regla: int,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if not _is_admin_or_docente(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permisos para eliminar reglas")

    regla = _get_regla_evaluacion(db, id_regla)
    db.delete(regla)
    db.commit()
    return {"message": "Regla de evaluación eliminada correctamente"}