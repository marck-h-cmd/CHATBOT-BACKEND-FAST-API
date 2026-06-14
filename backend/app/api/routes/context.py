from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from app.database.connection import get_db
from app.database.models import (
    Usuario, ContextoCursoUsuario, Curso, PeriodoAcademico, 
    Silabo, TipoSilabo, AmbitoUso, EstadoVerificacion, OrigenContexto
)
from app.api.dependencies import get_current_active_user

router = APIRouter(prefix="/contexto", tags=["Contexto Académico"])

class InscribirCurso(BaseModel):
    id_curso: int
    id_periodo: Optional[int] = None # Si es None, usar el actual

class ActualizarNotas(BaseModel):
    pu1: Optional[float] = None
    pu2: Optional[float] = None
    pu3: Optional[float] = None
    nota_final: Optional[float] = None

@router.post("/inscribir")
async def inscribir_curso(
    data: InscribirCurso,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # 1. Obtener periodo actual si no se provee
    if not data.id_periodo:
        periodo = db.query(PeriodoAcademico).filter(PeriodoAcademico.es_actual == True).first()
        if not periodo:
            raise HTTPException(status_code=400, detail="No hay periodo académico actual configurado")
        data.id_periodo = periodo.id_periodo
    
    # 2. Verificar si ya está inscrito
    existente = db.query(ContextoCursoUsuario).filter(
        ContextoCursoUsuario.id_usuario == current_user.id,
        ContextoCursoUsuario.id_curso == data.id_curso,
        ContextoCursoUsuario.id_periodo == data.id_periodo
    ).first()
    
    if existente:
        return {"message": "Ya estás inscrito en este curso", "id_contexto": existente.id_contexto}

    # 3. Buscar Sílabo Oficial para este curso y periodo
    silabo_oficial = db.query(Silabo).filter(
        Silabo.id_curso == data.id_curso,
        Silabo.id_periodo == data.id_periodo,
        Silabo.tipo_silabo == TipoSilabo.OFICIAL,
        Silabo.ambito_uso == AmbitoUso.PUBLICADO
    ).first()
    
    # 4. Crear contexto
    nuevo_contexto = ContextoCursoUsuario(
        id_usuario=current_user.id,
        id_curso=data.id_curso,
        id_periodo=data.id_periodo,
        id_silabo_asignado=silabo_oficial.id_silabo if silabo_oficial else None,
        origen_contexto=OrigenContexto.OFICIAL if silabo_oficial else OrigenContexto.DECLARADO_USUARIO,
        estado_verificacion=EstadoVerificacion.OFICIAL if silabo_oficial else EstadoVerificacion.PENDIENTE_CONFIRMACION
    )
    
    db.add(nuevo_contexto)
    db.commit()
    db.refresh(nuevo_contexto)
    
    return {
        "success": True,
        "id_contexto": nuevo_contexto.id_contexto,
        "silabo_asignado": silabo_oficial.id_silabo if silabo_oficial else None,
        "mensaje": "Inscripción exitosa" + (" con sílabo oficial asignado" if silabo_oficial else "")
    }

@router.get("/mis-cursos")
async def listar_mis_cursos(
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    contextos = db.query(ContextoCursoUsuario).filter(
        ContextoCursoUsuario.id_usuario == current_user.id
    ).all()
    
    result = []
    for ctx in contextos:
        silabo = ctx.silabo_asignado
        result.append({
            "id_contexto": ctx.id_contexto,
            "id_curso": ctx.id_curso,
            "id_periodo": ctx.id_periodo,
            "curso": ctx.curso.nombre_curso,
            "codigo": ctx.curso.codigo_curso,
            "periodo": ctx.periodo.nombre,
            "silabo_validado": ctx.estado_verificacion in [EstadoVerificacion.APROBADO, EstadoVerificacion.OFICIAL],
            "estado_verificacion": ctx.estado_verificacion.value if ctx.estado_verificacion else None,
            "id_silabo": ctx.id_silabo_asignado,
            "ruta_pdf": silabo.ruta_pdf if silabo else None,
            "notas": {
                "pu1": ctx.pu1,
                "pu2": ctx.pu2,
                "pu3": ctx.pu3,
                "nota_final": ctx.nota_final
            }
        })
    return result

@router.put("/{id_contexto}/notas")
async def actualizar_notas(
    id_contexto: int,
    data: ActualizarNotas,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    contexto = db.query(ContextoCursoUsuario).filter(
        ContextoCursoUsuario.id_contexto == id_contexto,
        ContextoCursoUsuario.id_usuario == current_user.id
    ).first()
    
    if not contexto:
        raise HTTPException(status_code=404, detail="Curso no encontrado para este usuario")
        
    if data.pu1 is not None:
        if not (0 <= data.pu1 <= 20): raise HTTPException(status_code=400, detail="La nota debe estar entre 0 y 20")
        contexto.pu1 = data.pu1
    if data.pu2 is not None:
        if not (0 <= data.pu2 <= 20): raise HTTPException(status_code=400, detail="La nota debe estar entre 0 y 20")
        contexto.pu2 = data.pu2
    if data.pu3 is not None:
        if not (0 <= data.pu3 <= 20): raise HTTPException(status_code=400, detail="La nota debe estar entre 0 y 20")
        contexto.pu3 = data.pu3
    if data.nota_final is not None:
        if not (0 <= data.nota_final <= 20): raise HTTPException(status_code=400, detail="La nota debe estar entre 0 y 20")
        
    db.commit()
    db.refresh(contexto)
    
    return {
        "success": True,
        "message": "Notas actualizadas correctamente",
        "notas": {
            "pu1": contexto.pu1,
            "pu2": contexto.pu2,
            "pu3": contexto.pu3,
            "nota_final": contexto.nota_final
        }
    }
