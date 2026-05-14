# Análisis y Diseño del Nuevo Frontend - Chatbot Académico ITIL 4

## 1. Análisis del Backend Actual

### 1.1 Arquitectura General
- **Framework**: FastAPI (Python)
- **Base de Datos**: PostgreSQL con pgvector
- **Integración IA**: Gemini API para parsing de sílabos
- **RAG**: Retrieval-Augmented Generation para consultas
- **Motor Determinista**: Cálculos académicos y evaluación de riesgo
- **Enfoque**: Service Desk Académico basado en ITIL 4

### 1.2 Endpoints Principales

#### Autenticación (`/auth`)
- `POST /registro` - Registro de usuario
- `POST /login` - Inicio de sesión (devuelve tokens JWT)
- `POST /refresh` - Renovación de token
- `POST /logout` - Cierre de sesión
- `GET /me` - Información del usuario actual
- `GET /sesiones` - Sesiones activas del usuario
- `POST /cerrar-todas-sesiones` - Cerrar todas las sesiones

#### Contexto Académico (`/contexto`)
- `POST /inscribir` - Inscribir estudiante en curso (asigna sílabo oficial automáticamente si existe)
- `GET /mis-cursos` - Lista cursos del estudiante con `id_contexto` (USAR ESTE ID PARA CHAT)

#### Gestión de Sílabos (`/silabo`)
- `POST /upload` - Subir PDF (procesa con Gemini, calcula score, valida reglas)
- `GET /revisar` - Lista sílabos pendientes de validación (ADMIN)
- `POST /aprobar/{id_silabo}` - Aprobar sílabo (ADMIN)
- `POST /rechazar/{id_silabo}` - Rechazar sílabo (ADMIN)

#### Chat & Service Desk (`/chat`)
- `POST /consultar` - Consultar al chat (requiere `id_contexto`)
  - Devuelve respuesta, intent, fragmentos usados, tiempo, escalado
  - Genera `SolicitudServicio` automáticamente
  - Crea `IncidenteAcademico` si detecta riesgo

#### Dashboard & Métricas (`/metrics`)
- `GET /dashboard` - Resumen operativo (ADMIN)
- `GET /tickets` - Gestión de tickets (ADMIN)
- `GET /riesgo` - Datos de alerta temprana (ADMIN)
- `GET /mejora-continua` - Estadísticas de fallos y satisfacción (ADMIN)
- `GET /conocimiento` - Métricas de sílabos (ADMIN)

#### Catálogo de Cursos (`/cursos`)
- `GET /` - Listar cursos
- `POST /` - Crear curso (ADMIN)
- `PUT /{id_curso}` - Actualizar curso (ADMIN)

#### Periodos Académicos (`/periodos`)
- `GET /` - Listar periodos
- `POST /` - Crear periodo (ADMIN)
- `PUT /{id_periodo}` - Actualizar periodo (ADMIN)

#### Service Desk (`/services`)
- `GET /requests` - Lista solicitudes de servicio
- `POST /requests` - Crear solicitud
- `PUT /requests/{id}` - Actualizar solicitud
- `DELETE /requests/{id}` - Eliminar solicitud
- `GET /incidents` - Lista incidentes académicos
- `POST /incidents` - Crear incidente
- `PUT /incidents/{id}` - Actualizar incidente
- `DELETE /incidents/{id}` - Eliminar incidente

### 1.3 Modelo de Datos Clave

#### Usuario
- `id` (PK)
- `codigo_universitario`
- `email`
- `nombres`, `apellidos`
- `rol` (ADMIN | ESTUDIANTE | DOCENTE)
- `es_activo` (Boolean)
- `email_verificado`
- `ultimo_login`
- `fecha_registro`

#### ContextoCursoUsuario
- `id_contexto` (PK)
- `id_usuario` (FK)
- `id_curso` (FK)
- `id_periodo` (FK)
- `id_silabo_asignado` (FK) - Sílabo oficial o subido
- `origen_contexto` (OFICIAL | DECLARADO_USUARIO)
- `estado_verificacion` (OFICIAL | APROBADO | PENDIENTE_CONFIRMACION | RECHAZADO)
- `nota_final`, `pu1`, `pu2`, etc.

