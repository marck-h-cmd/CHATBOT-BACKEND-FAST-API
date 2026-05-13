from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Any, cast
import uuid
import datetime
from app.database.connection import get_db
from app.database.models import Usuario, Silabo, Curso, SilaboChunk, SilaboUsuario
from app.services.pdf_parser import PDFParserService
from app.services.chunker import ChunkerService
from app.services.embeddings import embedding_service
from app.services.rule_engine import RuleEngine
from app.services.itil_desk import ITILServiceDesk
from app.api.dependencies import get_current_active_user

router = APIRouter(prefix="/syllabus", tags=["Syllabus"])


def _to_bool(value: Any) -> bool:
    return bool(cast(bool, value))


def _iso_or_none(value: Any) -> Optional[str]:
    datetime_value = cast(Optional[datetime.datetime], value)
    return datetime_value.isoformat() if datetime_value else None


def _format_silabo(silabo: Silabo) -> dict:
    return {
        "id": cast(int, silabo.id),
        "nombre_archivo": cast(str, silabo.nombre_archivo),
        "id_curso": cast(int, silabo.id_curso),
        "es_oficial": _to_bool(silabo.es_oficial),
        "es_validado": _to_bool(silabo.es_validado),
        "aviso_fiabilidad": cast(Optional[str], silabo.aviso_fiabilidad),
        "fecha_subida": _iso_or_none(silabo.fecha_subida)
    }


def _format_silabo_usuario(asociacion: SilaboUsuario) -> dict:
    return {
        "id": cast(int, asociacion.id),
        "id_silabo": cast(int, asociacion.id_silabo),
        "id_usuario": cast(int, asociacion.id_usuario),
        "es_favorito": _to_bool(asociacion.es_favorito),
        "fecha_agregado": _iso_or_none(asociacion.fecha_agregado)
    }


class SilaboUpdate(BaseModel):
    nombre_archivo: Optional[str]
    es_validado: Optional[bool]
    aviso_fiabilidad: Optional[str]


class SilaboUsuarioCreate(BaseModel):
    id_silabo: int
    id_usuario: int
    es_favorito: Optional[bool] = False


class SilaboUsuarioDelete(BaseModel):
    id_silabo: int
    id_usuario: int


def _get_silabo(db: Session, id_silabo: int) -> Silabo:
    silabo = db.query(Silabo).filter(Silabo.id == id_silabo).first()
    if not silabo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sílabo no encontrado")
    return silabo


def _verify_access(db: Session, silabo: Silabo, current_user: Usuario):
    if _to_bool(silabo.es_oficial):
        return

    acceso = db.query(SilaboUsuario).filter(
        SilaboUsuario.id_silabo == silabo.id,
        SilaboUsuario.id_usuario == cast(int, current_user.id)
    ).first()
    if not acceso:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes acceso a este sílabo")


def _is_owner(db: Session, silabo: Silabo, current_user: Usuario) -> bool:
    if cast(str, current_user.rol) in ["admin", "docente"]:
        return True
    acceso = db.query(SilaboUsuario).filter(
        SilaboUsuario.id_silabo == silabo.id,
        SilaboUsuario.id_usuario == cast(int, current_user.id)
    ).first()
    return acceso is not None


