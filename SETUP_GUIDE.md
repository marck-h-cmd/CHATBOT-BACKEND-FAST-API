# 🚀 SISTEMA CORREGIDO Y LISTO PARA USAR

## ✅ Cambios Realizados (14 Mayo 2026)

### Backend Fixes (FastAPI)

#### 1. **Seguridad y Error Handling**
- ✅ Configuración segura de CORS con whitelist de orígenes
- ✅ Error handlers globales para excepciones HTTP, validación y excepciones no capturadas
- ✅ Logging estructurado de errores en desarrollo
- ✅ Response normalizado para todos los endpoints

#### 2. **Base de Datos**
- ✅ Connection pooling optimizado con pool_pre_ping y pool_recycle
- ✅ Manejo de excepciones con rollback automático
- ✅ Timeout y configuración de conexión mejorada

#### 3. **Funcionalidades de Chat y IA**
- ✅ Función `calcular_similitud_coseno()` agregada a EmbeddingService
- ✅ Soporte para cálculo de similitud entre embeddings
- ✅ Compatible con numpy arrays y normalizaciones

#### 4. **Autenticación (Ya Implementado)**
- ✅ AuthService completo con registrar_usuario, login, refresh_token
- ✅ Token blacklist on logout implementado
- ✅ Endpoints /auth/me, /auth/sesiones, /auth/cambiar-password
- ✅ Cierre de todas las sesiones con exclusión de sesión actual

### Frontend Fixes (React/Vite)

#### 1. **Error Handling**
- ✅ ErrorBoundary component creado para captura de errores
- ✅ Recuperación automática de errores
- ✅ Contador de errores consecutivos con recarga de aplicación
- ✅ Stack traces visibles en desarrollo

#### 2. **TypeScript Types**
- ✅ `auth.types.ts` - User, AuthResponse, Session
- ✅ `chat.types.ts` - ChatMessage, ChatResponse, ChatRequest
- ✅ `syllabus.types.ts` - Course, Period, Enrollment
- ✅ `metrics.types.ts` - Metric, ServiceDeskMetrics, SystemMetrics

#### 3. **Contextos y Estado**
- ✅ ChatContext actualizado con soporte para field `escalado`
- ✅ CourseContext completamente funcional
- ✅ AuthContext con manejo de sesiones
- ✅ ServiceDeskContext y SyllabusContext disponibles

#### 4. **API Client**
- ✅ Interceptores para manejo de tokens expirados
- ✅ Refresh token queue para evitar race conditions
- ✅ Redirección automática a login en 401

---

## 📋 Pasos de Instalación

### Método 1: Arranque Rápido con Docker (Recomendado)
Este método configura automáticamente la Base de Datos, el Backend y el Frontend en contenedores aislados. Es ideal para ejecutar el sistema en otra máquina sin problemas de dependencias.

1. Asegúrate de tener **Docker** y **Docker Compose** instalados.
2. Ejecuta el script de inicio rápido según tu sistema operativo:
   - **En Windows:** Haz doble clic en `setup.bat` o ejecútalo en tu terminal.
   - **En Linux/Mac:** Ejecuta `./setup.sh` (dale permisos de ejecución con `chmod +x setup.sh` primero).
3. ¡Listo! El sistema levantará automáticamente todo en los siguientes puertos:
   - **Frontend:** `http://localhost:5173`
   - **Backend API:** `http://localhost:8000`
   - **PgAdmin:** `http://localhost:5050`

*(El código del frontend y backend están mapeados a tu máquina local, por lo que cualquier cambio que hagas en el código se reflejará en vivo).*

---

### Método 2: Instalación Manual
Si prefieres no usar Docker para el código fuente, puedes ejecutar los componentes de forma clásica.

#### 1. Backend

```bash
cd backend

# Crear archivo .env desde ejemplo
cp .env.example .env

# Editar .env con tus valores (SECRET_KEY, DATABASE_URL, etc)

# Instalar dependencias
pip install -r requirements.txt

# Ejecutar servidor
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### 2. Frontend

```bash
cd frontend

# Crear archivo .env desde ejemplo
cp .env.example .env

# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run dev
```

Acceder en: `http://localhost:5173`

---

