# Backend – Chatbot Académico ITIL 4 (GTS)

Backend en FastAPI para un chatbot académico con:
- Autenticación (JWT) y control de roles.
- Ingesta de sílabos (PDF), extracción de texto y chunking.
- Recuperación de contexto (RAG) con embeddings.
- Service Desk estilo ITIL (registro de solicitudes/incidentes y métricas).

## Stack
- FastAPI + Uvicorn
- SQLAlchemy + PostgreSQL
- PyMuPDF / PyPDF2 (parsing PDF)
- Embeddings con `sentence-transformers` (con fallback determinista si el modelo no carga)

## Configuración (.env)
Archivo esperado: `backend/.env`

Variables principales:
- `DATABASE_URL`: string de conexión a Postgres (ej. `postgresql://user:pass@localhost:5432/chatbot`)
- `SECRET_KEY`: clave para firmar JWT
- `OPENAI_API_KEY`: opcional (solo si se integra un proveedor externo)
- `EMBEDDING_MODEL`: por defecto `sentence-transformers/all-MiniLM-L6-v2`
- `PG_VECTOR_DIM`: dimensión esperada (por defecto 384 para MiniLM-L6-v2)

Notas:
- Si tu `DATABASE_URL` trae `?schema=public`, el backend lo normaliza a `options=-csearch_path=public` para compatibilidad con psycopg2.

## Arranque local

### 1) Instalar dependencias
```bash
pip install -r requirements.txt
```

### 2) Inicializar base de datos
Resetea tablas y carga curso/sílabo oficial.
```bash
python scripts/init_db.py
```

### 3) Precargar chunks (sílabo oficial)
Genera chunks + embeddings y los inserta en la tabla `silabo_chunks`.
```bash
python scripts/seed_chunks.py
```

### 4) Levantar servidor
```bash
uvicorn app.main:app --reload --port 8000
```

Endpoints útiles:
- Home: `GET /`
- Salud: `GET /health`
- Swagger: `GET /docs`

## Docker (PostgreSQL)
Existe un `docker-compose.yml` con una imagen de Postgres que incluye pgvector:
`pgvector/pgvector:pg15`.

El backend actualmente no requiere que la extensión `vector` exista en el servidor Postgres (los embeddings se almacenan como JSON). Si usas el contenedor con pgvector, igual funciona.

## Funcionalidades principales

### Autenticación (`/auth`)
Implementa registro/login y control de sesiones con JWT.

Rutas:
- `POST /auth/registro`: registra usuario (valida email institucional).
- `POST /auth/login`: retorna access + refresh token.
- `POST /auth/refresh`: renueva access token.
- `POST /auth/logout`: invalida tokens (blacklist).
- `POST /auth/cambiar-password`: cambio de contraseña.
- `GET /auth/me`: perfil del usuario autenticado.
- `GET /auth/sesiones`: lista sesiones activas.
- `POST /auth/cerrar-todas-sesiones`: cierra sesiones activas.

Código:
- API: `app/api/routes/auth.py`
- Seguridad/JWT: `app/core/security.py`

### Sílabos (`/syllabus`)
Permite trabajar con un sílabo oficial precargado y subir sílabos PDF de usuarios.

Rutas:
- `GET /syllabus/preloaded`: obtiene (y si no existe, crea) el sílabo oficial del curso.
- `POST /syllabus/upload`: sube PDF, extrae texto, valida estructura, crea chunks y embeddings.
- `GET /syllabus/{id_silabo}/chunks`: devuelve chunks de un sílabo (debug).

Servicios involucrados:
- `app/services/pdf_parser.py`: extracción de texto/secciones y validación.
- `app/services/chunker.py`: segmentación del texto en chunks con metadata.
- `app/services/embeddings.py`: generación de embeddings (con fallback si el modelo no carga).

### Chat (`/chat`)
Procesa preguntas, aplica reglas deterministas cuando corresponde y registra la interacción como solicitud ITIL.

Rutas:
- `POST /chat/consultar`: consulta principal (requiere usuario autenticado).
- `GET /chat/silabos`: lista sílabos accesibles para el usuario.

Pipeline (alto nivel):
1. Clasifica intención (FAQ/cálculo/ITIL).
2. Recupera fragmentos del sílabo (RAG).
3. Aplica reglas deterministas cuando aplica (p.ej. fórmulas de evaluación).
4. Registra solicitud/incidente y métricas.

Código:
- Orquestación: `app/services/chat_handler.py`
- RAG: `app/services/rag_retriever.py`
- Reglas: `app/services/rule_engine.py`
- ITIL: `app/services/itil_desk.py`

