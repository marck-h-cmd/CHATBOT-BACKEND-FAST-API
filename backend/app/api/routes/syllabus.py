from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Any, List
import datetime
import os
import uuid
from app.database.connection import get_db
from app.database.models import (
    Usuario, Silabo, Curso, PeriodoAcademico, SilaboChunk,
    EstadoVerificacion, AmbitoUso, TipoSilabo,
    TipoIncidenteServicio, RolUsuario, CoincidenciaPeriodo,
    ContextoCursoUsuario, OrigenContexto, IncidenteServicio, EstadoIncidente,
    LogIngestion, TipoSeccionChunk
)
from app.services.chunker import ChunkerService
from app.services.pdf_parser import PDFParserService
from app.services.ai_parser import gemini_parser
from app.services.itil_desk import ITILServiceDesk
from app.api.dependencies import get_current_user_from_token

router = APIRouter(prefix="/silabo", tags=["Gestión de Sílabos"])

class RevisionRequest(BaseModel):
    comentario: Optional[str] = None
    id_periodo_nuevo: Optional[int] = None


def _mapear_tipo_chunk(tipo_raw: str) -> TipoSeccionChunk:
    """Mapea tipos de sección del chunker al enum de la base de datos."""
    mapping = {
        "general": TipoSeccionChunk.SUMILLA,
        "competencias": TipoSeccionChunk.COMPETENCIAS,
        "evaluacion": TipoSeccionChunk.EVALUACION,
        "aplazados_susti": TipoSeccionChunk.CRITERIOS,
        "contenidos": TipoSeccionChunk.CONTENIDOS,
        "metodologia": TipoSeccionChunk.CONTENIDOS,
        "tutoria": TipoSeccionChunk.TUTORIA,
        "capacidades": TipoSeccionChunk.COMPETENCIAS,
        "resultados": TipoSeccionChunk.COMPETENCIAS,
    }
    return mapping.get(tipo_raw.lower(), TipoSeccionChunk.SUMILLA)


