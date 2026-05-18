from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from app.api.dependencies import get_current_active_user
from app.database.connection import get_db
from app.database.models import Usuario

router = APIRouter(prefix="/onboarding", tags=["onboarding"])


@router.get('/status')
async def get_onboarding_status(db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_active_user)):
    user = db.query(Usuario).filter(Usuario.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail='Usuario no encontrado')

    return {
        'success': True,
        'message': 'Estado de onboarding obtenido',
        'data': {
            'completed': bool(user.onboarding_completed),
            'skipped': bool(user.onboarding_skipped),
            'version': int(user.onboarding_version) if user.onboarding_version is not None else 1,
            'updated_at': user.onboarding_updated_at.isoformat() if user.onboarding_updated_at else None
        }
    }


@router.patch('/status')
async def update_onboarding_status(payload: dict, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_active_user)):
    user = db.query(Usuario).filter(Usuario.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail='Usuario no encontrado')

    # Permitir campos: completed, skipped, version
    updated = False
    if 'completed' in payload:
        user.onboarding_completed = bool(payload.get('completed'))
        updated = True
    if 'skipped' in payload:
        user.onboarding_skipped = bool(payload.get('skipped'))
        updated = True
    if 'version' in payload:
        try:
            user.onboarding_version = int(payload.get('version'))
            updated = True
        except Exception:
            pass

    if updated:
        user.onboarding_updated_at = datetime.utcnow()
        db.add(user)
        db.commit()
        db.refresh(user)

    return {
        'success': True,
        'message': 'Estado de onboarding actualizado',
        'data': {
            'completed': bool(user.onboarding_completed),
            'skipped': bool(user.onboarding_skipped),
            'version': int(user.onboarding_version) if user.onboarding_version is not None else 1,
            'updated_at': user.onboarding_updated_at.isoformat() if user.onboarding_updated_at else None
        }
    }
