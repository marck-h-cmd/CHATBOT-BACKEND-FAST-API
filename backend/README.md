# Backend – Chatbot Académico ITIL 4 (Service Desk)

Backend robusto desarrollado en FastAPI que implementa un flujo de **Service Desk Académico** basado en **ITIL 4**. El sistema integra Inteligencia Artificial (Gemini API) para el parsing de sílabos, RAG (Retrieval-Augmented Generation) para consultas de contenido y un motor determinista para cálculos académicos y evaluación de riesgo.

## 🚀 Flujo de Trabajo (Workflow)

El backend sigue un ciclo de vida estricto para garantizar la integridad de los datos académicos:

```mermaid
graph TD
    A[Admin: Configura Periodos y Cursos] --> B[Estudiante: Registro e Inscripción]
    B --> C{¿Hay Sílabo Oficial?}
    C -- SÍ --> D[Asignación Automática de Sílabo Oficial]
    C -- NO --> E[Estudiante: Sube Sílabo PDF]
    E --> F[Gemini: Parsing + Score de Confianza]
    F --> G{Score >= 70%}
    G -- SÍ --> H[Estado: APROBADO - Cálculos Habilitados]
    G -- NO --> I[Estado: PENDIENTE - Cálculos Bloqueados]
    I --> J[Admin: Revisión Manual / Aprobación]
    H --> K[Chat: Consultas y Simulaciones]
    D --> K
    K --> L[ITIL: Registro de Solicitud/Incidente]
    L --> M[Dashboard: Métricas de Mejora Continua]
```

## 📊 Modelo de Datos (ERD)

```mermaid
erDiagram
    USUARIO ||--o{ CONTEXTO_CURSO_USUARIO : "se inscribe en"
    USUARIO ||--o{ SILABO : "sube"
    CURSO ||--o{ CONTEXTO_CURSO_USUARIO : "pertenece a"
    CURSO ||--o{ SILABO : "tiene"
    PERIODO_ACADEMICO ||--o{ CONTEXTO_CURSO_USUARIO : "ocurre en"
    PERIODO_ACADEMICO ||--o{ SILABO : "aplica a"
    CONTEXTO_CURSO_USUARIO ||--o{ SOLICITUD_SERVICIO : "genera"
    CONTEXTO_CURSO_USUARIO ||--o{ INCIDENTE_ACADEMICO : "genera"
    SILABO ||--o{ SILABO_CHUNK : "se divide en"
    SILABO ||--o{ INCIDENTE_SERVICIO : "puede tener"

    USUARIO {
        int id_usuario PK
        string codigo_estudiante
        string email
        string rol "ADMIN | ESTUDIANTE | DOCENTE"
    }
    PERIODO_ACADEMICO {
        int id_periodo PK
        string nombre "2026-I"
        bool es_actual
    }
    CURSO {
        int id_curso PK
        string codigo_curso
        string nombre_curso
    }
    SILABO {
        int id_silabo PK
        string estado_validacion "APROBADO | PENDIENTE | RECHAZADO"
        string ambito_uso "PRIVADO | COMPARTIBLE | PUBLICADO"
        int puntaje_confianza "0-100"
        json reglas_json "Fórmulas extraídas"
    }
    CONTEXTO_CURSO_USUARIO {
        int id_contexto PK
        float pu1 "Nota Unidad 1"
        float pu2 "Nota Unidad 2"
        int id_silabo_asignado FK
    }
    SOLICITUD_SERVICIO {
        int id_solicitud PK
        string categoria "Intent del Chat"
        int tiempo_respuesta_ms
    }
```

## 🛠 Guía para Frontend (Integración)

### 1. Inscripción y Contexto
Antes de chatear, el estudiante debe estar "inscrito" en un curso para el periodo actual.
- **POST** `/contexto/inscribir`: Registra al estudiante en un curso. 
    - **Importante**: Si el backend encuentra un sílabo oficial para ese curso/periodo, lo asignará automáticamente al `id_contexto`.
- **GET** `/contexto/mis-cursos`: Obtiene la lista de cursos del estudiante con su `id_contexto`. **Usar este ID para el chat.**

### 2. Gestión de Sílabos
- **POST** `/silabo/upload`: Sube un PDF.
    - El backend devuelve un `score`. Si es `< 70`, el frontend debe avisar al usuario que las funciones de cálculo (PU/PP) estarán bloqueadas hasta que un Admin lo valide.
- **GET** `/silabo/revisar` (ADMIN): Lista sílabos pendientes de validación.

### 3. Chat y Service Desk
- **POST** `/chat/consultar`:
    - Cuerpo: `{ "id_contexto": 123, "pregunta": "..." }`
    - Si el sílabo no está validado, el chat responderá con un candado 🔒 indicando que solo puede responder preguntas generales (RAG), no cálculos.
    - Cada pregunta genera una `SolicitudServicio` en el backend.
    - Si el sistema detecta riesgo de desaprobación (según las notas en el contexto), creará automáticamente un `IncidenteAcademico` de severidad ALTA.

### 4. Dashboard de Métricas
- **GET** `/metrics/dashboard`: Resumen para la pantalla principal del Admin.
- **GET** `/metrics/riesgo`: Datos para el módulo de Alerta Temprana (estudiantes en riesgo).
- **GET** `/metrics/mejora-continua`: Estadísticas de fallos de parsing y satisfacción.

## ⚙️ Configuración del Entorno (.env)

```env
DATABASE_URL=postgresql://user:password@localhost:5432/chatbot
SECRET_KEY=tu_clave_secreta_jwt
GEMINI_API_KEY=tu_api_key_google_ai
NOTA_APROBACION=14
```

## 📦 Instalación y Ejecución

1. Crear entorno virtual: `python -m venv venv`
2. Instalar dependencias: `pip install -r requirements.txt`
3. Ejecutar servidor: `uvicorn app.main:app --reload`
4. Documentación interactiva: `http://localhost:8000/docs`

## 🔔 Nueva: Persistencia de Onboarding (V1)

Se añadió persistencia server-side para el recorrido de onboarding del estudiante.

- Script de migración (agrega columnas a la tabla `usuario` si no existen):

    ```bash
    python scripts/add_onboarding_fields.py
    ```

- Endpoints:
    - `GET /onboarding/status` — devuelve `{ completed, skipped, version, updated_at }` para el usuario autenticado.
    - `PATCH /onboarding/status` — actualiza campos `completed`, `skipped`, `version`.

Nota: El frontend mantiene `localStorage` como fallback; la V1 intenta sincronizar con el servidor para que el control sea por usuario real y no por navegador.