def _generar_y_guardar_chunks(db: Session, silabo_id: int, texto: str, metadata_base: dict) -> int:
    """Genera chunks del texto y los guarda en silabo_chunk."""
    # Eliminar chunks previos para evitar duplicados
    db.query(SilaboChunk).filter(SilaboChunk.id_silabo == silabo_id).delete(synchronize_session=False)

    chunks = ChunkerService.crear_chunks(texto, metadata_base)
    for chunk in chunks:
        tipo_raw = chunk.get("metadata", {}).get("tipo_seccion", "general")
        tipo_enum = _mapear_tipo_chunk(tipo_raw)
        meta = chunk.get("metadata") or {}
        meta.pop("unidad", None)
        db.add(SilaboChunk(
            id_silabo=silabo_id,
            tipo_seccion=tipo_enum,
            titulo=tipo_raw[:200],
            contenido=chunk["texto"],
            metadata_json=meta,
        ))
    db.commit()
    return len(chunks)


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
    
    # 2.1 Guardar archivo físico para consulta administrativa
    filename = f"{uuid.uuid4()}_{archivo.filename}"
    filepath = os.path.join("app", "static", "uploads", "syllabi", filename)
    with open(filepath, "wb") as f:
        f.write(contenido)
    
    relative_path = f"/static/uploads/syllabi/{filename}"
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
    # REGLA ESTRICTA DE NEGOCIO: No aprobar automáticamente si el periodo no es el ACTUAL
    estado = EstadoVerificacion.PENDIENTE_CONFIRMACION
    ambito = AmbitoUso.PRIVADO
    
    # 5.1 Caso: El periodo coincide exactamente con el actual
    if coincidencias["periodo"] == CoincidenciaPeriodo.ACTUAL:
        if score >= 70 and coincidencias["estructura"]:
            estado = EstadoVerificacion.APROBADO
        elif score < 40:
            estado = EstadoVerificacion.RECHAZADO
        else:
            estado = EstadoVerificacion.PENDIENTE_CONFIRMACION
            
    # 5.2 Caso: Es un sílabo de un periodo anterior (2025 vs 2026)
    elif coincidencias["periodo"] == CoincidenciaPeriodo.ANTERIOR:
        # Nunca aprobamos automáticamente periodos antiguos
        estado = EstadoVerificacion.PENDIENTE_CONFIRMACION
        
    # 5.3 Caso: Periodo no coincide en absoluto o es desconocido
    else:
        if score < 60:
            estado = EstadoVerificacion.RECHAZADO
        else:
            estado = EstadoVerificacion.PENDIENTE_CONFIRMACION
            
    if estado == EstadoVerificacion.APROBADO and score > 80:
        ambito = AmbitoUso.COMPARTIBLE # Candidato a revisión por ser altamente confiable

    # 5.4 Validar fórmulas y evidencias con ITILServiceDesk
    errores_formulas = ITILServiceDesk.validar_formulas_evidencias(parsing_data)
    if errores_formulas:
        estado = EstadoVerificacion.PENDIENTE_CONFIRMACION
        score = max(10, score - 30) # Penalizar score por inconsistencia

    # 6. Guardar Sílabo (Guardamos parsing_data completo en reglas_json para mejor RAG)
    nuevo_silabo = Silabo(
        id_curso=id_curso,
        id_periodo=id_periodo,
        id_usuario_subida=current_user.id,
        nombre_archivo=archivo.filename,
        ruta_pdf=relative_path,
        texto_extraido=texto,
        tipo_silabo=TipoSilabo.SUBIDO_USUARIO,
        ambito_uso=ambito,
        estado_validacion=estado,
        puntaje_confianza=score,
        coincidencia_periodo=coincidencias["periodo"],
        reglas_json=parsing_data
    )
    
    db.add(nuevo_silabo)
    db.commit()
    db.refresh(nuevo_silabo)

    # Generar chunks para RAG
    _generar_y_guardar_chunks(
        db, nuevo_silabo.id_silabo, texto,
        {"nombre_curso": curso.nombre_curso, "codigo_curso": curso.codigo_curso}
    )

    # Actualizar el contexto del estudiante que acaba de subir el sílabo
    contexto_usuario = db.query(ContextoCursoUsuario).filter(
        ContextoCursoUsuario.id_usuario == current_user.id,
        ContextoCursoUsuario.id_curso == id_curso,
        ContextoCursoUsuario.id_periodo == id_periodo
    ).first()

    if contexto_usuario:
        contexto_usuario.id_silabo_asignado = nuevo_silabo.id_silabo
        contexto_usuario.estado_verificacion = estado
        contexto_usuario.puntaje_confianza = score
        db.commit()
    
    # 7. Registrar incidente de servicio si falló el parsing o hay errores de fórmula
    if errores_formulas:
        desc_errores = "; ".join(errores_formulas)
        ITILServiceDesk.registrar_incidente_servicio(
            db, nuevo_silabo.id_silabo, 
            TipoIncidenteServicio.FORMULA_AMBIGUA,
            f"Errores en fórmulas de evaluación: {desc_errores}",
            id_usuario=current_user.id
        )
    elif score < 50:
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
        "codigo_curso": curso.codigo_curso,
        "datos_extraidos": {
            "unidades": parsing_data.get("unidades", []),
            "formulas": parsing_data.get("formulas", {}),
            "evidencias": parsing_data.get("evidencias", {}),
            "capacidades": parsing_data.get("capacidades", []),
            "resultados_aprendizaje": parsing_data.get("resultados_aprendizaje", []),
            "metodologia": parsing_data.get("metodologia", []),
            "niveles_logro": parsing_data.get("niveles_logro", []),
            "tutoria": parsing_data.get("tutoria", {}),
        }
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
    ).order_by(Silabo.fecha_subida.desc()).all()
    
    result = []
    for s in silabos:
        # Generar advertencias basadas en metadatos para ayudar al Admin
        advertencias = []
        if s.coincidencia_periodo == CoincidenciaPeriodo.ANTERIOR:
            advertencias.append("Este sílabo pertenece a un periodo académico anterior.")
        elif s.coincidencia_periodo == CoincidenciaPeriodo.NO_COINCIDE:
            advertencias.append("⚠️ El periodo detectado en el PDF no coincide con el curso actual.")
            
        if s.puntaje_confianza < 50:
            advertencias.append("La IA tuvo dificultades para extraer las fórmulas de calificación.")

        result.append({
            "id_silabo": s.id_silabo,
            "id_curso": s.id_curso,
            "id_periodo": s.id_periodo,
            "codigo_curso": s.curso.codigo_curso if s.curso else "N/A",
            "nombre_curso": s.curso.nombre_curso if s.curso else "Curso Desconocido",
            "codigo_periodo": s.periodo.nombre if s.periodo else "N/A",
            "puntaje_confianza": s.puntaje_confianza,
            "usuario_nombre": f"{s.usuario_subida.nombres} {s.usuario_subida.apellidos}" if s.usuario_subida else "Sistema",
            "codigo_universitario": s.usuario_subida.codigo_universitario if s.usuario_subida else "N/A",
            "fecha_subida": s.fecha_subida.isoformat() if s.fecha_subida else None,
            "fiabilidad": s.aviso_fiabilidad or "Requiere validación humana para asegurar precisión.",
            "ruta_pdf": s.ruta_pdf,
            "advertencias": advertencias
        })
    
    return result

