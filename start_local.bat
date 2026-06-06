@echo off
title Chatbot Academico - Iniciar Servidores Locales
echo ====================================================
echo  Chatbot Academico - Iniciando Servidores Locales (Sin Docker)
echo ====================================================
echo.

echo [1/2] Iniciando el Backend (FastAPI) en una nueva ventana...
start "Chatbot Backend (FastAPI)" cmd /k "cd backend && venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"

echo [2/2] Iniciar el Frontend (Vite/React) en una nueva ventana...
start "Chatbot Frontend (Vite/React)" cmd /k "cd frontend && npm run dev"

echo.
echo ====================================================
echo  ¡Servidores iniciados exitosamente!
echo ====================================================
echo  - Frontend (App): http://localhost:5173
echo  - Backend (API): http://127.0.0.1:8000
echo  - Documentacion Backend: http://127.0.0.1:8000/docs
echo ====================================================
echo.
pause