@router.get("/preloaded")
async def obtener_silabo_precargado(db: Session = Depends(get_db)):
    """Obtiene el sílabo precargado de Gestión de Servicios de TIC"""
    curso = db.query(Curso).filter(Curso.codigo == "3445", Curso.es_oficial == True).first()

    if not curso:
        curso = Curso(
            codigo="3445",
            nombre="GESTIÓN DE SERVICIOS DE TIC",
            ciclo="VII",
            periodo="2026-I",
            docente="Alberto Carlos Mendoza de los Santos",
            email_docente="amendozad@unitru.edu.pe",
            es_oficial=True,
            reglas_json=RuleEngine.REGLAS_OFICIALES
        )
        db.add(curso)
        db.commit()
        db.refresh(curso)

        silabo = Silabo(
            id_curso=curso.id,
            nombre_archivo="silabo_oficial_Gestion_TIC.pdf",
            texto_completo="Sílabo oficial precargado",
            es_oficial=True,
            es_validado=True,
            aviso_fiabilidad="Sílabo oficial validado con reglas deterministas"
        )
        db.add(silabo)
        db.commit()

    silabo = db.query(Silabo).filter(Silabo.id_curso == curso.id, Silabo.es_oficial == True).first()
    if not silabo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sílabo oficial precargado no encontrado")

    return {
        "id_silabo": cast(int, silabo.id),
        "curso": {
            "codigo": cast(str, curso.codigo),
            "nombre": cast(str, curso.nombre),
            "ciclo": cast(Optional[str], curso.ciclo),
            "periodo": cast(Optional[str], curso.periodo),
            "docente": cast(Optional[str], curso.docente),
            "email": cast(Optional[str], curso.email_docente)
        },
        "reglas": RuleEngine.REGLAS_OFICIALES,
        "tutoria": {
            "dia": "Jueves",
            "horario": "12:00 - 13:00",
            "email": curso.email_docente
        },
        "es_oficial": True,
        "validado": True
    }