@router.post("/aprobar/{id_silabo}")
async def aprobar_silabo(
    id_silabo: int,
    request: RevisionRequest,
    current_user: Usuario = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    print(f"DEBUG: Intentando aprobar silabo {id_silabo}")
    print(f"DEBUG: Request: {request.dict()}")
    if current_user.rol != RolUsuario.ADMIN:
        raise HTTPException(status_code=403, detail="Acceso denegado")
        
    silabo = db.query(Silabo).filter(Silabo.id_silabo == id_silabo).first()
    if not silabo:
        raise HTTPException(status_code=404, detail="Sílabo no encontrado")

    # LÓGICA DE CORRECCIÓN DE PERIODO (Si el admin detectó que el alumno se equivocó al matricularse)
    periodo_original = silabo.id_periodo
    if request.id_periodo_nuevo and request.id_periodo_nuevo != periodo_original:
        silabo.id_periodo = request.id_periodo_nuevo
        
        # Migrar la matrícula del alumno al periodo correcto si es necesario
        contexto_estudiante = db.query(ContextoCursoUsuario).filter(
            ContextoCursoUsuario.id_usuario == silabo.id_usuario_subida,
            ContextoCursoUsuario.id_curso == silabo.id_curso,
            ContextoCursoUsuario.id_periodo == periodo_original
        ).first()
        
        if contexto_estudiante:
            # Verificar si ya existe matrícula en el nuevo periodo
            existe_en_nuevo = db.query(ContextoCursoUsuario).filter(
                ContextoCursoUsuario.id_usuario == silabo.id_usuario_subida,
                ContextoCursoUsuario.id_curso == silabo.id_curso,
                ContextoCursoUsuario.id_periodo == request.id_periodo_nuevo
            ).first()
            
            if not existe_en_nuevo:
                contexto_estudiante.id_periodo = request.id_periodo_nuevo
            else:
                # Si ya existe, simplemente vinculamos el sílabo a esa y borramos la "errónea"
                db.delete(contexto_estudiante)
                contexto_estudiante = existe_en_nuevo

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

    # Generar chunks para RAG (si no existían)
    if silabo.texto_extraido:
        curso = db.query(Curso).filter(Curso.id_curso == silabo.id_curso).first()
        metadata = {"nombre_curso": curso.nombre_curso, "codigo_curso": curso.codigo_curso} if curso else {}
        _generar_y_guardar_chunks(db, silabo.id_silabo, silabo.texto_extraido, metadata)

    return {
        "message": f"Sílabo aprobado y publicado. Se actualizaron {len(contextos_actualizados)} contextos.",
        "periodo_corregido": request.id_periodo_nuevo is not None,
        "id_silabo": silabo.id_silabo,
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

@router.get("/test-cors")
async def test_cors():
    """Endpoint de prueba para verificar CORS"""
    from fastapi.responses import JSONResponse
    return JSONResponse(
        content={"message": "CORS test successful"},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "*"
        }
    )

@router.post("/test-formdata")
async def test_formdata(
    id_curso: str = Form(None),
    id_periodo: str = Form(None),
    archivo: UploadFile = File(None)
):
    """Endpoint de prueba para verificar FormData"""
    print(f"TEST: id_curso={id_curso}, id_periodo={id_periodo}, archivo={archivo.filename if archivo else None}")
    return {
        "id_curso": id_curso,
        "id_periodo": id_periodo,
        "archivo": archivo.filename if archivo else None,
        "archivo_size": archivo.size if archivo else None
    }

@router.post("/upload-simple")
async def upload_simple(request: Request):
    """Endpoint ultra simple para probar upload"""
    print("UPLOAD SIMPLE: Iniciando")
    try:
        form = await request.form()
        print(f"UPLOAD SIMPLE: Form recibido con {len(form)} campos")
        for key, value in form.items():
            print(f"  {key}: {value}")
        return {"status": "ok", "fields": len(form)}
    except Exception as e:
        print(f"UPLOAD SIMPLE ERROR: {e}")
        return {"status": "error", "message": str(e)}

@router.options("/upload-oficial")
async def options_upload_oficial():
    """Manejo manual de OPTIONS para CORS"""
    from fastapi.responses import Response
    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Max-Age": "3600"
        }
    )

