# Backend – Chatbot Académico ITIL 4 (GTS)

Backend en FastAPI para un chatbot académico con:
- Autenticación (JWT) y control de roles.
- Ingesta de sílabos (PDF), extracción de texto y chunking.
- Recuperación de contexto (RAG) con embeddings.
- Service Desk estilo ITIL (registro de solicitudes/incidentes y métricas).

## Stack Tecnológico
- **Framework**: FastAPI 0.104.1 + Uvicorn 0.24.0
- **Base de datos**: PostgreSQL + SQLAlchemy 2.0.23 + psycopg2-binary
- **Vector embeddings**: sentence-transformers 2.2.2 (modelo all-MiniLM-L6-v2, dim=384)
- **Parsing PDF**: PyMuPDF 1.23.8 + PyPDF2 3.0.1
- **Seguridad**: python-jose (JWT) + passlib[bcrypt]
- **Validación**: Pydantic 2.5.0 + email-validator

## Configuración (.env)
Archivo esperado: `backend/.env`

Variables principales:
- `DATABASE_URL`: string de conexión a Postgres (ej. `postgresql://user:pass@localhost:5432/chatbot`)
- `SECRET_KEY`: clave para firmar JWT
- `OPENAI_API_KEY`: opcional (solo si se integra un proveedor externo)
- `EMBEDDING_MODEL`: por defecto `sentence-transformers/all-MiniLM-L6-v2`
- `PG_VECTOR_DIM`: dimensión esperada (por defecto 384 para MiniLM-L6-v2)
- `NOTA_APROBACION`: nota mínima para aprobar (por defecto 14)
- `UMBRAL_RIESGO_ALTO`: umbral para riesgo alto (por defecto 11)
- `UMBRAL_RIESGO_MEDIO`: umbral para riesgo medio (por defecto 13)

Notas:
- Si tu `DATABASE_URL` trae `?schema=public`, el backend lo normaliza a `options=-csearch_path=public` para compatibilidad con psycopg2.

## Estructura del Proyecto

```
backend/
├── app/
│   ├── api/                    # Endpoints de la API REST
│   │   ├── dependencies.py    # Dependencias de autenticación
│   │   └── routes/
│   │       ├── auth.py         # Rutas de autenticación
│   │       ├── chat.py         # Rutas del chat
│   │       ├── metrics.py      # Rutas de métricas ITIL
│   │       └── syllabus.py     # Rutas de gestión de sílabos
│   ├── core/                   # Lógica central del sistema
│   │   ├── constants.py        # Constantes del sistema
│   │   ├── intent_classifier.py # Clasificador de intenciones NLP
│   │   └── security.py         # JWT, autenticación y autorización
│   ├── database/               # Configuración de base de datos
│   │   ├── connection.py       # Conexión SQLAlchemy
│   │   └── models.py           # Modelos ORM
│   ├── schemas/                # Esquemas Pydantic
│   │   └── auth.py             # Schemas de autenticación
│   ├── services/               # Lógica de negocio
│   │   ├── chat_handler.py     # Orquestador del chat
│   │   ├── chunker.py          # División de texto en chunks
│   │   ├── embeddings.py       # Generación de embeddings
│   │   ├── itil_desk.py        # Service Desk ITIL
│   │   ├── pdf_parser.py       # Extracción de texto de PDFs
│   │   ├── rag_retriever.py    # Recuperación vectorial (RAG)
│   │   └── rule_engine.py      # Motor de reglas deterministas
│   ├── utils/                  # Utilidades
│   │   └── logger.py           # Configuración de logging
│   ├── config.py               # Configuración del sistema
│   └── main.py                 # Punto de entrada FastAPI
├── scripts/                    # Scripts de inicialización
│   ├── init_db.py             # Inicializa base de datos
│   └── seed_chunks.py         # Precarga chunks del sílabo
├── .env                       # Variables de entorno
├── .gitignore                 # Archivos ignorados por Git
├── docker-compose.yml         # Configuración Docker (PostgreSQL)
├── requirements.txt           # Dependencias Python
└── README.md                  # Este archivo
```

## Arranque Local

### 1) Instalar dependencias
```bash
pip install -r requirements.txt
```

### 2) Inicializar base de datos
Resetea tablas y carga curso/sílabo oficial del curso "Gestión de Servicios de TIC".
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
- Documentación Swagger: `GET /docs`

## Docker (PostgreSQL)
Existe un `docker-compose.yml` con una imagen de Postgres que incluye pgvector:
`pgvector/pgvector:pg15`.

Servicios:
- **postgres**: Base de datos PostgreSQL con pgvector (puerto 5432)
- **pgadmin**: Interfaz web para administración (puerto 5050)

