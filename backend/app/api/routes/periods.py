from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from app.database.connection import get_db
from app.database.models import Usuario, PeriodoAcademico, RolUsuario
from app.api.dependencies import get_current_active_user

router = APIRouter(prefix="/periodos", tags=["Periodos Académicos"])

class PeriodoBase(BaseModel):
    anio: int
    termino: str
    nombre: str
    es_actual: bool = False
    fecha_inicio: datetime
    fecha_fin: datetime

class PeriodoCreate(PeriodoBase):
    pass

class PeriodoResponse(PeriodoBase):
    id_periodo: int
    class Config:
        from_attributes = True

@router.get("/", response_model=List[PeriodoResponse])
async def listar_periodos(db: Session = Depends(get_db)):
    return db.query(PeriodoAcademico).all()

@router.post("/", response_model=PeriodoResponse)
async def crear_periodo(
    periodo: PeriodoCreate,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.rol != RolUsuario.ADMIN:
        raise HTTPException(status_code=403, detail="Solo administradores pueden crear periodos")
    
    if periodo.es_actual:
        # Desmarcar otros como actuales
        db.query(PeriodoAcademico).update({PeriodoAcademico.es_actual: False})
    
    new_periodo = PeriodoAcademico(**periodo.model_dump())
    db.add(new_periodo)
    db.commit()
    db.refresh(new_periodo)
    return new_periodo

@router.put("/{id_periodo}", response_model=PeriodoResponse)
async def actualizar_periodo(
    id_periodo: int,
    periodo_data: PeriodoCreate,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.rol != RolUsuario.ADMIN:
        raise HTTPException(status_code=403, detail="Solo administradores pueden editar periodos")
    
    db_periodo = db.query(PeriodoAcademico).filter(PeriodoAcademico.id_periodo == id_periodo).first()
    if not db_periodo:
        raise HTTPException(status_code=404, detail="Periodo no encontrado")
    
    if periodo_data.es_actual:
        db.query(PeriodoAcademico).update({PeriodoAcademico.es_actual: False})
        
    for key, value in periodo_data.model_dump().items():
        setattr(db_periodo, key, value)
        
    db.commit()
    db.refresh(db_periodo)
    return db_periodo