#### Silabo
- `id_silabo` (PK)
- `id_curso` (FK)
- `id_periodo` (FK)
- `id_usuario_subida` (FK)
- `tipo_silabo` (OFICIAL | SUBIDO_USUARIO)
- `ambito_uso` (PRIVADO | COMPARTIBLE | PUBLICADO)
- `estado_validacion` (APROBADO | PENDIENTE_CONFIRMACION | RECHAZADO)
- `puntaje_confianza` (0-100)
- `coincidencia_periodo`
- `reglas_json` (formulas extraídas)

#### SolicitudServicio
- `id` (PK)
- `id_usuario` (FK)
- `id_silabo` (FK)
- `id_contexto` (FK)
- `categoria`
- `descripcion` (pregunta)
- `respuesta_generada`
- `estado` (ABIERTA | EN_PROCESO | RESUELTA | CERRADA)
- `escalada` (Boolean)
- `tiempo_respuesta_ms`

#### IncidenteAcademico
- `id` (PK)
- `id_usuario` (FK)
- `id_silabo` (FK)
- `id_contexto` (FK)
- `severidad` (ALTA | MEDIA | BAJA)
- `promedio_actual`
- `nota_necesaria`
- `recomendacion`
- `notificado` (Boolean)
- `resuelto` (Boolean)

### 1.4 Flujo de Trabajo ITIL 4

1. **Preparación Administrativa**: Admin registra periodos, cursos, sílabos oficiales, reglas
2. **Ingreso del Estudiante**: Estudiante selecciona periodo y curso
3. **Asignación Automática**: Si existe sílabo oficial, se asigna automáticamente
4. **Subida de Sílabo**: Si no existe oficial, estudiante sube PDF
5. **Validación AI**: Gemini procesa, calcula score, valida estructura
6. **Estado según Score**:
   - Score >= 70% + estructura válida → APROBADO (cálculos habilitados)
   - Score < 40% → RECHAZADO
   - Score 40-69% → PENDIENTE (cálculos bloqueados)
7. **Revisión Admin**: Admin aprueba/rechaza sílabos pendientes
8. **Uso Académico**: Consultas, simulaciones, cálculos, alertas de riesgo
9. **Service Desk**: Cada interacción genera solicitud/incidente
10. **Dashboard ITIL**: Métricas operativas, tickets, riesgo, mejora continua

### 1.5 Reglas de Negocio Importantes

- Si existe sílabo oficial publicado, siempre es la fuente principal
- Sílabos subidos por usuarios quedan PRIVADOS por defecto
- Solo admin puede publicar o marcar como oficial
- Sílabo pendiente NO habilita cálculos académicos
- Todo fallo documental genera incidente de servicio
- Todo riesgo académico genera incidente académico
- Score < 70% bloquea cálculos (PU/PP)

## 2. Análisis del Frontend Actual

### 2.1 Estructura Actual

#### Rutas
- `/login` - LoginPage
- `/register` - RegisterPage
- `/` - DashboardPage
- `/dashboard` - DashboardPage
- `/chat` - ChatPage
- `/syllabus` - SyllabusManagerPage
- `/metrics` - MetricsPage (solo admin)
- `/profile` - ProfilePage

#### Contexts
- AuthContext - Autenticación y sesiones
- ChatContext - Estado del chat
- SyllabusContext - Gestión de sílabos

#### Componentes Principales
- ChatInput, ChatMessage, TypingIndicator, QuickReplies
- SyllabusSelector, SyllabusSummary, SyllabusUploader, SyllabusChunksList
- KPICard, IncidentList, EscalationAlert
- Navbar, Footer, Sidebar
- Button, Card, Input, Modal, LoadingSpinner

### 2.2 Problemas Identificados

#### Problemas de Arquitectura
1. **No existe flujo de inscripción en cursos** - El frontend actual no implementa `/contexto/inscribir`
2. **No usa id_contexto** - El chat usa `id_silabo` directamente, pero el backend requiere `id_contexto`
3. **No muestra estado de validación** - No indica si el sílabo está aprobado/pendiente/rechazado
4. **No muestra score de confianza** - No muestra el puntaje de confianza del parsing
5. **No implementa gestión de periodos/cursos** - Solo admin debería configurar esto
6. **Dashboard ITIL incompleto** - Solo muestra métricas básicas, no módulos ITIL completos
7. **No hay módulo de Service Desk** - No hay vista de solicitudes/incidentes
8. **No hay flujo de validación de sílabos** - Admin no puede aprobar/rechazar sílabos pendientes
9. **No muestra alertas de riesgo académico** - No hay visualización de incidentes académicos
10. **No hay trazabilidad documental** - No muestra logs de ingestión, revisiones, etc.