El backend actualmente no requiere que la extensión `vector` exista en el servidor Postgres (los embeddings se almacenan como JSON). Si usas el contenedor con pgvector, igual funciona.

## Funcionalidades Principales

### 1. Autenticación y Autorización (`/auth`)

Implementa sistema completo de autenticación con JWT, control de sesiones y roles.

**Características:**
- Registro de usuarios con validación de email institucional (@unitru.edu.pe)
- Login con generación de tokens de acceso y refresh
- Refresh token para renovación automática
- Logout con blacklist de tokens
- Gestión de sesiones múltiples por usuario
- Control de roles (estudiante, docente, admin)
- Cambio de contraseña

**Endpoints:**
- `POST /auth/registro`: Registra nuevo usuario
- `POST /auth/login`: Inicia sesión, retorna access + refresh token
- `POST /auth/refresh`: Renueva access token usando refresh token
- `POST /auth/logout`: Cierra sesión actual (blacklist)
- `POST /auth/cambiar-password`: Cambia contraseña del usuario
- `GET /auth/me`: Obtiene perfil del usuario autenticado
- `GET /auth/sesiones`: Lista sesiones activas del usuario
- `POST /auth/cerrar-todas-sesiones`: Cierra todas las sesiones activas

**Archivos:**
- API: `app/api/routes/auth.py`
- Seguridad/JWT: `app/core/security.py`
- Dependencias: `app/api/dependencies.py`
- Schemas: `app/schemas/auth.py`

**Flujo de autenticación:**
1. Usuario se registra con email @unitru.edu.pe
2. Sistema valida formato de email y código universitario
3. Contraseña se hashea con bcrypt
4. Login genera access token (24h) y refresh token (7 días)
5. Cada request incluye access token en header Authorization: Bearer
6. Sistema verifica token no esté en blacklist y sesión esté activa
7. Refresh token permite renovar access token sin re-login

### 2. Gestión de Sílabos (`/syllabus`)

Permite trabajar con sílabos oficiales precargados y subir sílabos PDF personalizados.

**Características:**
- Sílabo oficial precargado del curso "Gestión de Servicios de TIC"
- Upload de PDFs personalizados por estudiantes
- Extracción de texto usando PyMuPDF
- Detección automática de secciones (competencias, evaluación, contenidos, tutoría)
- Validación de estructura y confiabilidad del parsing
- Generación de chunks con metadata
- Creación de embeddings vectoriales

**Endpoints:**
- `GET /syllabus/preloaded`: Obtiene (o crea) sílabo oficial del curso
- `POST /syllabus/upload`: Sube PDF, extrae texto, valida, crea chunks y embeddings
- `GET /syllabus/{id_silabo}/chunks`: Devuelve chunks de un sílabo (debug)

**Archivos:**
- API: `app/api/routes/syllabus.py`
- PDF Parser: `app/services/pdf_parser.py`
- Chunker: `app/services/chunker.py`
- Embeddings: `app/services/embeddings.py`

**Pipeline de ingestión:**
1. Usuario sube archivo PDF (máximo 10MB)
2. PDFParserService extrae texto completo
3. Detecta secciones usando regex (competencias, evaluación, contenidos, tutoría)
4. Extrae evidencias (PFD, TAD, ELD) con sus pesos
5. Extrae fórmulas de evaluación por unidad
6. Valida confiabilidad del parsing (ALTA/MEDIA/BAJA)
7. ChunkerService divide texto en chunks de 500 palabras con overlap de 50
8. EmbeddingService genera vector de 384 dimensiones por chunk
9. Chunks se almacenan en tabla silabo_chunks con metadata
10. Si confiabilidad es BAJA, se registra fallo en ITIL Service Desk

### 3. Chat Inteligente (`/chat`)

Procesa preguntas de estudiantes, clasifica intenciones, aplica reglas deterministas y utiliza RAG para recuperar contexto del sílabo.

**Características:**
- Clasificación de intenciones usando regex
- Recuperación vectorial de contexto (RAG)
- Motor de reglas deterministas para cálculos
- Simulación de notas y evaluación de riesgo
- Registro de interacciones en ITIL Service Desk
- Escalamiento automático a tutoría

**Endpoints:**
- `POST /chat/consultar`: Procesa consulta del usuario autenticado
- `GET /chat/silabos`: Lista sílabos accesibles (oficiales + subidos)

**Archivos:**
- API: `app/api/routes/chat.py`
- Orquestador: `app/services/chat_handler.py`
- Clasificador: `app/core/intent_classifier.py`
- RAG: `app/services/rag_retriever.py`
- Reglas: `app/services/rule_engine.py`
- ITIL: `app/services/itil_desk.py`

