from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import syllabus, chat, metrics
from app.database.connection import engine, Base
from app.config import Config

# Crear tablas
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Chatbot Académico ITIL 4",
    description="Service Desk para interpretación de sílabos con RAG + Reglas",
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

# Rutas
app.include_router(syllabus.router)
app.include_router(chat.router)
app.include_router(metrics.router)

@app.get("/")
async def root():
    return {
        "message": "Chatbot Académico ITIL 4",
        "docs": "/docs",
        "version": "1.0.0",
        "features": [
            "RAG sobre sílabos PDF",
            "Reglas deterministas para cálculos",
            "ITIL Service Desk (solicitudes + incidentes)",
            "Escalamiento automático a tutoría",
            "Métricas de servicio"
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)