# Guía de Despliegue en AWS (Producción)

Esta guía detalla los pasos para poner en producción Sylia AI utilizando una instancia EC2 de AWS, con Docker, integración continua (GitHub Actions), y acceso seguro a la base de datos (pgAdmin).

## Fase 1: Preparación de Infraestructura en AWS

### 1.1 Crear Instancia EC2
1. Inicia sesión en la consola de AWS y ve al panel de **EC2**.
2. Haz clic en **Launch instances**.
3. **Nombre:** `sylia-production-server`
4. **AMI:** Selecciona `Ubuntu Server 22.04 LTS (HVM), SSD Volume Type`.
5. **Instance Type:** Selecciona `t3.medium` (necesario por PostgreSQL + pgvector y el LLM framework).
6. **Key Pair:** Crea un nuevo par de claves (ej. `sylia-prod-key.pem`) y descárgalo a tu computadora. Lo necesitarás para conectarte y para el CI/CD.

### 1.2 Configurar Security Group
En la sección *Network settings*, configura el Security Group para permitir el tráfico necesario:
- **HTTP (80)** - Anywhere (0.0.0.0/0)
- **HTTPS (443)** - Anywhere (0.0.0.0/0)
- **SSH (22)** - Anywhere (0.0.0.0/0) o restringido a tu IP.
- **Custom TCP (5050)** - **MUY IMPORTANTE**: Selecciona `My IP` o ingresa manualmente la IP de tu computadora autorizada. Esto protege a pgAdmin.

### 1.3 Asignar Elastic IP (Opcional pero recomendado)
Para que la IP de la instancia no cambie al reiniciarla:
1. Ve a **Elastic IPs** en el panel de EC2.
2. *Allocate Elastic IP address*.
3. Selecciónala -> *Actions* -> *Associate Elastic IP address* -> Elige tu instancia `sylia-production-server`.

### 1.4 Configurar el Dominio DNS
Ve a tu proveedor de dominio y crea un registro tipo `A` que apunte tu dominio (ej. `sylia.com`) hacia la IP elástica que acabas de configurar.

---

## Fase 2: Configuración del Servidor

Conéctate a tu instancia vía SSH usando el archivo `.pem` que descargaste:
```bash
ssh -i "sylia-prod-key.pem" ubuntu@TU_IP_ELASTICA
```

### 2.1 Instalar Docker y Docker Compose
```bash
# Actualizar repositorios
sudo apt update && sudo apt upgrade -y

# Instalar Docker
sudo apt install -y docker.io docker-compose-v2 git

# Iniciar y habilitar servicio
sudo systemctl start docker
sudo systemctl enable docker

# Agregar el usuario ubuntu al grupo docker (para no usar sudo siempre)
sudo usermod -aG docker ubuntu
```
Cierra la sesión (`exit`) y vuelve a conectarte para que apliquen los permisos de grupo.

### 2.2 Clonar el Repositorio y Configurar Entorno
```bash
# Clonar
git clone https://github.com/tu-usuario/chatbot-app.git
cd chatbot-app

# Crear el archivo de entorno de producción
cp backend/.env.example backend/.env.prod
nano backend/.env.prod
```
> Modifica las claves seguras: `POSTGRES_PASSWORD`, `SECRET_KEY`, `OPENAI_API_KEY`, variables `SMTP_*` y añade tu dominio a `ALLOWED_ORIGINS` (ej: `https://tudominio.com`).

---

## Fase 3: Despliegue y Certificados SSL

### 3.1 Primer Inicio (Dummy SSL)
Nginx requiere los archivos de certificados para poder levantar el puerto 443, pero certbot necesita a nginx corriendo en el puerto 80 para validar el dominio.
Para resolver esto automatizadamente, ejecuta este script en la raíz del proyecto en la instancia EC2:

```bash
docker compose -f docker-compose.prod.yml up -d
```
> NOTA: Si el contenedor del frontend falla por primera vez debido a la falta de certificados SSL, debes comentar las lineas SSL en `frontend/nginx/nginx.conf`, reiniciar Nginx, correr Certbot y volver a descomentar. 

### 3.2 Generar Certificado Definitivo (Certbot)
Dentro del servidor EC2, corre un contenedor temporal para que Certbot haga el challenge webroot a través de nginx (que expone `/var/www/certbot`):
```bash
docker compose -f docker-compose.prod.yml run --rm certbot certonly --webroot --webroot-path /var/www/certbot/ -d tudominio.com -d www.tudominio.com
```
Luego reinicia el frontend para que tome el certificado:
```bash
docker compose -f docker-compose.prod.yml restart frontend
```

---

## Fase 4: Configurar CI/CD (GitHub Actions)

Para que el servidor se actualice automáticamente cada vez que hagas `push` a la rama `main`, necesitas configurar los secretos de GitHub:

1. Ve al repositorio en GitHub > **Settings** > **Secrets and variables** > **Actions**.
2. Agrega los siguientes secretos:
   - `EC2_HOST`: Tu IP Elástica (ej. `3.14.159.26`)
   - `EC2_USERNAME`: `ubuntu`
   - `EC2_SSH_KEY`: Pega aquí todo el contenido del archivo `sylia-prod-key.pem` que descargaste en la Fase 1.

¡Listo! A partir de ahora, cada vez que combines un Pull Request hacia `main`, GitHub Actions se conectará al EC2 y ejecutará `scripts/deploy.sh`.

---

## Acceso a Herramientas
- **Web App**: `https://tudominio.com`
- **Administración DB**: `http://TU_IP_ELASTICA:5050` (Asegúrate de estar en la misma red/IP que configuraste en el Security Group). Ingresa con las credenciales de `PGADMIN_DEFAULT_EMAIL` que hayas puesto en `.env.prod`.