**Intenciones soportadas:**
1. **calcular_promedio**: Consultas sobre fórmulas de evaluación (PU1, PU2, PU3, PP)
2. **consultar_peso**: Preguntas sobre peso de evidencias (PFD, TAD, ELD)
3. **simular_notas**: Simulación con notas específicas (ej: "PFD=12, TAD=14, ELD=16")
4. **evaluar_riesgo**: Evaluación de riesgo académico basado en notas
5. **consultar_tutoria**: Información de horarios y canales de tutoría
6. **consultar_normas**: Normas de evaluación (asistencia, nota cero, aplazados)
7. **saludar**: Saludo inicial del chatbot
8. **informacion_general**: Preguntas generales respondidas con RAG

**Pipeline de procesamiento:**
1. IntentClassifier clasifica intención usando patrones regex
2. Extrae parámetros (unidad, evidencia, notas) del texto
3. RAGRetriever recupera chunks relevantes usando similitud coseno
4. ChatHandler aplica lógica según intención:
   - Para cálculos: usa RuleEngine con fórmulas deterministas
   - Para simulación: calcula promedio y evalúa aprobación
   - Para riesgo: evalúa nivel de riesgo y recomienda acciones
   - Para general: usa chunks recuperados del sílabo
5. ITILServiceDesk registra solicitud con métricas
6. Si riesgo es ALTO/MUY ALTO, registra incidente y escalar

### 4. Service Desk ITIL (`/metrics`)

Implementa prácticas ITIL 4 para gestión de servicio, incidentes y mejora continua.

**Características:**
- Registro de solicitudes de servicio (Service Requests)
- Gestión de incidentes académicos (Incident Management)
- Métricas de servicio (KPIs)
- Escalamiento automático a tutoría
- Logs de ingestión para mejora continua

**Endpoints:**
- `GET /metrics/service-desk`: Métricas agregadas del Service Desk
- `GET /metrics/health`: Salud del módulo de métricas

**Archivos:**
- API: `app/api/routes/metrics.py`
- ITIL Service Desk: `app/services/itil_desk.py`

**Métricas registradas:**
- Total de solicitudes de servicio
- Total de incidentes académicos
- Incidentes activos (no resueltos)
- Solicitudes escaladas a nivel 2 (tutoría)
- Fallos de ingestión de sílabos
- Tasa de resolución de nivel 1 (porcentaje resuelto por el chatbot)

**Escalamiento automático:**
- Riesgo académico ALTO/MUY ALTO → Escala a tutoría
- Fallo de ingestión BAJA → Registra para mejora continua
- Consultas no respondidas → Marca para escalamiento manual

### 5. Motor de Reglas Deterministas

Sistema de reglas precargadas para cálculos exactos sin ambigüedad.

**Reglas oficiales (Gestión de Servicios de TIC):**
```
U1: PU1 = (PFD + TAD + ELD*2) / 4
U2: PU2 = (PFD + TAD*2 + ELD) / 4
U3: PU3 = (PFD + TAD*2 + ELD) / 4
PP: PP = (PU1 + PU2 + PU3) / 3
Nota aprobatoria: 14
Redondeo: Medio punto (0.5) favorece al estudiante
```

**Funciones disponibles:**
- `calcular_promedio_unidad()`: Calcula PU1, PU2 o PU3
- `calcular_promedio_final()`: Calcula promedio promocional PP
- `aplicar_redondeo()`: Aplica regla de medio punto
- `evaluar_aprobacion()`: Evalúa si aprueba según nota mínima
- `calcular_nota_necesaria()`: Calcula nota necesaria en PU3
- `evaluar_riesgo()`: Evalúa nivel de riesgo académico
- `obtener_peso_evidencia()`: Obtiene peso de PFD/TAD/ELD
- `obtener_formula()`: Obtiene fórmula de una unidad

**Archivos:**
- Motor: `app/services/rule_engine.py`
- Configuración: `app/config.py`
- Constantes: `app/core/constants.py`

### 6. Sistema de Embeddings y RAG

Generación de representaciones vectoriales para recuperación semántica.

**Características:**
- Modelo: sentence-transformers/all-MiniLM-L6-v2 (384 dimensiones)
- Fallback determinista si el modelo no carga (hash SHA256)
- Cálculo de similitud coseno en Python
- Almacenamiento como JSON en PostgreSQL

**Archivos:**
- Servicio: `app/services/embeddings.py`
- RAG: `app/services/rag_retriever.py`

**Proceso:**
1. EmbeddingService inicializa modelo de sentence-transformers
2. Si falla, usa fallback basado en hash SHA256 del texto
3. Genera embedding de 384 floats para cada chunk
4. RAGRetriever calcula similitud coseno entre consulta y chunks
5. Retorna top-k chunks más relevantes ordenados por similitud

