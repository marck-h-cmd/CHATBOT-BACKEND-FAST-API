#!/usr/bin/env python3
"""Script para precargar chunks del sílabo oficial en la base de datos"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.connection import SessionLocal
from app.database.models import Silabo, SilaboChunk
from app.services.chunker import ChunkerService
from app.services.embeddings import embedding_service

# Texto de ejemplo del sílabo oficial (versión simplificada)
SILABO_OFICIAL_TEXTO = """
UNIDAD I: INTRODUCCIÓN A LA GESTIÓN DE SERVICIOS DE TIC
Semana 1-6
Contenido: Socialización del sílabo, Introducción a gestión de servicios TI, Modelo ITIL.
Evaluación: PFD (Examen de unidad) peso 1, TAD (Trabajo aplicativo) peso 1, ELD (Examen laboratorio) peso 2.
Fórmula: PU1 = (PFD + TAD + ELD*2) / 4

UNIDAD II: PRÁCTICAS DE GESTIÓN GENERAL DE SERVICIOS
Semana 7-11
Contenido: Gestión de arquitectura, mejora continua, seguridad, conocimiento.
Evaluación: PFD peso 1, TAD peso 2, ELD peso 1.
Fórmula: PU2 = (PFD + TAD*2 + ELD) / 4

UNIDAD III: PRÁCTICAS TÉCNICAS Y DE GESTIÓN DE SERVICIOS
Semana 12-16
Contenido: Gestión de activos TI, eventos, problemas, liberaciones.
Evaluación: PFD peso 1, TAD peso 2, ELD peso 2.
Fórmula: PU3 = (PFD + TAD*2 + ELD) / 4

SISTEMA DE EVALUACIÓN
Nota aprobatoria: 14
Promedio promocional: PP = (PU1 + PU2 + PU3) / 3
Redondeo: Medio punto (0.5) favorece al estudiante
Asistencia: Mínimo 70%, inhabilitación por 30% de incumplimiento

CONSEJERÍA ACADÉMICA
Día: Jueves, Horario: 12:00 - 13:00
Email: amendozad@unitru.edu.pe
Canales: Email, WhatsApp, Google Meet, Zoom, Cubículo docente
"""

def seed_chunks():
    """Precarga chunks del sílabo oficial"""
    db = SessionLocal()
    
    try:
        # Obtener sílabo oficial
        silabo = db.query(Silabo).filter(Silabo.es_oficial == True).first()
        
        if not silabo:
            print("❌ No se encontró el sílabo oficial. Ejecuta init_db.py primero")
            return
        
        # Eliminar chunks existentes
        db.query(SilaboChunk).filter(SilaboChunk.id_silabo == silabo.id).delete()
        
        # Crear nuevos chunks
        chunks = ChunkerService.crear_chunks(SILABO_OFICIAL_TEXTO, {"nombre_curso": "GESTION DE SERVICIOS DE TIC"})
        
        for i, chunk in enumerate(chunks):
            embedding = embedding_service.generar_embedding(chunk["texto"])
            chunk_db = SilaboChunk(
                id_silabo=silabo.id,
                chunk_texto=chunk["texto"],
                tipo_seccion=chunk["metadata"].get("tipo_seccion", "general"),
                unidad=chunk["metadata"].get("unidad", "GENERAL"),
                embedding=embedding,
                metadata_json=chunk["metadata"]
            )
            db.add(chunk_db)
        
        db.commit()
        print(f"✅ Cargados {len(chunks)} chunks en la base de datos")
        print(f"   Sílabo: {silabo.nombre_archivo}")
        
    except Exception as e:
        print(f"❌ Error cargando chunks: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_chunks()