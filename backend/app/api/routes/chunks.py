from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List, Any, cast
import datetime
from app.database.connection import get_db
from app.database.models import Usuario, SilaboChunk, Silabo
from app.api.dependencies import get_current_active_user

router = APIRouter(prefix="/chunks", tags=["Chunks"])


def _to_bool(value: Any) -> bool:
    return bool(cast(bool, value))


def _iso_or_none(value: Any) -> Optional[str]:
    datetime_value = cast(Optional[datetime.datetime], value)
    return datetime_value.isoformat() if datetime_value else None


def _format_chunk(chunk: SilaboChunk) -> dict:
    return {
        "id": cast(int, chunk.id),
        "id_silabo": cast(int, chunk.id_silabo),
        "chunk_texto": cast(str, chunk.chunk_texto),
        "tipo_seccion": cast(Optional[str], chunk.tipo_seccion),
        "unidad": cast(Optional[str], chunk.unidad),
        "embedding": cast(Optional[Any], chunk.embedding),
        "metadata_json": cast(Optional[Any], chunk.metadata_json)
    }


class SilaboChunkCreate(BaseModel):
    id_silabo: int
    chunk_texto: str
    tipo_seccion: Optional[str] = None
    unidad: Optional[str] = None
    embedding: Optional[Any] = None
    metadata_json: Optional[Any] = None


class SilaboChunkUpdate(BaseModel):
    chunk_texto: Optional[str] = None
    tipo_seccion: Optional[str] = None
    unidad: Optional[str] = None
    embedding: Optional[Any] = None
    metadata_json: Optional[Any] = None


def _get_chunk(db: Session, id_chunk: int) -> SilaboChunk:
    chunk = db.query(SilaboChunk).filter(SilaboChunk.id == id_chunk).first()
    if not chunk:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chunk no encontrado")
    return chunk


def _verify_chunk_access(db: Session, chunk: SilaboChunk, current_user: Usuario):
    silabo = db.query(Silabo).filter(Silabo.id == chunk.id_silabo).first()
    if not silabo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sílabo no encontrado")

    if _to_bool(silabo.es_oficial):
        return

    # Verificar acceso al sílabo
    from app.api.routes.syllabus import _verify_access
    _verify_access(db, silabo, current_user)


def _is_admin_or_docente(current_user: Usuario) -> bool:
    return cast(str, current_user.rol) in ["admin", "docente"]


# CRUD para SilaboChunk

@router.get("/", response_model=List[dict])
async def listar_chunks(
    id_silabo: Optional[int] = None,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Lista chunks, opcionalmente filtrados por sílabo"""
    query = db.query(SilaboChunk)
    if id_silabo:
        query = query.filter(SilaboChunk.id_silabo == id_silabo)
    
    chunks = query.all()
    # Filtrar por acceso
    accessible_chunks = []
    for chunk in chunks:
        try:
            _verify_chunk_access(db, chunk, current_user)
            accessible_chunks.append(chunk)
        except HTTPException:
            continue
    return [_format_chunk(c) for c in accessible_chunks]


@router.get("/{id_chunk}")
async def obtener_chunk(
    id_chunk: int,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    chunk = _get_chunk(db, id_chunk)
    _verify_chunk_access(db, chunk, current_user)
    return _format_chunk(chunk)


@router.post("/")
async def crear_chunk(
    chunk_data: SilaboChunkCreate,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if not _is_admin_or_docente(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permisos para crear chunks")

    # Verificar que el sílabo existe
    silabo = db.query(Silabo).filter(Silabo.id == chunk_data.id_silabo).first()
    if not silabo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sílabo no encontrado")

    chunk = SilaboChunk(**chunk_data.dict())
    db.add(chunk)
    db.commit()
    db.refresh(chunk)
    return _format_chunk(chunk)


@router.put("/{id_chunk}")
async def actualizar_chunk(
    id_chunk: int,
    chunk_data: SilaboChunkUpdate,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if not _is_admin_or_docente(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permisos para actualizar chunks")

    chunk = _get_chunk(db, id_chunk)
    _verify_chunk_access(db, chunk, current_user)
    update_data = chunk_data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(chunk, key, value)
    db.commit()
    db.refresh(chunk)
    return _format_chunk(chunk)


@router.delete("/{id_chunk}")
async def eliminar_chunk(
    id_chunk: int,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if not _is_admin_or_docente(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permisos para eliminar chunks")

    chunk = _get_chunk(db, id_chunk)
    _verify_chunk_access(db, chunk, current_user)
    db.delete(chunk)
    db.commit()
    return {"message": "Chunk eliminado correctamente"}