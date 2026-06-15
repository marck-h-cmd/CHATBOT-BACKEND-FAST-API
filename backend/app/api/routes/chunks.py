from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List, Any, cast
import datetime
from app.database.connection import get_db
from app.database.models import Usuario, SilaboChunk, Silabo, TipoSilabo, AmbitoUso, RolUsuario, TipoSeccionChunk
from app.api.dependencies import get_current_active_user

router = APIRouter(prefix="/chunks", tags=["Chunks"])


def _to_bool(value: Any) -> bool:
    return bool(cast(bool, value))


def _iso_or_none(value: Any) -> Optional[str]:
    datetime_value = cast(Optional[datetime.datetime], value)
    return datetime_value.isoformat() if datetime_value else None


def _format_chunk(chunk: SilaboChunk) -> dict:
    return {
        "id": cast(int, chunk.id_seccion),
        "id_silabo": cast(int, chunk.id_silabo),
        "chunk_texto": cast(str, chunk.contenido),
        "tipo_seccion": cast(Optional[str], chunk.tipo_seccion.value if hasattr(chunk.tipo_seccion, "value") else chunk.tipo_seccion),
        "unidad": cast(Optional[str], chunk.metadata_json.get("unidad") if chunk.metadata_json else None),
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
    chunk = db.query(SilaboChunk).filter(SilaboChunk.id_seccion == id_chunk).first()
    if not chunk:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chunk no encontrado")
    return chunk


def _verify_chunk_access(db: Session, chunk: SilaboChunk, current_user: Usuario):
    silabo = db.query(Silabo).filter(Silabo.id_silabo == chunk.id_silabo).first()
    if not silabo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sílabo no encontrado")

    try:
        rol_value = current_user.rol.value if hasattr(current_user.rol, "value") else str(current_user.rol)
    except Exception:
        rol_value = str(current_user.rol)

    if rol_value.upper() != "ADMIN":
        es_creador = silabo.id_usuario_subida == current_user.id
        es_oficial_publicado = (silabo.tipo_silabo == TipoSilabo.OFICIAL and silabo.ambito_uso == AmbitoUso.PUBLICADO)
        if not es_creador and not es_oficial_publicado:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado a este sílabo")


def _is_admin_or_docente(current_user: Usuario) -> bool:
    try:
        rol_value = current_user.rol.value if hasattr(current_user.rol, "value") else str(current_user.rol)
    except Exception:
        rol_value = str(current_user.rol)
    return rol_value.upper() in ["ADMIN", "DOCENTE"]


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
    silabo = db.query(Silabo).filter(Silabo.id_silabo == chunk_data.id_silabo).first()
    if not silabo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sílabo no encontrado")

    meta = chunk_data.metadata_json or {}
    if chunk_data.unidad:
        meta["unidad"] = chunk_data.unidad

    tipo_seccion = TipoSeccionChunk.GENERAL
    if chunk_data.tipo_seccion:
        try:
            tipo_seccion = TipoSeccionChunk(chunk_data.tipo_seccion)
        except ValueError:
            tipo_seccion = TipoSeccionChunk.GENERAL

    chunk = SilaboChunk(
        id_silabo=chunk_data.id_silabo,
        contenido=chunk_data.chunk_texto,
        tipo_seccion=tipo_seccion,
        embedding=chunk_data.embedding,
        metadata_json=meta
    )
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
    
    if chunk_data.chunk_texto is not None:
        chunk.contenido = chunk_data.chunk_texto
    if chunk_data.tipo_seccion is not None:
        try:
            chunk.tipo_seccion = TipoSeccionChunk(chunk_data.tipo_seccion)
        except ValueError:
            pass
    if chunk_data.unidad is not None:
        meta = chunk.metadata_json or {}
        meta["unidad"] = chunk_data.unidad
        chunk.metadata_json = meta
    if chunk_data.embedding is not None:
        chunk.embedding = chunk_data.embedding
    if chunk_data.metadata_json is not None:
        chunk.metadata_json = chunk_data.metadata_json

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