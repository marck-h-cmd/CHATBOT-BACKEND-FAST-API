from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from datetime import datetime
from starlette.middleware.base import BaseHTTPMiddleware

from app.api.routes import syllabus, chat, metrics, courses, chunks, services, logs, periods, context
from app.api.routes.auth import router as auth_router
from app.database.connection import engine, Base
from app.config import Config

# Crear tablas
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Chatbot Académico ITIL 4",
    description="Service Desk para interpretación de sílabos con autenticación",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Manejador global de excepciones para CORS
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
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


@app.get("/health")
async def health_check():
    return {"status": "OK", "service": "Chatbot ITIL 4", "timestamp": datetime.now().isoformat()}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)