### Métricas (`/metrics`)
Rutas:
- `GET /metrics/service-desk`: métricas agregadas del Service Desk.
- `GET /metrics/health`: salud del módulo de métricas.

## Base de datos
La base de datos se define en SQLAlchemy (`app/database/models.py`) y se inicializa con:
- `scripts/init_db.py`
- `scripts/seed_chunks.py`

### Diagrama (ER)
```mermaid
erDiagram
  USUARIOS {
    int id PK
    string codigo_universitario
    string email
    string nombres
    string apellidos
    string hashed_password
    string rol
    boolean es_activo
    boolean email_verificado
    datetime ultimo_login
    datetime fecha_registro
    datetime fecha_actualizacion
  }

  SESIONES_USUARIO {
    int id PK
    int id_usuario FK
    string token
    string refresh_token
    string ip_address
    string user_agent
    datetime fecha_inicio
    datetime fecha_expiracion
    datetime fecha_cierre
    boolean es_activa
  }

  TOKEN_BLACKLIST {
    int id PK
    string token
    datetime fecha_expiracion
    datetime fecha_agregado
  }

  CURSOS {
    int id PK
    string codigo
    string nombre
    string ciclo
    string periodo
    string docente
    string email_docente
    boolean es_oficial
    json reglas_json
    datetime fecha_carga
    boolean activo
  }

  SILABOS {
    int id PK
    int id_curso FK
    string nombre_archivo
    text texto_completo
    boolean es_oficial
    boolean es_validado
    text aviso_fiabilidad
    datetime fecha_subida
  }

  SILABO_CHUNKS {
    int id PK
    int id_silabo FK
    text chunk_texto
    string tipo_seccion
    string unidad
    json embedding
    json metadata_json
  }

  SILABOS_USUARIO {
    int id PK
    int id_usuario FK
    int id_silabo FK
    boolean es_favorito
    datetime fecha_agregado
  }

  REGLAS_EVALUACION {
    int id PK
    int id_curso FK
    string unidad
    string formula
    json evidencias_json
    float nota_aprobatoria
    text descripcion
  }

  SOLICITUDES_SERVICIO {
    int id PK
    int id_usuario FK
    int id_silabo FK
    string tipo
    text pregunta
    text respuesta
    json fragmentos_usados
    json reglas_aplicadas
    int tiempo_respuesta_ms
    datetime fecha
    string estado
    boolean escalada
  }

  INCIDENTES_ACADEMICOS {
    int id PK
    int id_usuario FK
    int id_silabo FK
    string severidad
    float promedio_actual
    float nota_necesaria
    text recomendacion
    boolean notificado
    boolean resuelto
    datetime fecha_deteccion
    datetime fecha_resolucion
  }

  SESIONES_CHAT {
    int id PK
    int id_usuario FK
    int id_silabo FK
    string titulo
    datetime fecha_inicio
    datetime fecha_fin
    json mensajes
    text resumen
  }

  LOGS_INGESTION {
    int id PK
    int id_silabo FK
    int id_usuario FK
    boolean exito
    text error_mensaje
    json parsing_detected
    datetime fecha
  }

  USUARIOS ||--o{ SESIONES_USUARIO : tiene
  USUARIOS ||--o{ SILABOS_USUARIO : asocia
  SILABOS ||--o{ SILABOS_USUARIO : aparece_en

  CURSOS ||--o{ SILABOS : contiene
  SILABOS ||--o{ SILABO_CHUNKS : fragmenta
  CURSOS ||--o{ REGLAS_EVALUACION : define

  USUARIOS ||--o{ SOLICITUDES_SERVICIO : genera
  SILABOS ||--o{ SOLICITUDES_SERVICIO : responde_sobre

  USUARIOS ||--o{ INCIDENTES_ACADEMICOS : reporta
  SILABOS ||--o{ INCIDENTES_ACADEMICOS : asociado_a

  USUARIOS ||--o{ SESIONES_CHAT : conversa
  SILABOS ||--o{ SESIONES_CHAT : contexto

  SILABOS ||--o{ LOGS_INGESTION : registra
  USUARIOS ||--o{ LOGS_INGESTION : opcional
```

### Nota sobre embeddings y pgvector
- La columna `silabo_chunks.embedding` se almacena como `JSON` (lista de floats de tamaño 384).
- La recuperación RAG calcula similitud coseno en Python.
- Si deseas búsqueda vectorial nativa en Postgres (pgvector), se puede volver a modelar `embedding` como `vector(384)` y usar el operador `<=>`, pero requiere instalar la extensión `vector` en el servidor PostgreSQL.