#### Problemas de UX/UI
1. **Dashboard muy simple** - Solo bienvenida y enlaces rápidos
2. **No hay guía de onboarding** - Estudiantes no saben cómo inscribirse en cursos
3. **No hay indicadores visuales de estado** - No se ve si el sílabo está validado
4. **Chat no muestra bloqueos** - No indica cuando cálculos están bloqueados por score bajo
5. **No hay vista de admin completa** - Admin no tiene herramientas ITIL completas

## 3. Nueva Arquitectura Propuesta

### 3.1 Principios de Diseño

1. **Centrado en el flujo ITIL 4** - Cada interacción es una solicitud/incidente
2. **Rol-based UI** - Interfaces diferentes para estudiantes, docentes, admins
3. **Estado visual claro** - Indicadores de validación, score, bloqueos
4. **Trazabilidad completa** - Historial de acciones, revisiones, logs
5. **Progresión guiada** - Onboarding claro para estudiantes
6. **Dashboard ITIL completo** - Todos los módulos operativos
7. **Gestión del conocimiento** - Visualización de sílabos, versiones, aprobaciones

### 3.2 Nueva Estructura de Rutas

#### Rutas Públicas
- `/login` - LoginPage
- `/register` - RegisterPage

#### Rutas de Estudiantes
- `/` - StudentDashboard (rediseñado)
- `/cursos` - CourseList (seleccionar curso para inscribirse)
- `/inscripcion` - EnrollmentWizard (inscribirse en curso)
- `/chat` - ChatPage (actualizado para usar id_contexto)
- `/mis-cursos` - MyCourses (lista cursos inscritos con contexto)
- `/mis-silabos` - MySyllabi (sílabos subidos y su estado)
- `/perfil` - ProfilePage
- `/mis-incidentes` - MyIncidents (incidentes académicos del estudiante)

#### Rutas de Docentes
- `/docente/dashboard` - TeacherDashboard
- `/docente/cursos` - TeacherCourses
- `/docente/estudiantes` - TeacherStudents

#### Rutas de Admin (ITIL Dashboard)
- `/admin/dashboard` - AdminDashboard (ITIL completo)
- `/admin/cursos` - CourseManagement (CRUD cursos)
- `/admin/periodos` - PeriodManagement (CRUD periodos)
- `/admin/silabos` - SyllabusManagement (validación, aprobación, rechazo)
- `/admin/silabos/pendientes` - PendingSyllabi (revisión de sílabos pendientes)
- `/admin/silabos/oficiales` - OfficialSyllabi (gestión de sílabos oficiales)
- `/admin/service-desk` - ServiceDesk (solicitudes de servicio)
- `/admin/incidentes` - IncidentManagement (incidentes académicos)
- `/admin/riesgo` - RiskDashboard (alerta temprana)
- `/admin/metricas` - MetricsDashboard (métricas operativas)
- `/admin/conocimiento` - KnowledgeBase (gestión de conocimiento)
- `/admin/mejora-continua` - ImprovementDashboard (estadísticas de mejora)
- `/admin/logs` - SystemLogs (logs de ingestión, errores)
- `/admin/trazabilidad` - Traceability (historial de acciones)

### 3.3 Componentes Principales Nuevos

#### Estudiantes
- `EnrollmentWizard` - Wizard paso a paso para inscribirse en curso
- `CourseCard` - Tarjeta de curso con estado de inscripción
- `ContextoCard` - Tarjeta de contexto académico con sílabo asignado
- `SyllabusStatusBadge` - Badge mostrando estado de validación y score
- `RiskAlertCard` - Tarjeta de alerta de riesgo académico
- `MyCoursesList` - Lista de cursos inscritos con contexto
- `MySyllabiList` - Lista de sílabos subidos con estado

#### Admin ITIL
- `ITILDashboardLayout` - Layout con navegación ITIL
- `OperationalSummary` - Resumen operativo (KPIs principales)
- `TicketQueue` - Cola de tickets de Service Desk
- `IncidentQueue` - Cola de incidentes académicos
- `SyllabusReviewQueue` - Cola de sílabos pendientes de revisión
- `SyllabusApprovalCard` - Tarjeta para aprobar/rechazar sílabos
- `RiskHeatmap` - Mapa de calor de riesgo académico
- `KnowledgeGraph` - Visualización de conocimiento de sílabos
- `ImprovementMetrics` - Métricas de mejora continua
- `IngestionLogs` - Logs de ingestión de sílabos
- `TraceabilityTimeline` - Timeline de trazabilidad documental