## 🔐 Configuración de Producción

### Backend
```bash
export ENVIRONMENT=production
export SECRET_KEY=$(python -c "import secrets; print(secrets.token_urlsafe(32))")
export DATABASE_URL="postgresql://user:pass@prod-db:5432/db"
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Frontend
```bash
# .env
VITE_API_URL=https://api.yourdomain.com
```

---

## 🧪 Testing Rápido

### 1. Registrarse
```bash
curl -X POST http://localhost:8000/auth/registro \
  -H "Content-Type: application/json" \
  -d '{
    "codigo_universitario": "12345678",
    "email": "usuario@unitru.edu.pe",
    "nombres": "Juan",
    "apellidos": "Pérez",
    "password": "password123"
  }'
```

### 2. Iniciar sesión
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@unitru.edu.pe",
    "password": "password123"
  }'
```

### 3. Obtener usuario actual
```bash
curl -X GET http://localhost:8000/auth/me \
  -H "Authorization: Bearer <access_token>"
```

---

## 📊 Variables de Entorno Requeridas

### Backend (.env)

| Variable | Ejemplo | Descripción |
|----------|---------|-------------|
| ENVIRONMENT | development | development o production |
| DATABASE_URL | postgresql://user:pass@localhost:5432/db | Conexión a PostgreSQL |
| SECRET_KEY | abc123xyz789 | Clave para firmar JWTs |
| GEMINI_API_KEY | AIza... | API key de Google Gemini (opcional) |
| USE_GEMINI | true/false | Usar Gemini para embeddings |
| EMBEDDING_MODEL | sentence-transformers/all-MiniLM-L6-v2 | Modelo para embeddings |
| NOTA_APROBACION | 14 | Nota mínima aprobatoria |
| UMBRAL_RIESGO_ALTO | 11 | Umbral para riesgo alto |

### Frontend (.env)

| Variable | Ejemplo | Descripción |
|----------|---------|-------------|
| VITE_API_URL | http://localhost:8000 | URL del backend |

---

## ⚠️ Problemas Comunes

### Backend no inicia
```
Error: could not translate host name "localhost" to address
```
→ Ajustar DATABASE_URL para usar IP en lugar de hostname

### CORS errors
```
Access to XMLHttpRequest blocked by CORS policy
```
→ Asegurar que VITE_API_URL en frontend coincida con origen permitido
→ Verificar que backend tiene los orígenes correctos en CORS

### Token expirado
```
401 Unauthorized: Token inválido
```
→ El frontend debería hacer refresh automático
→ Si no funciona, verificar refresh_token en localStorage

### Base de datos vacía
```
Tabla no encontrada
```
→ Ejecutar `python scripts/init_db.py` para crear tablas iniciales

---

## 📚 Estructura de Respuestas

### Success Response (200, 201)
```json
{
  "respuesta": "...",
  "intent": "consulta_general",
  "fragmentos_usados": 3,
  "tiempo_ms": 245,
  "escalado": false
}
```

### Error Response (4xx, 5xx)
```json
{
  "success": false,
  "status": 400,
  "message": "Descripción del error",
  "data": null,
  "errors": []
}
```

---

## 🎯 Próximas Mejoras Recomendadas

1. **Testing**
   - Agregar tests unitarios (pytest backend, jest frontend)
   - Tests de integración API
   - E2E tests con Cypress/Playwright

2. **Performance**
   - Caché de embeddings con Redis
   - Optimizar queries con índices en BD
   - CDN para static assets

3. **Monitoring**
   - Logging centralizado (ELK stack)
   - Alertas de errores (Sentry)
   - Métricas de performance

4. **Security**
   - 2FA para admin
   - Rate limiting por IP/usuario
   - Audit logging

---

## 📞 Soporte

Si encuentras problemas:
1. Revisar logs: `tail -f /path/to/logs`
2. Verificar variables de entorno: `.env` correctamente configurado
3. Confirmar que BD está activa: `pg_isready -h localhost`
4. Revisar console del navegador (F12) en frontend

---

**Sistema actualizado**: 14 de Mayo de 2026
**Versión**: 1.0.1 (Con correcciones de coherencia)
**Estado**: ✅ Listo para producción
