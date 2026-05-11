from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
import uuid
import datetime
from app.database.connection import get_db
from app.database.models import Silabo, Curso, SilaboChunk, SilaboUsuario
from app.services.pdf_parser import PDFParserService
from app.services.chunker import ChunkerService
from app.services.embeddings import embedding_service
from app.services.rule_engine import RuleEngine
from app.services.itil_desk import ITILServiceDesk

router = APIRouter(prefix="/syllabus", tags=["Syllabus"])

@router.get("/preloaded")
async def obtener_silabo_precargado(db: Session = Depends(get_db)):
    """Obtiene el sílabo precargado de Gestión de Servicios de TIC"""
    curso = db.query(Curso).filter(Curso.codigo == "3445", Curso.es_oficial == True).first()
    
    if not curso:
        # Crear silabo precargado oficial
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
        
        # Crear silabo asociado
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
    
    return {
        "id_silabo": silabo.id,
        "curso": {
            "codigo": curso.codigo,
            "nombre": curso.nombre,
            "ciclo": curso.ciclo,
            "periodo": curso.periodo,
            "docente": curso.docente,
            "email": curso.email_docente
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
    
    if not archivo.filename.endswith('.pdf'):
        raise HTTPException(400, "Solo se permiten archivos PDF")
    
    # Leer PDF
    contenido = await archivo.read()
    
    if len(contenido) > 10 * 1024 * 1024:  # 10MB
        raise HTTPException(400, "El archivo no puede superar los 10MB")
    
    # Extraer texto y secciones
    texto = PDFParserService.extraer_texto(contenido)
    secciones = PDFParserService.extraer_secciones(texto)
    validacion = PDFParserService.validar_estructura(secciones)
    
    # Crear o obtener curso
    codigo_curso = secciones.get("codigo_curso") or f"USR_{uuid.uuid4().hex[:8]}"
    curso = db.query(Curso).filter(Curso.codigo == codigo_curso).first()
    
    if not curso:
        curso = Curso(
            codigo=codigo_curso,
            nombre=secciones.get("nombre_curso", archivo.filename.replace(".pdf", "")),
            ciclo=secciones.get("ciclo", "No especificado"),
            periodo=secciones.get("periodo", "Desconocido"),
            es_oficial=False
        )
        db.add(curso)
        db.commit()
        db.refresh(curso)
    
    # Guardar silabo
    silabo = Silabo(
        id_curso=curso.id,
        nombre_archivo=archivo.filename,
        texto_completo=texto[:10000],  # Limitar para no sobrecargar
        es_oficial=False,
        es_validado=validacion["confiabilidad"] == "ALTA",
        aviso_fiabilidad=f"Confiabilidad: {validacion['confiabilidad']}. {', '.join(validacion['advertencias'])}" if validacion['advertencias'] else "Sílabo procesado correctamente"
    )
    db.add(silabo)
    db.commit()
    db.refresh(silabo)
    
    # Crear relación usuario-sílabo para dar acceso
    silabo_usuario = SilaboUsuario(
        id_silabo=silabo.id,
        id_usuario=int(id_usuario),
        fecha_agregado=datetime.datetime.now()
    )
    db.add(silabo_usuario)
    db.commit()
    
    # Crear chunks y embeddings
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
    
    # Registrar fallo si baja confiabilidad
    if validacion["confiabilidad"] == "BAJA":
        ITILServiceDesk.registrar_fallo_ingestion(
            db, silabo.id, "Baja confiabilidad en extracción", validacion
        )
    
    return {
        "id_silabo": silabo.id,
        "id_curso": curso.id,
        "nombre_curso": curso.nombre,
        "es_oficial": False,
        "validado": silabo.es_validado,
        "aviso": silabo.aviso_fiabilidad,
        "advertencias": validacion["advertencias"],
        "sugerencia": "Para cálculos precisos, usa el modo simulación con reglas explícitas."
    }

@router.get("/{id_silabo}/chunks")
async def obtener_chunks(id_silabo: int, db: Session = Depends(get_db)):
    """Obtiene los chunks de un silabo (debug)"""
    chunks = db.query(SilaboChunk).filter(SilaboChunk.id_silabo == id_silabo).all()
    return {
        "total": len(chunks),
        "chunks": [{"id": c.id, "tipo": c.tipo_seccion, "unidad": c.unidad, "texto_preview": c.chunk_texto[:200]} for c in chunks]
    }