#### Compartidos
- `StatusBadge` - Badge genérico de estado
- `ScoreIndicator` - Indicador visual de score (0-100)
- `ValidationStatus` - Estado de validación con iconos
- `RoleGuard` - Guard para roles específicos
- `LoadingState` - Estado de carga con esqueleto

### 3.4 Contexts Actualizados

#### CourseContext (Nuevo)
- `courses` - Lista de cursos disponibles
- `periods` - Lista de periodos académicos
- `enrollments` - Inscripciones del usuario
- `selectedCourse` - Curso seleccionado
- `selectedPeriod` - Periodo seleccionado

#### SyllabusContext (Actualizado)
- `syllabi` - Sílabos del usuario
- `officialSyllabi` - Sílabos oficiales
- `pendingSyllabi` - Sílabos pendientes de revisión (admin)
- `selectedSyllabus` - Sílabo seleccionado
- `uploadStatus` - Estado de subida
- `validationStatus` - Estado de validación

#### ServiceDeskContext (Nuevo)
- `requests` - Solicitudes de servicio
- `incidents` - Incidentes académicos
- `metrics` - Métricas de Service Desk
- `escalations` - Escalamientos pendientes

#### RiskContext (Nuevo)
- `riskStudents` - Estudiantes en riesgo
- `riskIncidents` - Incidentes de riesgo
- `riskMetrics` - Métricas de riesgo

## 4. Plan de Implementación

### Fase 1: Actualizar API Client
- Actualizar `api/client.js` con nuevos endpoints
- Crear `api/context.js` para inscripciones
- Actualizar `api/syllabus.js` para usar nuevos campos
- Crear `api/courses.js` para gestión de cursos
- Crear `api/periods.js` para gestión de periodos
- Actualizar `api/metrics.js` para nuevos endpoints ITIL
- Crear `api/service-desk.js` para solicitudes e incidentes

### Fase 2: Actualizar Contexts
- Crear `CourseContext.jsx`
- Actualizar `SyllabusContext.jsx` con nuevos campos
- Crear `ServiceDeskContext.jsx`
- Crear `RiskContext.jsx`

### Fase 3: Crear Componentes Base
- Crear `StatusBadge.jsx`
- Crear `ScoreIndicator.jsx`
- Crear `ValidationStatus.jsx`
- Crear `RoleGuard.jsx`
- Crear `LoadingState.jsx`

### Fase 4: Implementar Flujo de Estudiantes
- Crear `EnrollmentWizard.jsx`
- Actualizar `StudentDashboard.jsx`
- Crear `CourseList.jsx`
- Crear `MyCourses.jsx`
- Actualizar `ChatPage.jsx` para usar `id_contexto`
- Crear `MySyllabi.jsx`
- Crear `MyIncidents.jsx`

### Fase 5: Implementar Dashboard Admin ITIL
- Crear `AdminDashboard.jsx` con navegación lateral
- Crear `CourseManagement.jsx`
- Crear `PeriodManagement.jsx`
- Crear `SyllabusManagement.jsx`
- Crear `PendingSyllabi.jsx` con aprobación/rechazo
- Crear `ServiceDesk.jsx`
- Crear `IncidentManagement.jsx`
- Crear `RiskDashboard.jsx`
- Crear `MetricsDashboard.jsx`
- Crear `KnowledgeBase.jsx`
- Crear `ImprovementDashboard.jsx`

### Fase 6: Actualizar Rutas
- Actualizar `AppRoutes.jsx` con nueva estructura
- Crear guards de roles
- Actualizar layouts

### Fase 7: Eliminar Componentes Obsoletos
- Eliminar componentes no utilizados
- Limpiar contexts no utilizados

## 5. Prioridades

### Alta Prioridad (Crítico para funcionalidad)
1. Actualizar API client con nuevos endpoints
2. Crear CourseContext y flujo de inscripción
3. Actualizar ChatPage para usar id_contexto
4. Crear PendingSyllabi para validación admin
5. Crear AdminDashboard ITIL básico

### Media Prioridad (Mejora de UX)
1. Crear EnrollmentWizard
2. Crear MyCourses con contexto
3. Crear ServiceDesk módulo
4. Crear RiskDashboard
5. Crear indicadores visuales de estado

### Baja Prioridad (Nice to have)
1. Crear KnowledgeGraph
2. Crear TraceabilityTimeline
3. Crear ImprovementDashboard detallado
4. Crear visualizaciones avanzadas
