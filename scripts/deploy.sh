#!/bin/bash
set -e

echo "Desplegando cambios en producción..."

# Cargar las variables de entorno si es necesario
# source backend/.env.prod

# Reconstruir y levantar contenedores en modo detached
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d

# Limpiar imágenes Docker huérfanas (dangling) para ahorrar espacio
docker image prune -f

echo "Despliegue completado exitosamente."
