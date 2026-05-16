from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Any, List
import datetime
import os
import uuid
from app.database.connection import get_db
from app.database.models import (
    Usuario, Silabo, Curso, PeriodoAcademico, 
    EstadoVerificacion, AmbitoUso, TipoSilabo, 
    TipoIncidenteServicio, RolUsuario, CoincidenciaPeriodo,
    ContextoCursoUsuario, OrigenContexto
)
from app.services.pdf_parser import PDFParserService
from app.services.ai_parser import gemini_parser
from app.services.itil_desk import ITILServiceDesk
from app.api.dependencies import get_current_user_from_token

router = APIRouter(prefix="/silabo", tags=["Gestión de Sílabos"])

class RevisionRequest(BaseModel):
    comentario: Optional[str] = None
    id_periodo_nuevo: Optional[int] = None

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

    # 6. Guardar Sílabo
    nuevo_silabo = Silabo(
        id_curso=id_curso,
        id_periodo=id_periodo,
        id_usuario_subida=current_user.id,
        nombre_archivo=archivo.filename,
        ruta_pdf=relative_path,
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
    
    # 7. Registrar incidente de servicio si falló el parsing
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
    
    # 3.1 Guardar archivo físico
    filename = f"{uuid.uuid4()}_{archivo.filename}"
    filepath = os.path.join("app", "static", "uploads", "syllabi", filename)
    with open(filepath, "wb") as f:
        f.write(contenido)
    
    relative_path = f"/static/uploads/syllabi/{filename}"
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
        ruta_pdf=relative_path,
        texto_extraido=texto[:15000],
        tipo_silabo=TipoSilabo.OFICIAL,
        ambito_uso=ambito,
        estado_validacion=estado,
        puntaje_confianza=score,
        coincidencia_periodo=parsing_data["coincidencias"].get("periodo", False),
        reglas_json=parsing_data.get("formulas")
    )
    
    db.add(nuevo_silabo)
    db.commit()
    db.refresh(nuevo_silabo)
    
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
