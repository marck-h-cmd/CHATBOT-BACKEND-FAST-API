#!/bin/bash
set -e

echo "⏳ Esperando a que la base de datos esté lista..."

# Esperar a que la base de datos responda
python -c "
import socket
import time
import os
from urllib.parse import urlsplit

db_url = os.environ.get('DATABASE_URL')
if not db_url:
    print('DATABASE_URL no configurada')
    exit(0)

url = urlsplit(db_url)
host = url.hostname
port = url.port or 5432

while True:
    try:
        with socket.create_connection((host, port), timeout=1):
            print(f'✅ Conexión establecida con {host}:{port}')
            break
    except (socket.timeout, ConnectionRefusedError):
        print(f'... esperando a {host}:{port}')
        time.sleep(2)
"

echo "🌱 Ejecutando inicialización y seeds..."
python scripts/seed_all.py

echo "🚀 Iniciando servidor backend..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
