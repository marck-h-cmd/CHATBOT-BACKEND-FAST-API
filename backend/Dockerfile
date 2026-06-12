FROM python:3.11-slim

# Instalar dependencias del sistema necesarias para compilar paquetes (psycopg2, pgvector, etc)
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiar requirements primero para aprovechar caché de Docker
COPY requirements.txt .

# Instalar PyTorch CPU-only primero para evitar la descarga de CUDA GPU (reduce el tamaño de la imagen en ~3GB y evita "No space left on device")
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

# Instalar dependencias de Python
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el código fuente
COPY . .

# Dar permisos de ejecución al entrypoint
RUN chmod +x entrypoint.sh

# Exponer el puerto
EXPOSE 8000

# Usar entrypoint script
ENTRYPOINT ["./entrypoint.sh"]
