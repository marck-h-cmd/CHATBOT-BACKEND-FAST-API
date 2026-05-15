from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from app.database.connection import get_db
from app.database.models import Usuario, Curso, RolUsuario
from app.api.dependencies import get_current_user_from_token

router = APIRouter(prefix="/cursos", tags=["Catálogo de Cursos"])

class CursoBase(BaseModel):
    codigo_curso: str
    nombre_curso: str
    ciclo_referencial: Optional[str] = None
    creditos: int = 3
    escuela: str = "Ingeniería de Sistemas"
    estado: bool = True

class CursoCreate(CursoBase):
    pass

class CursoResponse(CursoBase):
    id_curso: int
    class Config:
        from_attributes = True

@router.get("/", response_model=List[CursoResponse])
async def listar_cursos(db: Session = Depends(get_db)):
    return db.query(Curso).filter(Curso.estado == True).all()

@router.post("/", response_model=CursoResponse)
async def crear_curso(
    curso: CursoCreate,
    current_user: Usuario = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    if current_user.rol != RolUsuario.ADMIN:
        raise HTTPException(status_code=403, detail="Solo administradores pueden gestionar el catálogo")
    
    db_curso = Curso(**curso.model_dump())
    db.add(db_curso)
    db.commit()
    db.refresh(db_curso)
    return db_curso

@router.put("/{id_curso}", response_model=CursoResponse)
async def actualizar_curso(
    id_curso: int,
    curso_data: CursoCreate,
    current_user: Usuario = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    if current_user.rol != RolUsuario.ADMIN:
        raise HTTPException(status_code=403, detail="Solo administradores pueden editar cursos")
    
    db_curso = db.query(Curso).filter(Curso.id_curso == id_curso).first()
    if not db_curso:
        raise HTTPException(status_code=404, detail="Curso no encontrado")
        
    for key, value in curso_data.model_dump().items():
        setattr(db_curso, key, value)
        
    db.commit()
    db.refresh(db_curso)
    return db_curso