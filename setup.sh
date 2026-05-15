#!/bin/bash

echo "=============================================="
echo " Sylia AI - Initial Setup (Docker)"
echo "=============================================="

echo "[1/3] Preparando variables de entorno del backend..."
if [ ! -f "backend/.env" ]; then
    if [ -f "backend/.env.example" ]; then
        cp backend/.env.example backend/.env
        echo "- Archivo backend/.env creado desde el ejemplo."
    else
        echo "- ADVERTENCIA: No se encontro backend/.env.example"
    fi
else
    echo "- backend/.env ya existe."
fi

echo "[2/3] Preparando variables de entorno del frontend..."
if [ ! -f "frontend/.env" ]; then
    if [ -f "frontend/.env.example" ]; then
        cp frontend/.env.example frontend/.env
        echo "- Archivo frontend/.env creado desde el ejemplo."
    else
        echo "- ADVERTENCIA: No se encontro frontend/.env.example"
    fi
else
    echo "- frontend/.env ya existe."
fi

echo "[3/3] Levantando contenedores con Docker Compose..."
docker-compose up -d --build

echo "=============================================="
echo "SETUP COMPLETADO EXITOSAMENTE"
echo "=============================================="
echo ""
echo "La aplicacion ahora esta corriendo en Docker:"
echo "- Frontend (App): http://localhost:5173"
echo "- Backend (API): http://localhost:8000"
echo "- Documentacion API: http://localhost:8000/docs"
echo "- Base de datos (PgAdmin): http://localhost:5050"
echo ""
echo "Nota: Si quieres ver los logs en vivo, ejecuta: docker-compose logs -f"
