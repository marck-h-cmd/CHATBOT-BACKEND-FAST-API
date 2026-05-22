# Sylia AI — Asistente Académico Inteligente

Sylia AI es una plataforma integral de asistencia académica basada en inteligencia artificial, diseñada para estudiantes universitarios. Combina un backend robusto en **FastAPI** con un frontend moderno en **React + Tailwind CSS**, implementando flujos de **Service Desk académico (ITIL 4)**, motor de consultas **RAG** y sistema de simulación de notas con detección de riesgo académico.

---

## Tabla de Contenidos

1. [Arquitectura](#arquitectura)
2. [Características Principales](#características-principales)
3. [Tecnologías](#tecnologías)
4. [Requisitos Previos](#requisitos-previos)
5. [Instalación Rápida (Docker)](#instalación-rápida-docker)
6. [Instalación Manual](#instalación-manual)
7. [Configuración de Entorno](#configuración-de-entorno)
8. [Uso](#uso)
9. [Estructura del Proyecto](#estructura-del-proyecto)
10. [API Endpoints](#api-endpoints)
11. [Flujo de Trabajo](#flujo-de-trabajo)
12. [Licencia](#licencia)

---

## Arquitectura

```
┌─────────────┐      HTTP/REST       ┌─────────────────────────────────────┐
│  Frontend   │ ◄──────────────────► │              Backend                │
│  (React)    │                      │  (FastAPI + PostgreSQL + pgvector) │
│  :5173      │                      │  :8000                              │
└─────────────┘                      └─────────────────────────────────────┘
                                              │
                                              ▼
                              ┌───────────────────────────────┐
                              │  Google Gemini / OpenAI       │
                              │  Parsing de sílabos + RAG     │
                              └───────────────────────────────┘
```

---

## Características Principales

### Para Estudiantes
- **Chat inteligente con RAG** — Consulta temas de sílabos y reglas de evaluación en lenguaje natural.
- **Simulador de promedios** — Calcula notas proyectadas por unidad, parcial o curso completo.
- **Detección de riesgo académico** — Alertas automáticas cuando el promedio cae por debajo del umbral.
- **Gestión de cursos y sílabos** — Inscríbete en cursos y sube tus sílabos en PDF para análisis.
- **Dashboard personal** — Visualiza tus cursos, progreso, actividad semanal y rendimiento académico con gráficos.

### Para Administradores
- **Panel ITIL 4** — Gestión de periodos, cursos, validación de sílabos y service desk.
- **Métricas del sistema** — Rendimiento del LLM, satisfacción y mejora continua.
- **Alertas tempranas** — Seguimiento de estudiantes con riesgo académico.

### Seguridad
- **Autenticación JWT** con sesiones seguras.
- **Verificación de email con OTP** — Código de 6 dígitos vía SMTP.
- **Emails institucionales** — Validación de dominio `@unitru.edu.pe`.

---

## Tecnologías

| Capa | Tecnología |
|------|------------|
| **Frontend** | React 18, Vite, Tailwind CSS, Framer Motion, Recharts, Lucide React |
| **Backend** | Python 3.11, FastAPI, SQLAlchemy, Alembic |
| **Base de datos** | PostgreSQL 15 + pgvector (vectores para RAG) |
| **IA / LLM** | Google Gemini API, Sentence Transformers (embeddings) |
| **Contenedores** | Docker + Docker Compose |
| **Autenticación** | JWT (PyJWT), bcrypt |

---

## Requisitos Previos

- Docker 24+ y Docker Compose (recomendado)
- O bien: Python 3.11+, Node.js 18+, PostgreSQL 15+

---

## Instalación Rápida (Docker)

```bash
# Clonar el repositorio
git clone <repo-url>
cd CHATBOT-BACKEND-FAST-API

# Ejecutar el script de setup (Linux/macOS)
chmod +x setup.sh && ./setup.sh

# O manualmente:
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
docker-compose up -d --build
```

Servicios disponibles tras el setup:

| Servicio | URL |
|----------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| Documentación API | http://localhost:8000/docs |
| PgAdmin | http://localhost:5050 |

---

## Instalación Manual

### 1. Base de datos
```bash
docker run -d \
  --name postgres \
  -e POSTGRES_USER=chatbot_user \
  -e POSTGRES_PASSWORD=chatbot_password \
  -e POSTGRES_DB=chatbot_academico \
  -p 5432:5432 \
  pgvector/pgvector:pg15
```

### 2. Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Copiar y editar variables de entorno
cp .env.example .env
# Editar .env con tu GEMINI_API_KEY, SECRET_KEY, DATABASE_URL...

# Iniciar servidor
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Frontend
```bash
cd frontend
npm install

# Copiar y editar variables de entorno
cp .env.example .env

# Iniciar servidor de desarrollo
npm run dev
```

---

## Configuración de Entorno

### `backend/.env`

```env
# Base de datos
DATABASE_URL=postgresql://chatbot_user:chatbot_password@localhost:5432/chatbot_academico

# Seguridad
SECRET_KEY=tu_clave_secreta_jwt_aleatoria_de_32_bytes

# Inteligencia Artificial
GEMINI_API_KEY=tu_api_key_de_google_ai
GEMINI_MODEL=gemini-flash-lite-latest
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
USE_GEMINI=true

# Configuración académica
NOTA_APROBACION=14
UMBRAL_RIESGO_ALTO=11
UMBRAL_RIESGO_MEDIO=13

# Correo (OTP)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu_email@gmail.com
SMTP_PASSWORD=tu_app_password
SMTP_FROM=tu_email@gmail.com
SMTP_USE_TLS=true

# Entorno
ENVIRONMENT=development
```

### `frontend/.env`

```env
VITE_API_URL=http://localhost:8000
```

---

## Uso

1. Regístrate con tu email institucional `@unitru.edu.pe`.
2. Verifica tu cuenta con el código OTP enviado a tu correo.
3. Inicia sesión y accede al Dashboard.
4. Inscríbete en cursos disponibles o sube tu sílabo PDF.
5. Abre el chat de Sylia, selecciona un curso y comienza a consultar.

---

## Estructura del Proyecto

```
CHATBOT-BACKEND-FAST-API/
├── backend/                          # API FastAPI
│   ├── app/
│   │   ├── api/                      # Routers y endpoints
│   │   ├── core/                     # Seguridad (JWT, bcrypt)
│   │   ├── database/                 # Modelos SQLAlchemy
│   │   ├── schemas/                  # Pydantic schemas
│   │   ├── services/                 # Lógica de negocio
│   │   ├── config.py                 # Configuración global
│   │   └── main.py                   # Punto de entrada
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                         # Aplicación React
│   ├── src/
│   │   ├── api/                      # Clientes HTTP (axios)
│   │   ├── components/               # Componentes reutilizables
│   │   ├── contexts/                 # Contextos React (Auth, Chat, etc.)
│   │   ├── pages/                    # Vistas principales
│   │   └── routes/                   # Configuración de rutas
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
├── setup.sh
└── README.md
```

---

## API Endpoints

### Autenticación
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/auth/registro` | Registrar nuevo usuario |
| POST | `/auth/login` | Iniciar sesión |
| POST | `/auth/verify-otp` | Verificar código OTP |
| POST | `/auth/resend-otp` | Reenviar código OTP |

### Chat y Contexto
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/chat/consultar` | Enviar mensaje al asistente |
| GET | `/contexto/mis-cursos` | Listar cursos del estudiante |
| POST | `/contexto/inscribir` | Inscribirse en un curso |

### Sílabos
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/silabo/upload` | Subir sílabo PDF |
| GET | `/silabo/revisar` | Listar sílabos pendientes (admin) |

### Dashboard y Métricas
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/metrics/dashboard` | Resumen del sistema |
| GET | `/metrics/riesgo` | Estudiantes en riesgo |
| GET | `/metrics/mejora-continua` | Estadísticas de calidad |

---

## Flujo de Trabajo

```mermaid
graph TD
    A[Admin configura Periodos y Cursos] --> B[Estudiante se registra e inscribe]
    B --> C{¿Existe Sílabo Oficial?}
    C -- SÍ --> D[Asignación automática al contexto]
    C -- NO --> E[Estudiante sube PDF]
    E --> F[Gemini parsea y genera score]
    F --> G{Score >= 70%?}
    G -- SÍ --> H[APROBADO — cálculos habilitados]
    G -- NO --> I[PENDIENTE — cálculos bloqueados]
    I --> J[Admin revisa y aprueba]
    H --> K[Chat + Simulación de notas]
    D --> K
    K --> L[Detección de riesgo académico]
    L --> M[Registro ITIL + Alertas]
```

---

## Licencia

Este proyecto es de uso interno institucional. Todos los derechos reservados.

---

<p align="center">
  <strong>Sylia AI</strong> — Tu asistente académico inteligente siempre disponible.
</p>