@router.post("/upload-oficial")
async def subir_silabo_oficial(request: Request):
    """Endpoint simplificado para pruebas"""
    print("UPLOAD OFICIAL: Iniciando")
    try:
        form = await request.form()
        print(f"UPLOAD OFICIAL: Form recibido con {len(form)} campos")
        for key, value in form.items():
            print(f"  {key}: {value}")
        return {"status": "ok", "fields": len(form)}
    except Exception as e:
        print(f"UPLOAD OFICIAL ERROR: {e}")
        import traceback
        traceback.print_exc()
        return {"status": "error", "message": str(e)}

@router.post("/upload-syllabus-test")
async def upload_syllabus_test(request: Request):
    """Endpoint de prueba con nombre completamente diferente"""
    print("UPLOAD TEST: Iniciando")
    try:
        form = await request.form()
        print(f"UPLOAD TEST: Form recibido con {len(form)} campos")
        for key, value in form.items():
            print(f"  {key}: {value}")
        return {"status": "ok", "fields": len(form)}
    except Exception as e:
        print(f"UPLOAD TEST ERROR: {e}")
        import traceback
        traceback.print_exc()
        return {"status": "error", "message": str(e)}

@router.delete("/oficial/{id_silabo}")
async def eliminar_silabo_oficial(
    id_silabo: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user_from_token)
):
    """Endpoint para que ADMIN elimine un sílabo oficial existente"""

    # 1. Validar que sea ADMIN
    if current_user.rol != RolUsuario.ADMIN:
        raise HTTPException(status_code=403, detail="Solo administradores pueden eliminar sílabos oficiales")

    # 2. Buscar el sílabo
    silabo = db.query(Silabo).filter(Silabo.id_silabo == id_silabo).first()
    if not silabo:
        raise HTTPException(status_code=404, detail="Sílabo no encontrado")

    if silabo.tipo_silabo != TipoSilabo.OFICIAL:
        raise HTTPException(status_code=400, detail="Solo se pueden eliminar sílabos oficiales")

    # 3. Desvincular contextos de estudiantes que usan este sílabo
    contextos = db.query(ContextoCursoUsuario).filter(
        ContextoCursoUsuario.id_silabo_asignado == id_silabo
    ).all()
    for ctx in contextos:
        ctx.id_silabo_asignado = None
        ctx.origen_contexto = OrigenContexto.SIN_SILABO
        ctx.estado_verificacion = EstadoVerificacion.PENDIENTE_CONFIRMACION

    # 4. Eliminar chunks relacionados
    db.query(SilaboChunk).filter(SilaboChunk.id_silabo == id_silabo).delete(synchronize_session=False)

    # 5. Eliminar registros que dependen del sílabo con FK NOT NULL y sin CASCADE
    db.query(IncidenteServicio).filter(IncidenteServicio.id_silabo == id_silabo).delete(synchronize_session=False)
    db.query(LogIngestion).filter(LogIngestion.id_silabo == id_silabo).delete(synchronize_session=False)

    # 6. Guardar ruta del PDF antes de eliminar
    ruta_pdf = silabo.ruta_pdf

    # 6. Eliminar el sílabo de la base de datos
    db.delete(silabo)
    db.commit()

    # 7. Eliminar archivo físico si existe
    if ruta_pdf:
        filepath = os.path.join("app", ruta_pdf.lstrip("/").replace("/", os.sep))
        try:
            if os.path.exists(filepath):
                os.remove(filepath)
        except OSError:
            pass  # No crítico si el archivo no se puede eliminar

    return {
        "success": True,
        "id_silabo": id_silabo,
        "mensaje": "Sílabo oficial eliminado exitosamente",
        "contextos_desvinculados": len(contextos)
    }

