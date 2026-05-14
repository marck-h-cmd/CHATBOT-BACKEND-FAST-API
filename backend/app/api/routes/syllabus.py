from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Any, List
import datetime
from app.database.connection import get_db
from app.database.models import (
    Usuario, Silabo, Curso, PeriodoAcademico, 
    EstadoVerificacion, AmbitoUso, TipoSilabo, 
    TipoIncidenteServicio, RolUsuario, CoincidenciaPeriodo
)
from app.services.pdf_parser import PDFParserService
from app.services.ai_parser import gemini_parser
from app.services.itil_desk import ITILServiceDesk
from app.api.dependencies import get_current_active_user

router = APIRouter(prefix="/silabo", tags=["Gestión de Sílabos"])

class RevisionRequest(BaseModel):
    comentario: Optional[str] = None

@router.post("/upload")
async def subir_silabo(
    id_curso: int = Form(...),
    id_periodo: int = Form(...),
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
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
        id_usuario_subida=current_user.id_usuario,
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
    
    # 7. Registrar incidente de servicio si falló el parsing
    if score < 50:
        ITILServiceDesk.registrar_incidente_servicio(
            db, nuevo_silabo.id_silabo, 
            TipoIncidenteServicio.FALLO_PARSING if score > 20 else TipoIncidenteServicio.PDF_ILEGIBLE,
            f"Bajo score de confianza: {score}%",
            id_usuario=current_user.id_usuario
        )
        
    # 8. Procesar agrupamiento
    ITILServiceDesk.procesar_agrupamiento_conocimiento(db, id_curso, id_periodo)
    
    return {
        "success": True,
        "id_silabo": nuevo_silabo.id_silabo,
        "score": score,
        "estado": estado,
        "ambito": ambito,
        "mensaje": f"Sílabo procesado con {score}% de confianza."
    }

@router.get("/revisar", response_model=List[dict])
async def listar_pendientes_revision(
    current_user: Usuario = Depends(get_current_active_user),
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
            "usuario": s.usuario_subida.codigo_estudiante,
            "score": s.puntaje_confianza,
            "fecha": s.fecha_subida
        } for s in silabos
    ]

@router.post("/aprobar/{id_silabo}")
async def aprobar_silabo(
    id_silabo: int,
    request: RevisionRequest,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.rol != RolUsuario.ADMIN:
        raise HTTPException(status_code=403, detail="Acceso denegado")
        
    silabo = db.query(Silabo).filter(Silabo.id_silabo == id_silabo).first()
    silabo.estado_validacion = EstadoVerificacion.APROBADO
    silabo.ambito_uso = AmbitoUso.PUBLICADO
    silabo.observaciones_validacion = request.comentario
    db.commit()
    return {"message": "Sílabo aprobado y publicado"}

@router.post("/rechazar/{id_silabo}")
async def rechazar_silabo(
    id_silabo: int,
    request: RevisionRequest,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.rol != RolUsuario.ADMIN:
        raise HTTPException(status_code=403, detail="Acceso denegado")
        
    silabo = db.query(Silabo).filter(Silabo.id_silabo == id_silabo).first()
    silabo.estado_validacion = EstadoVerificacion.RECHAZADO
    silabo.observaciones_validacion = request.comentario
    db.commit()
    return {"message": "Sílabo rechazado"}