## Modelos de Base de Datos

La base de datos se define en SQLAlchemy (`app/database/models.py`) con 10 tablas principales:

### Tablas Principales

**usuarios**: Información de usuarios del sistema
- Campos: id, codigo_universitario, email, nombres, apellidos, hashed_password, rol, es_activo, email_verificado, ultimo_login, fechas
- Roles: estudiante, docente, admin

**sesiones_usuario**: Control de sesiones activas
- Campos: id, id_usuario, token, refresh_token, ip_address, user_agent, fechas, es_activa
- Relación: Muchas a una con usuarios

**token_blacklist**: Tokens revocados
- Campos: id, token, fecha_expiracion, fecha_agregado

**cursos**: Información de cursos académicos
- Campos: id, codigo, nombre, ciclo, periodo, docente, email_docente, es_oficial, reglas_json, fechas, activo
- Relación: Uno a muchos con silabos y reglas

**silabos**: Sílabos (oficiales y subidos)
- Campos: id, id_curso, nombre_archivo, texto_completo, es_oficial, es_validado, aviso_fiabilidad, fecha_subida
- Relación: Muchas a una con cursos, uno a muchos con chunks

**silabo_chunks**: Fragmentos de texto con embeddings
- Campos: id, id_silabo, chunk_texto, tipo_seccion, unidad, embedding (JSON), metadata_json
- Relación: Muchas a una con silabos

**silabos_usuario**: Asociación usuarios-sílabos
- Campos: id, id_usuario, id_silabo, es_favorito, fecha_agregado
- Relación: Muchas a uno con usuarios y silabos

**reglas_evaluacion**: Reglas de evaluación por curso
- Campos: id, id_curso, unidad, formula, evidencias_json, nota_aprobatoria, descripcion
- Relación: Muchas a uno con cursos

**solicitudes_servicio**: Solicitudes ITIL
- Campos: id, id_usuario, id_silabo, tipo, pregunta, respuesta, fragmentos_usados, reglas_aplicadas, tiempo_respuesta_ms, fecha, estado, escalada
- Relación: Muchas a uno con usuarios y silabos

**incidentes_academicos**: Incidentes de riesgo
- Campos: id, id_usuario, id_silabo, severidad, promedio_actual, nota_necesaria, recomendacion, notificado, resuelto, fechas
- Relación: Muchas a uno con usuarios y silabos

**sesiones_chat**: Historial de conversaciones
- Campos: id, id_usuario, id_silabo, titulo, fechas, mensajes (JSON), resumen
- Relación: Muchas a uno con usuarios y silabos

**logs_ingestion**: Logs de procesamiento de PDFs
- Campos: id, id_silabo, id_usuario, exito, error_mensaje, parsing_detected, fecha
- Relación: Muchas a uno con silabos y usuarios

### Scripts de Inicialización

**scripts/init_db.py**:
- Crea todas las tablas SQLAlchemy
- Crea curso oficial "Gestión de Servicios de TIC" (código 3445)
- Crea sílabo oficial asociado
- Carga reglas oficiales de evaluación
- Intenta crear extensión vector en PostgreSQL (opcional)

**scripts/seed_chunks.py**:
- Obtiene sílabo oficial de la base de datos
- Elimina chunks existentes
- Crea chunks del texto del sílabo
- Genera embeddings para cada chunk
- Inserta chunks en tabla silabo_chunks

## Notas Técnicas

### Embeddings y pgvector
- La columna `silabo_chunks.embedding` se almacena como `JSON` (lista de floats de tamaño 384)
- La recuperación RAG calcula similitud coseno en Python usando numpy
- Si deseas búsqueda vectorial nativa en Postgres (pgvector), se puede volver a modelar `embedding` como `vector(384)` y usar el operador `<=>`
- El fallback determinista usa SHA256 del texto para generar embeddings cuando el modelo no carga

### Seguridad
- Contraseñas hasheadas con bcrypt
- Tokens JWT firmados con HS256
- Access token expira en 24 horas
- Refresh token expira en 7 días
- Blacklist de tokens revocados
- Validación de email institucional @unitru.edu.pe
- Validación de código universitario (8-10 dígitos)

### Configuración de Tutoría
- Día: Jueves
- Horario: 12:00 - 13:00
- Email: amendozad@unitru.edu.pe
- Canales: Email, WhatsApp, Google Meet, Zoom, Cubículo docente

### Umbrales de Riesgo
- Nota aprobatoria: 14
- Riesgo ALTO: nota < 11
- Riesgo MEDIO: nota < 13
- Riesgo BAJO: nota >= 13