@router.get("/list-oficial")
async def listar_silabos_oficiales(
    id_curso: Optional[int] = None,
    id_periodo: Optional[int] = None,
    current_user: Usuario = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Lista todos los sílabos oficiales (admin only) - incluye pendientes, aprobados y rechazados"""
    
    if current_user.rol != RolUsuario.ADMIN:
        raise HTTPException(status_code=403, detail="Solo administradores pueden listar sílabos oficiales")
    
    query = db.query(Silabo).filter(
        Silabo.tipo_silabo == TipoSilabo.OFICIAL
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
            "nombre_curso": s.curso.nombre_curso if s.curso else "Curso Desconocido",
            "codigo_curso": s.curso.codigo_curso if s.curso else "N/A",
            "escuela": s.curso.escuela if s.curso else "N/A",
            "periodo": s.periodo.nombre if s.periodo else "N/A",
            "score": s.puntaje_confianza,
            "estado": s.estado_validacion,
            "ambito_uso": s.ambito_uso,
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
        "ruta_pdf": silabo.ruta_pdf,
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

@router.get("/incidentes-servicio")
async def listar_incidentes_servicio(
    current_user: Usuario = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Lista todos los incidentes de servicio activos (Admin only)"""
    if current_user.rol != RolUsuario.ADMIN:
        raise HTTPException(status_code=403, detail="Acceso denegado")
        
    incidentes = db.query(IncidenteServicio).filter(
        IncidenteServicio.estado == EstadoIncidente.ACTIVO
    ).order_by(IncidenteServicio.fecha_creacion.desc()).all()
    
    return [
        {
            "id_incidente_servicio": inc.id_incidente_servicio,
            "id_silabo": inc.id_silabo,
            "tipo_incidente": inc.tipo_incidente,
            "descripcion": inc.descripcion,
            "fecha_creacion": inc.fecha_creacion.isoformat() if inc.fecha_creacion else None,
            "nombre_archivo": inc.silabo.nombre_archivo if inc.silabo else "N/A",
            "nombre_curso": inc.silabo.curso.nombre_curso if inc.silabo and inc.silabo.curso else "N/A",
            "periodo": inc.silabo.periodo.nombre if inc.silabo and inc.silabo.periodo else "N/A",
            "usuario": f"{inc.silabo.usuario_subida.nombres} {inc.silabo.usuario_subida.apellidos}" if inc.silabo and inc.silabo.usuario_subida else "Sistema"
        } for inc in incidentes
    ]

@router.post("/incidentes-servicio/{id_incidente}/resolver")
async def resolver_incidente_servicio(
    id_incidente: int,
    accion: str = Form(...), # REEMPLAZAR_PDF o MANTENER
    archivo: Optional[UploadFile] = File(None),
    current_user: Usuario = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Resuelve un incidente de servicio con opciones de reemplazar PDF o mantenerlo"""
    if current_user.rol != RolUsuario.ADMIN:
        raise HTTPException(status_code=403, detail="Acceso denegado")
        
    incidente = db.query(IncidenteServicio).filter(
        IncidenteServicio.id_incidente_servicio == id_incidente
    ).first()
    
    if not incidente:
        raise HTTPException(status_code=404, detail="Incidente no encontrado")
        
    silabo = incidente.silabo
    if not silabo:
        raise HTTPException(status_code=404, detail="Sílabo asociado no encontrado")

    if accion == "REEMPLAZAR_PDF":
        if not archivo:
            raise HTTPException(status_code=400, detail="Debe proporcionar un nuevo archivo PDF")
            
        contenido = await archivo.read()
        filename = f"{uuid.uuid4()}_{archivo.filename}"
        filepath = os.path.join("app", "static", "uploads", "syllabi", filename)
        with open(filepath, "wb") as f:
            f.write(contenido)
        
        relative_path = f"/static/uploads/syllabi/{filename}"
        texto = PDFParserService.extraer_texto(contenido)
        
        curso = silabo.curso
        periodo = silabo.periodo
        
        parsing_data = gemini_parser.extraer_estructura_completa(
            texto, curso.nombre_curso, periodo.nombre
        )
        
        score = parsing_data["puntaje_confianza"]
        
        # Actualizar sílabo
        silabo.nombre_archivo = archivo.filename
        silabo.ruta_pdf = relative_path
        silabo.texto_extraido = texto[:15000]
        silabo.reglas_json = parsing_data
        silabo.puntaje_confianza = score
        silabo.estado_validacion = EstadoVerificacion.APROBADO
        silabo.ambito_uso = AmbitoUso.PUBLICADO
        
    elif accion == "MANTENER":
        # Forzar aprobación del sílabo actual
        silabo.estado_validacion = EstadoVerificacion.APROBADO
        silabo.ambito_uso = AmbitoUso.PUBLICADO
    else:
        raise HTTPException(status_code=400, detail="Acción no válida")
        
    # Sincronizar con contextos de los estudiantes
    contextos = db.query(ContextoCursoUsuario).filter(
        ContextoCursoUsuario.id_curso == silabo.id_curso,
        ContextoCursoUsuario.id_periodo == silabo.id_periodo
    ).all()

    for contexto in contextos:
        contexto.id_silabo_asignado = silabo.id_silabo
        contexto.origen_contexto = OrigenContexto.OFICIAL
        contexto.estado_verificacion = EstadoVerificacion.OFICIAL
        contexto.puntaje_confianza = silabo.puntaje_confianza

    incidente.estado = EstadoIncidente.RESUELTO
    incidente.fecha_cierre = datetime.datetime.now()
    db.commit()
    
    return {
        "success": True, 
        "message": "Incidente resuelto y sílabo publicado exitosamente",
        "contextos_sincronizados": len(contextos)
    }
