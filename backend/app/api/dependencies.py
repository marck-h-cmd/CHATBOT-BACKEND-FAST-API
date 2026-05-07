from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.connection import get_db

def get_current_user_id() -> str:
    """Obtiene el ID del usuario actual (simplificado)"""
    # En producción, esto vendría de un token JWT
    from fastapi import Request
    return "USR_DEFAULT"

def validate_silabo_exists(id_silabo: int, db: Session = Depends(get_db)):
    """Valida que el sílabo exista"""
    from app.database.models import Silabo
    silabo = db.query(Silabo).filter(Silabo.id == id_silabo).first()
    if not silabo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sílabo con id {id_silabo} no encontrado"
        )
    return silabo