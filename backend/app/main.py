from fastapi import FastAPI, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from datetime import datetime

from fastapi.staticfiles import StaticFiles
from app.api.routes import syllabus, chat, metrics, courses, chunks, services, logs, periods, context, onboarding
from app.api.routes.auth import router as auth_router
from app.database.connection import engine, Base
from app.config import Config
import os

# Crear tablas
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Chatbot Académico ITIL 4",
    description="Service Desk para interpretación de sílabos con autenticación",
    version="1.0.0"
)

# Asegurar que el directorio de uploads existe
UPLOAD_DIR = os.path.join("app", "static", "uploads", "syllabi")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Montar archivos estáticos
app.mount("/static", StaticFiles(directory="app/static"), name="static")

# CORS - Configuración muy permisiva para desarrollo
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Manejadores globales de excepciones

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "status": exc.status_code,
            "message": exc.detail if isinstance(exc.detail, str) else "Error HTTP",
            "data": None,
            "errors": []
        }
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    print(f"VALIDATION ERROR: {exc.errors()}")
    print(f"REQUEST URL: {request.url}")
    print(f"REQUEST METHOD: {request.method}")
    print(f"REQUEST HEADERS: {dict(request.headers)}")
    
    errors = []
    for error in exc.errors():
        errors.append({
            "field": ".".join(str(x) for x in error["loc"]),
            "message": error["msg"],
            "type": error["type"]
        })
    
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "status": 422,
            "message": "Validación fallida",
            "data": None,
            "errors": errors
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Maneja todas las excepciones no capturadas"""
    import traceback
    import logging
    
    logger = logging.getLogger(__name__)
    logger.error(f"Unhandled exception: {str(exc)}\n{traceback.format_exc()}")
    
    # En desarrollo, mostrar el error; en producción, mensaje genérico
    error_detail = str(exc) if Config.ENVIRONMENT == "development" else "Error interno del servidor"
    
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "status": 500,
            "message": "Error interno del servidor",
            "data": None,
            "errors": [error_detail] if Config.ENVIRONMENT == "development" else []
        }
    )

# Rutas
app.include_router(auth_router)
app.include_router(syllabus.router)
app.include_router(chat.router)
app.include_router(metrics.router)
app.include_router(courses.router)
app.include_router(periods.router)
app.include_router(context.router)
app.include_router(chunks.router)
app.include_router(services.router)
app.include_router(logs.router)
from app.api.routes import sugerencias
app.include_router(sugerencias.router)
app.include_router(onboarding.router)


@app.get("/")
async def root():
    return {
        "message": "Chatbot Académico ITIL 4",
        "docs": "/docs",
        "version": "1.0.0",
        "status": "online",
        "timestamp": datetime.now().isoformat(),
        "auth_required": True,
        "features": [
            "Autenticación con email @unitru.edu.pe",
            "RAG sobre sílabos PDF",
            "Reglas deterministas para cálculos",
            "ITIL Service Desk (solicitudes + incidentes)",
            "Escalamiento automático a tutoría",
            "Métricas de servicio"
        ]
    }


import asyncio
from app.database.connection import SessionLocal
from app.services.notificacion_service import NotificacionService

async def procesar_notificaciones_job():
    while True:
        try:
            db = SessionLocal()
            try:
                enviados = await NotificacionService.procesar_pendientes(db)
                if enviados > 0:
                    print(f"📧 [Job] {enviados} notificaciones enviadas.")
            finally:
                db.close()
        except Exception as e:
            print(f"❌ [Job] Error procesando notificaciones: {e}")
            
        # Esperar 60 segundos antes de volver a revisar (en prod podría ser 1h)
        await asyncio.sleep(60)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(procesar_notificaciones_job())

@app.get("/health")
async def health_check():
    return {"status": "OK", "service": "Chatbot ITIL 4", "timestamp": datetime.now().isoformat()}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)