@router.post("/upload")
async def subir_silabo(
    id_usuario: str = Form(...),
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Sube un silabo (PDF) proporcionado por el estudiante"""

    filename = cast(str, archivo.filename)
    if not filename.endswith('.pdf'):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Solo se permiten archivos PDF")

    contenido = await archivo.read()
    if len(contenido) > 10 * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El archivo no puede superar los 10MB")

    texto = PDFParserService.extraer_texto(contenido)
    secciones = PDFParserService.extraer_secciones(texto)
    validacion = PDFParserService.validar_estructura(secciones)

    codigo_curso = secciones.get("codigo_curso") or f"USR_{uuid.uuid4().hex[:8]}"
    curso = db.query(Curso).filter(Curso.codigo == codigo_curso).first()

    if not curso:
        curso = Curso(
            codigo=codigo_curso,
            nombre=secciones.get("nombre_curso", filename.replace(".pdf", "")),
            ciclo=secciones.get("ciclo", "No especificado"),
            periodo=secciones.get("periodo", "Desconocido"),
            es_oficial=False
        )
        db.add(curso)
        db.commit()
        db.refresh(curso)

    try:
        usuario_id = int(id_usuario)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="ID de usuario inválido")

    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")

    silabo = Silabo(
        id_curso=curso.id,
        nombre_archivo=filename,
        texto_completo=texto[:10000],
        es_oficial=False,
        es_validado=validacion["confiabilidad"] == "ALTA",
        aviso_fiabilidad=f"Confiabilidad: {validacion['confiabilidad']}. {', '.join(validacion['advertencias'])}" if validacion['advertencias'] else "Sílabo procesado correctamente"
    )
    db.add(silabo)
    db.commit()
    db.refresh(silabo)

    silabo_usuario = db.query(SilaboUsuario).filter(
        SilaboUsuario.id_silabo == silabo.id,
        SilaboUsuario.id_usuario == usuario.id
    ).first()

    if not silabo_usuario:
        silabo_usuario = SilaboUsuario(
            id_silabo=silabo.id,
            id_usuario=usuario.id,
            es_favorito=False,
            fecha_agregado=datetime.datetime.now()
        )
        db.add(silabo_usuario)
        db.commit()

    chunks = ChunkerService.crear_chunks(texto, {"nombre_curso": curso.nombre})
    for chunk in chunks:
        embedding = embedding_service.generar_embedding(chunk["texto"])
        chunk_db = SilaboChunk(
            id_silabo=silabo.id,
            chunk_texto=chunk["texto"],
            tipo_seccion=chunk["metadata"].get("tipo_seccion"),
            unidad=chunk["metadata"].get("unidad"),
            embedding=embedding,
            metadata_json=chunk["metadata"]
        )
        db.add(chunk_db)
    db.commit()

    silabo_id = cast(int, silabo.id)
    curso_id = cast(int, curso.id)

    if validacion["confiabilidad"] == "BAJA":
        ITILServiceDesk.registrar_fallo_ingestion(
            db, silabo_id, "Baja confiabilidad en extracción", validacion
        )

    return {
        "id_silabo": silabo_id,
        "id_curso": curso_id,
        "nombre_curso": cast(str, curso.nombre),
        "es_oficial": False,
        "validado": _to_bool(silabo.es_validado),
        "aviso": cast(Optional[str], silabo.aviso_fiabilidad),
        "advertencias": validacion["advertencias"],
        "sugerencia": "Para cálculos precisos, usa el modo simulación con reglas explícitas."
    }


@router.get("/")
async def listar_silabos(
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Lista los sílabos oficiales y los sílabos del usuario"""
    current_user_rol = cast(str, current_user.rol)
    current_user_id = cast(int, current_user.id)

    if current_user_rol == "admin":
        silabos = db.query(Silabo).all()
        return {
            "silabos": [_format_silabo(s) for s in silabos]
        }

    silabos_oficiales = db.query(Silabo).filter(Silabo.es_oficial == True).all()
    silabos_usuario = db.query(Silabo).join(
        SilaboUsuario, SilaboUsuario.id_silabo == Silabo.id
    ).filter(
        SilaboUsuario.id_usuario == current_user_id
    ).all()

    return {
        "oficiales": [_format_silabo(s) for s in silabos_oficiales],
        "mis_silabos": [_format_silabo(s) for s in silabos_usuario]
    }


@router.get("/{id_silabo}")
async def obtener_silabo_detalle(
    id_silabo: int,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    silabo = _get_silabo(db, id_silabo)
    _verify_access(db, silabo, current_user)

    curso = db.query(Curso).filter(Curso.id == silabo.id_curso).first()
    asociaciones = db.query(SilaboUsuario).filter(SilaboUsuario.id_silabo == silabo.id).all()

    return {
        "id": cast(int, silabo.id),
        "id_curso": cast(int, silabo.id_curso),
        "nombre_archivo": cast(str, silabo.nombre_archivo),
        "texto_completo": cast(Optional[str], silabo.texto_completo),
        "es_oficial": _to_bool(silabo.es_oficial),
        "es_validado": _to_bool(silabo.es_validado),
        "aviso_fiabilidad": cast(Optional[str], silabo.aviso_fiabilidad),
        "fecha_subida": _iso_or_none(silabo.fecha_subida),
        "curso": {
            "codigo": cast(str, curso.codigo),
            "nombre": cast(str, curso.nombre),
            "ciclo": cast(Optional[str], curso.ciclo),
            "periodo": cast(Optional[str], curso.periodo),
            "docente": cast(Optional[str], curso.docente),
            "email_docente": cast(Optional[str], curso.email_docente)
        } if curso else None,
        "asociaciones": [_format_silabo_usuario(a) for a in asociaciones]
    }


@router.put("/{id_silabo}")
async def actualizar_silabo(
    id_silabo: int,
    datos: SilaboUpdate,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    silabo = _get_silabo(db, id_silabo)
    if not _is_owner(db, silabo, current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permisos para modificar este sílabo")

    if datos.nombre_archivo is not None:
        setattr(silabo, "nombre_archivo", datos.nombre_archivo)
    if datos.es_validado is not None:
        
        setattr(silabo, "es_validado", datos.es_validado)
    if datos.aviso_fiabilidad is not None:
        setattr(silabo, "aviso_fiabilidad", datos.aviso_fiabilidad)

    db.commit()
    db.refresh(silabo)

    return {
        "message": "Sílabo actualizado correctamente",
        "silabo": {
            "id": cast(int, silabo.id),
            "nombre_archivo": cast(str, silabo.nombre_archivo),
            "es_validado": _to_bool(silabo.es_validado),
            "aviso_fiabilidad": cast(Optional[str], silabo.aviso_fiabilidad)
        }
    }


@router.delete("/{id_silabo}")
async def eliminar_silabo(
    id_silabo: int,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    silabo = _get_silabo(db, id_silabo)
    if not _is_owner(db, silabo, current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permisos para eliminar este sílabo")

    db.delete(silabo)
    db.commit()
    return {"message": "Sílabo eliminado correctamente"}


@router.get("/access/{id_silabo}")
async def obtener_asociaciones_silabo(
    id_silabo: int,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    silabo = _get_silabo(db, id_silabo)
    if not _is_owner(db, silabo, current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permisos para ver las asociaciones de este sílabo")

    asociaciones = db.query(SilaboUsuario).filter(SilaboUsuario.id_silabo == silabo.id).all()
    return [_format_silabo_usuario(a) for a in asociaciones]


@router.post("/access")
async def agregar_asociacion_silabo(
    relacion: SilaboUsuarioCreate,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    silabo = _get_silabo(db, relacion.id_silabo)
    if not _is_owner(db, silabo, current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permisos para asociar este sílabo")

    usuario = db.query(Usuario).filter(Usuario.id == relacion.id_usuario).first()
    if not usuario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")

    asociacion = db.query(SilaboUsuario).filter(
        SilaboUsuario.id_silabo == relacion.id_silabo,
        SilaboUsuario.id_usuario == relacion.id_usuario
    ).first()
    if asociacion:
        return {
            "message": "La asociación ya existe",
            "asociacion": _format_silabo_usuario(asociacion)
        }

    asociacion = SilaboUsuario(
        id_silabo=relacion.id_silabo,
        id_usuario=relacion.id_usuario,
        es_favorito=relacion.es_favorito,
        fecha_agregado=datetime.datetime.now()
    )
    db.add(asociacion)
    db.commit()
    db.refresh(asociacion)

    return {
        "message": "Asociación creada correctamente",
        "asociacion": _format_silabo_usuario(asociacion)
    }


@router.delete("/access")
async def eliminar_asociacion_silabo(
    relacion: SilaboUsuarioDelete,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    silabo = _get_silabo(db, relacion.id_silabo)
    if not _is_owner(db, silabo, current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permisos para eliminar esta asociación")

    asociacion = db.query(SilaboUsuario).filter(
        SilaboUsuario.id_silabo == relacion.id_silabo,
        SilaboUsuario.id_usuario == relacion.id_usuario
    ).first()
    if not asociacion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asociación no encontrada")

    db.delete(asociacion)
    db.commit()
    return {"message": "Asociación eliminada correctamente"}


@router.get("/user/{id_usuario}")
async def obtener_silabos_de_usuario(
    id_usuario: int,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    current_user_rol = cast(str, current_user.rol)
    current_user_id = cast(int, current_user.id)
    if current_user_rol != "admin" and current_user_id != id_usuario:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permisos para ver estos sílabos")

    silabos = db.query(Silabo).join(
        SilaboUsuario, SilaboUsuario.id_silabo == Silabo.id
    ).filter(
        SilaboUsuario.id_usuario == id_usuario
    ).all()

    return [_format_silabo(s) for s in silabos]


@router.get("/{id_silabo}/chunks")
async def obtener_chunks(id_silabo: int, db: Session = Depends(get_db)):
    """Obtiene los chunks de un silabo (debug)"""
    chunks = db.query(SilaboChunk).filter(SilaboChunk.id_silabo == id_silabo).all()
    return {
        "total": len(chunks),
        "chunks": [{"id": c.id, "tipo": c.tipo_seccion, "unidad": c.unidad, "texto_preview": c.chunk_texto[:200]} for c in chunks]
    }
