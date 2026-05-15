from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Any, List
import datetime
from app.database.connection import get_db
from app.database.models import (
    Usuario, Silabo, Curso, PeriodoAcademico, 
    EstadoVerificacion, AmbitoUso, TipoSilabo, 
    TipoIncidenteServicio, RolUsuario, CoincidenciaPeriodo,
    ContextoCursoUsuario, OrigenContexto, SilaboChunk, TipoSeccionChunk
)
from app.services.pdf_parser import PDFParserService
from app.services.ai_parser import gemini_parser
from app.services.itil_desk import ITILServiceDesk
from app.services.chunker import ChunkerService
from app.services.embeddings import embedding_service
from app.api.dependencies import get_current_user_from_token

router = APIRouter(prefix="/silabo", tags=["Gestión de Sílabos"])

class RevisionRequest(BaseModel):
    comentario: Optional[str] = None

@router.post("/upload")
async def subir_silabo(
    id_curso: int = Form(...),
    id_periodo: int = Form(...),
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user_from_token)
):
    """Flujo robusto de subida de sílabo con validación automática"""
    
    # 1. Validar que no exista sílabo oficial publicado
    oficial = db.query(Silabo).filter(
        Silabo.id_curso == id_curso,
        Silabo.id_periodo == id_periodo,
        Silabo.tipo_silabo == TipoSilabo.OFICIAL,
        Silabo.ambito_uso == AmbitoUso.PUBLICADO
    ).first()
    
    if oficial:
        raise HTTPException(status_code=400, detail="Ya existe un sílabo oficial para este curso y periodo")

    # 2. Procesar PDF
    contenido = await archivo.read()
    texto = PDFParserService.extraer_texto(contenido)
    
    # 3. Obtener referencias para el score
    curso = db.query(Curso).filter(Curso.id_curso == id_curso).first()
    periodo = db.query(PeriodoAcademico).filter(PeriodoAcademico.id_periodo == id_periodo).first()
    
    if not curso or not periodo:
        raise HTTPException(status_code=404, detail="Curso o Periodo no encontrado")

    # 4. Parsing Gemini + Confidence Score
    parsing_data = gemini_parser.extraer_estructura_completa(
        texto, curso.nombre_curso, periodo.nombre
    )
    
    score = parsing_data["puntaje_confianza"]
    coincidencias = parsing_data["coincidencias"]
    
    # 5. Determinar estado y ámbito según score (Reglas ITIL 4)
    estado = EstadoVerificacion.PENDIENTE_CONFIRMACION
    ambito = AmbitoUso.PRIVADO
    
    if score >= 70 and coincidencias["estructura"]:
        estado = EstadoVerificacion.APROBADO
    elif score < 40:
        estado = EstadoVerificacion.RECHAZADO
        
    if score > 80:
        ambito = AmbitoUso.COMPARTIBLE # Candidato a revisión

    # 6. Guardar Sílabo
    nuevo_silabo = Silabo(
        id_curso=id_curso,
        id_periodo=id_periodo,
        id_usuario_subida=current_user.id,
        nombre_archivo=archivo.filename,
        texto_extraido=texto[:15000],
        tipo_silabo=TipoSilabo.SUBIDO_USUARIO,
        ambito_uso=ambito,
        estado_validacion=estado,
        puntaje_confianza=score,
        coincidencia_periodo=coincidencias["periodo"],
        reglas_json=parsing_data.get("formulas")
    )
    
    db.add(nuevo_silabo)
    db.commit()
    db.refresh(nuevo_silabo)
    
    # 7. Crear Chunks para RAG
    metadata_base = {"nombre_curso": curso.nombre_curso}
    chunks_creados = ChunkerService.crear_chunks(nuevo_silabo.texto_extraido, metadata_base)
    for c in chunks_creados:
        emb = embedding_service.generar_embedding(c["texto"])
        
        tipo_str = c["metadata"].get("tipo_seccion", "").upper()
        tipo_enum = TipoSeccionChunk.CONTENIDOS
        if "COMPETENCIA" in tipo_str:
            tipo_enum = TipoSeccionChunk.COMPETENCIAS
        elif "EVALUA" in tipo_str or "CRITERIO" in tipo_str:
            tipo_enum = TipoSeccionChunk.EVALUACION
        elif "TUTOR" in tipo_str:
            tipo_enum = TipoSeccionChunk.TUTORIA
        elif "SUMILLA" in tipo_str:
            tipo_enum = TipoSeccionChunk.SUMILLA
        elif "FORMULA" in tipo_str:
            tipo_enum = TipoSeccionChunk.FORMULA
            
        nuevo_chunk = SilaboChunk(
            id_silabo=nuevo_silabo.id_silabo,
            contenido=c["texto"],
            tipo_seccion=tipo_enum,
            embedding=emb,
            metadata_json=c["metadata"]
        )
        db.add(nuevo_chunk)
    db.commit()
    
    # 7. Auto-asignar el sílabo al contexto del estudiante
    contexto_estudiante = db.query(ContextoCursoUsuario).filter(
        ContextoCursoUsuario.id_usuario == current_user.id,
        ContextoCursoUsuario.id_curso == id_curso,
        ContextoCursoUsuario.id_periodo == id_periodo
    ).first()

    if contexto_estudiante:
        contexto_estudiante.id_silabo_asignado = nuevo_silabo.id_silabo
        contexto_estudiante.origen_contexto = OrigenContexto.DECLARADO_USUARIO
        contexto_estudiante.puntaje_confianza = score
        # Hereda el estado: APROBADO (si score >= 70) o PENDIENTE_CONFIRMACION
        contexto_estudiante.estado_verificacion = estado 
        db.commit()
    
    # 8. Registrar incidente de servicio si falló el parsing
    if score < 50:
        ITILServiceDesk.registrar_incidente_servicio(
            db, nuevo_silabo.id_silabo, 
            TipoIncidenteServicio.FALLO_PARSING if score > 20 else TipoIncidenteServicio.PDF_ILEGIBLE,
            f"Bajo score de confianza: {score}%",
            id_usuario=current_user.id
        )
        
    # 8. Procesar agrupamiento
    ITILServiceDesk.procesar_agrupamiento_conocimiento(db, id_curso, id_periodo)
    
    return {
        "success": True,
        "id_silabo": nuevo_silabo.id_silabo,
        "id_curso": id_curso,
        "id_periodo": id_periodo,
        "nombre_archivo": archivo.filename,
        "score": score,
        "estado": estado,
        "ambito": ambito,
        "mensaje": f"Sílabo procesado con {score}% de confianza.",
        "nombre_curso": curso.nombre_curso,
        "codigo_curso": curso.codigo_curso
    }

@router.get("/revisar", response_model=List[dict])
async def listar_pendientes_revision(
    current_user: Usuario = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    if current_user.rol != RolUsuario.ADMIN:
        raise HTTPException(status_code=403, detail="Acceso denegado")
        
    silabos = db.query(Silabo).filter(
        Silabo.estado_validacion == EstadoVerificacion.PENDIENTE_CONFIRMACION
    ).all()
    
    return [
        {
            "id_silabo": s.id_silabo,
            "curso": s.curso.nombre_curso,
            "usuario": s.usuario_subida.codigo_universitario,
            "score": s.puntaje_confianza,
            "fecha": s.fecha_subida
        } for s in silabos
    ]

@router.post("/aprobar/{id_silabo}")
async def aprobar_silabo(
    id_silabo: int,
    request: RevisionRequest,
    current_user: Usuario = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    if current_user.rol != RolUsuario.ADMIN:
        raise HTTPException(status_code=403, detail="Acceso denegado")
        
    silabo = db.query(Silabo).filter(Silabo.id_silabo == id_silabo).first()
    if not silabo:
        raise HTTPException(status_code=404, detail="Sílabo no encontrado")

    silabo.estado_validacion = EstadoVerificacion.APROBADO
    silabo.ambito_uso = AmbitoUso.PUBLICADO
    silabo.observaciones_validacion = request.comentario

    # Sincronizar el estado del sílabo con los contextos del estudiante
    contextos_actualizados = db.query(ContextoCursoUsuario).filter(
        ContextoCursoUsuario.id_curso == silabo.id_curso,
        ContextoCursoUsuario.id_periodo == silabo.id_periodo
    ).all()

    for contexto in contextos_actualizados:
        contexto.id_silabo_asignado = silabo.id_silabo
        contexto.origen_contexto = OrigenContexto.OFICIAL
        contexto.estado_verificacion = EstadoVerificacion.OFICIAL
        contexto.puntaje_confianza = silabo.puntaje_confianza or contexto.puntaje_confianza

    db.commit()
    return {
        "message": "Sílabo aprobado y publicado",
        "contextos_actualizados": len(contextos_actualizados),
        "id_silabo": silabo.id_silabo,
        "id_curso": silabo.id_curso,
        "id_periodo": silabo.id_periodo,
        "estado_validacion": silabo.estado_validacion,
        "ambito_uso": silabo.ambito_uso,
    }

@router.post("/rechazar/{id_silabo}")
async def rechazar_silabo(
    id_silabo: int,
    request: RevisionRequest,
    current_user: Usuario = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    if current_user.rol != RolUsuario.ADMIN:
        raise HTTPException(status_code=403, detail="Acceso denegado")
        
    silabo = db.query(Silabo).filter(Silabo.id_silabo == id_silabo).first()
    if not silabo:
        raise HTTPException(status_code=404, detail="Sílabo no encontrado")

    silabo.estado_validacion = EstadoVerificacion.RECHAZADO
    silabo.observaciones_validacion = request.comentario
    db.commit()
    return {
        "message": "Sílabo rechazado",
        "id_silabo": silabo.id_silabo,
        "id_curso": silabo.id_curso,
        "id_periodo": silabo.id_periodo,
        "estado_validacion": silabo.estado_validacion,
    }

# ==================== ADMIN: GESTIÓN OFICIAL DE SÍLABOS ====================

@router.post("/upload-oficial")
async def subir_silabo_oficial(
    id_curso: int = Form(...),
    id_periodo: int = Form(...),
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user_from_token)
):
    """Endpoint para que ADMIN cargue sílabos oficiales directamente"""
    
    # 1. Validar que sea ADMIN
    if current_user.rol != RolUsuario.ADMIN:
        raise HTTPException(status_code=403, detail="Solo administradores pueden subir sílabos oficiales")
    
    # 2. Validar que no exista sílabo oficial publicado para este curso/periodo
    oficial_existente = db.query(Silabo).filter(
        Silabo.id_curso == id_curso,
        Silabo.id_periodo == id_periodo,
        Silabo.tipo_silabo == TipoSilabo.OFICIAL,
        Silabo.ambito_uso == AmbitoUso.PUBLICADO
    ).first()
    
    if oficial_existente:
        raise HTTPException(status_code=400, detail="Ya existe un sílabo oficial publicado para este curso y período")

    # 3. Procesar PDF
    contenido = await archivo.read()
    texto = PDFParserService.extraer_texto(contenido)
    
    # 4. Obtener referencias
    curso = db.query(Curso).filter(Curso.id_curso == id_curso).first()
    periodo = db.query(PeriodoAcademico).filter(PeriodoAcademico.id_periodo == id_periodo).first()
    
    if not curso or not periodo:
        raise HTTPException(status_code=404, detail="Curso o Período no encontrado")

    # 5. Parsing con Gemini (para extracción de contenido)
    parsing_data = gemini_parser.extraer_estructura_completa(
        texto, curso.nombre_curso, periodo.nombre
    )
    
    score = parsing_data["puntaje_confianza"]
    
    # 6. Los sílabos oficiales se aprueban directamente
    estado = EstadoVerificacion.APROBADO
    ambito = AmbitoUso.PUBLICADO
    
    # 7. Crear Sílabo Oficial
    nuevo_silabo = Silabo(
        id_curso=id_curso,
        id_periodo=id_periodo,
        id_usuario_subida=current_user.id,
        nombre_archivo=archivo.filename,
        texto_extraido=texto[:15000],
        tipo_silabo=TipoSilabo.OFICIAL,
        ambito_uso=ambito,
        estado_validacion=estado,
        puntaje_confianza=score,
        coincidencia_periodo=parsing_data["coincidencias"].get("periodo", False),
        reglas_json=parsing_data
    )
    
    db.add(nuevo_silabo)
    db.commit()
    db.refresh(nuevo_silabo)
    
    # 8. Crear Chunks para RAG
    metadata_base = {"nombre_curso": curso.nombre_curso}
    chunks_creados = ChunkerService.crear_chunks(nuevo_silabo.texto_extraido, metadata_base)
    for c in chunks_creados:
        emb = embedding_service.generar_embedding(c["texto"])
        
        tipo_str = c["metadata"].get("tipo_seccion", "").upper()
        tipo_enum = TipoSeccionChunk.CONTENIDOS
        if "COMPETENCIA" in tipo_str:
            tipo_enum = TipoSeccionChunk.COMPETENCIAS
        elif "EVALUA" in tipo_str or "CRITERIO" in tipo_str:
            tipo_enum = TipoSeccionChunk.EVALUACION
        elif "TUTOR" in tipo_str:
            tipo_enum = TipoSeccionChunk.TUTORIA
        elif "SUMILLA" in tipo_str:
            tipo_enum = TipoSeccionChunk.SUMILLA
        elif "FORMULA" in tipo_str:
            tipo_enum = TipoSeccionChunk.FORMULA
            
        nuevo_chunk = SilaboChunk(
            id_silabo=nuevo_silabo.id_silabo,
            contenido=c["texto"],
            tipo_seccion=tipo_enum,
            embedding=emb,
            metadata_json=c["metadata"]
        )
        db.add(nuevo_chunk)
    db.commit()
    
    # 8. Sincronizar automáticamente con contextos de estudiantes
    contextos = db.query(ContextoCursoUsuario).filter(
        ContextoCursoUsuario.id_curso == id_curso,
        ContextoCursoUsuario.id_periodo == id_periodo
    ).all()

    for contexto in contextos:
        contexto.id_silabo_asignado = nuevo_silabo.id_silabo
        contexto.origen_contexto = OrigenContexto.OFICIAL
        contexto.estado_verificacion = EstadoVerificacion.OFICIAL
        contexto.puntaje_confianza = score

    db.commit()
    
    # 9. Procesar agrupamiento
    ITILServiceDesk.procesar_agrupamiento_conocimiento(db, id_curso, id_periodo)
    
    return {
        "success": True,
        "id_silabo": nuevo_silabo.id_silabo,
        "id_curso": id_curso,
        "id_periodo": id_periodo,
        "nombre_archivo": archivo.filename,
        "nombre_curso": curso.nombre_curso,
        "codigo_curso": curso.codigo_curso,
        "periodo": periodo.nombre,
        "score": score,
        "estado": estado,
        "ambito": ambito,
        "contextos_sincronizados": len(contextos),
        "mensaje": "Sílabo oficial cargado y publicado exitosamente"
    }

@router.get("/list-oficial")
async def listar_silabos_oficiales(
    id_curso: Optional[int] = None,
    id_periodo: Optional[int] = None,
    current_user: Usuario = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Lista todos los sílabos oficiales publicados (admin only)"""
    
    if current_user.rol != RolUsuario.ADMIN:
        raise HTTPException(status_code=403, detail="Solo administradores pueden listar sílabos oficiales")
    
    query = db.query(Silabo).filter(
        Silabo.tipo_silabo == TipoSilabo.OFICIAL,
        Silabo.ambito_uso == AmbitoUso.PUBLICADO
    )
    
    if id_curso:
        query = query.filter(Silabo.id_curso == id_curso)
    if id_periodo:
        query = query.filter(Silabo.id_periodo == id_periodo)
    
    silabos = query.order_by(Silabo.fecha_subida.desc()).all()
    
    return [
        {
            "id_silabo": s.id_silabo,
            "id_curso": s.id_curso,
            "id_periodo": s.id_periodo,
            "nombre_archivo": s.nombre_archivo,
            "nombre_curso": s.curso.nombre_curso,
            "codigo_curso": s.curso.codigo_curso,
            "periodo": s.periodo.nombre,
            "score": s.puntaje_confianza,
            "estado": s.estado_validacion,
            "fecha_subida": s.fecha_subida.isoformat() if s.fecha_subida else None,
            "subido_por": s.usuario_subida.email if s.usuario_subida else "Sistema"
        } for s in silabos
    ]

@router.get("/{id_silabo}/detalle")
async def obtener_detalle_silabo(
    id_silabo: int,
    current_user: Usuario = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Obtiene toda la información detallada de un sílabo"""
    
    silabo = db.query(Silabo).filter(Silabo.id_silabo == id_silabo).first()
    if not silabo:
        raise HTTPException(status_code=404, detail="Sílabo no encontrado")
    
    # Validar acceso: Admin siempre, estudiantes solo si es oficial publicado
    if current_user.rol != RolUsuario.ADMIN:
        if silabo.tipo_silabo != TipoSilabo.OFICIAL or silabo.ambito_uso != AmbitoUso.PUBLICADO:
            raise HTTPException(status_code=403, detail="Acceso denegado a este sílabo")
    
    return {
        "id_silabo": silabo.id_silabo,
        "id_curso": silabo.id_curso,
        "id_periodo": silabo.id_periodo,
        "nombre_archivo": silabo.nombre_archivo,
        "nombre_curso": silabo.curso.nombre_curso,
        "codigo_curso": silabo.curso.codigo_curso,
        "periodo": silabo.periodo.nombre,
        "tipo_silabo": silabo.tipo_silabo,
        "ambito_uso": silabo.ambito_uso,
        "estado_validacion": silabo.estado_validacion,
        "score": silabo.puntaje_confianza,
        "texto_extraido": silabo.texto_extraido,
        "reglas_json": silabo.reglas_json,
        "coincidencia_periodo": silabo.coincidencia_periodo,
        "observaciones_validacion": silabo.observaciones_validacion,
        "fecha_subida": silabo.fecha_subida.isoformat() if silabo.fecha_subida else None,
        "subido_por": {
            "id": silabo.usuario_subida.id if silabo.usuario_subida else None,
            "email": silabo.usuario_subida.email if silabo.usuario_subida else None,
            "nombre": f"{silabo.usuario_subida.nombres} {silabo.usuario_subida.apellidos}" if silabo.usuario_subida else None
        },
        "estudiantes_asignados": len([
            ec for ec in db.query(ContextoCursoUsuario).filter(
                ContextoCursoUsuario.id_silabo_asignado == id_silabo
            ).all()
        ]) if silabo.tipo_silabo == TipoSilabo.OFICIAL else 0
    }
