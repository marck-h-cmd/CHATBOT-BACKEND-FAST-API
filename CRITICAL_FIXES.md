# 🔧 CRITICAL FIXES - ACTIONABLE CODE SOLUTIONS

This document provides exact code fixes for the most critical blocking issues.

---

## 1. FIX: AuthService Implementation (CRITICAL)

**File:** `backend/app/core/security.py`

**Replace incomplete AuthService with:**

```python
class AuthService:
    
    @staticmethod
    def registrar_usuario(
        db: Session,
        codigo_universitario: str,
        email: str,
        nombres: str,
        apellidos: str,
        password: str
    ) -> Usuario:
        """Registra un nuevo usuario con email @unitru.edu.pe"""
        
        # Validar dominio
        if not SecurityService.verificar_dominio_unitru(email):
            raise ValueError("El email debe ser institucional (@unitru.edu.pe)")
        
        # Verificar si el usuario ya existe
        existing_user = db.query(Usuario).filter(
            (Usuario.email == email) | (Usuario.codigo_universitario == codigo_universitario)
        ).first()
        
        if existing_user:
            if existing_user.email == email:
                raise ValueError("El email ya está registrado")
            else:
                raise ValueError("El código universitario ya está registrado")
        
        # Crear usuario
        hashed_password = SecurityService.hash_password(password)
        nuevo_usuario = Usuario(
            codigo_universitario=codigo_universitario,
            email=email,
            nombres=nombres,
            apellidos=apellidos,
            hashed_password=hashed_password,
            rol=RolUsuario.ESTUDIANTE,
            es_activo=True,
            email_verificado=False
        )
        
        db.add(nuevo_usuario)
        db.commit()
        db.refresh(nuevo_usuario)
        return nuevo_usuario
    
    @staticmethod
    def login(
        db: Session,
        email: str,
        password: str,
        ip_address: str = None,
        user_agent: str = None
    ) -> Dict[str, Any]:
        """Autentica usuario y devuelve tokens"""
        
        # Obtener usuario
        usuario = db.query(Usuario).filter(Usuario.email == email).first()
        if not usuario:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email o contraseña incorrectos"
            )
        
        # Verificar contraseña
        if not SecurityService.verify_password(password, usuario.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email o contraseña incorrectos"
            )
        
        # Verificar si usuario está activo
        if not usuario.es_activo:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Usuario inactivo"
            )
        
        # Generar tokens
        access_token = SecurityService.create_access_token(data={"sub": usuario.id})
        refresh_token = SecurityService.create_refresh_token(data={"sub": usuario.id})
        
        # Registrar sesión
        fecha_expiracion = datetime.utcnow() + timedelta(
            minutes=SecurityService.ACCESS_TOKEN_EXPIRE_MINUTES
        )
        
        sesion = SesionUsuario(
            id_usuario=usuario.id,
            token=access_token,
            refresh_token=refresh_token,
            ip_address=ip_address,
            user_agent=user_agent,
            fecha_expiracion=fecha_expiracion,
            es_activa=True
        )
        
        db.add(sesion)
        usuario.ultimo_login = datetime.utcnow()
        db.commit()
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": SecurityService.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "usuario": usuario.to_dict()
        }
    
    @staticmethod
    def refresh_token(
        db: Session,
        refresh_token: str,
        ip_address: str = None,
        user_agent: str = None
    ) -> Dict[str, Any]:
        """Renueva el token de acceso"""
        
        try:
            payload = SecurityService.decode_token(refresh_token)
        except HTTPException:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token inválido"
            )
        
        # Verificar tipo de token
        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido para este endpoint"
            )
        
        # Obtener usuario
        user_id = payload.get("sub")
        usuario = db.query(Usuario).filter(Usuario.id == user_id).first()
        
        if not usuario:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Usuario no encontrado"
            )
        
        # Generar nuevo access token
        new_access_token = SecurityService.create_access_token(data={"sub": usuario.id})
        
        # Opcionalmente generar nuevo refresh token
        new_refresh_token = SecurityService.create_refresh_token(data={"sub": usuario.id})
        
        # Crear nueva sesión
        fecha_expiracion = datetime.utcnow() + timedelta(
            minutes=SecurityService.ACCESS_TOKEN_EXPIRE_MINUTES
        )
        
        nueva_sesion = SesionUsuario(
            id_usuario=usuario.id,
            token=new_access_token,
            refresh_token=new_refresh_token,
            ip_address=ip_address,
            user_agent=user_agent,
            fecha_expiracion=fecha_expiracion,
            es_activa=True
        )
        
        db.add(nueva_sesion)
        db.commit()
        
        return {
            "access_token": new_access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer",
            "expires_in": SecurityService.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "usuario": usuario.to_dict()
        }
```

---

## 2. FIX: Missing Auth Endpoints (CRITICAL)

**File:** `backend/app/api/routes/auth.py`

**Add these endpoints after the existing ones:**

```python
@router.get("/me", response_model=UsuarioResponse)
async def get_current_user(
    current_user: Usuario = Depends(get_current_active_user)
):
    """Obtiene información del usuario actual"""
    return current_user


@router.get("/sesiones")
async def get_user_sessions(
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Lista todas las sesiones activas del usuario"""
    sesiones = db.query(SesionUsuario).filter(
        SesionUsuario.id_usuario == current_user.id,
        SesionUsuario.es_activa == True
    ).all()
    
    return {
        "sessions": [
            {
                "id": s.id,
                "ip_address": s.ip_address,
                "user_agent": s.user_agent,
                "fecha_inicio": s.fecha_inicio.isoformat(),
                "fecha_expiracion": s.fecha_expiracion.isoformat(),
            }
            for s in sesiones
        ]
    }


@router.post("/cerrar-todas-sesiones")
async def close_all_sessions(
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Cierra todas las sesiones activas excepto la actual"""
    
    # Obtener token actual del header
    auth_header = request.headers.get("authorization", "")
    current_token = auth_header.replace("Bearer ", "") if auth_header else None
    
    # Cerrar todas las sesiones excepto la actual
    sesiones = db.query(SesionUsuario).filter(
        SesionUsuario.id_usuario == current_user.id,
        SesionUsuario.es_activa == True
    ).all()
    
    closed_count = 0
    for sesion in sesiones:
        if current_token and sesion.token == current_token:
            continue  # No cerrar la sesión actual
        
        sesion.es_activa = False
        sesion.fecha_cierre = datetime.utcnow()
        
        # Añadir a blacklist
        token_blacklist = TokenBlacklist(
            token=sesion.token,
            fecha_expiracion=sesion.fecha_expiracion
        )
        db.add(token_blacklist)
        closed_count += 1
    
    db.commit()
    
    return {
        "success": True,
        "message": f"Se cerraron {closed_count} sesiones",
        "sesiones_cerradas": closed_count
    }


@router.post("/cambiar-password", response_model=ApiResponse)
async def change_password(
    data: ChangePasswordRequest,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Cambia la contraseña del usuario actual"""
    
    # Verificar contraseña actual
    if not SecurityService.verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="La contraseña actual es incorrecta"
        )
    
    # Cambiar contraseña
    current_user.hashed_password = SecurityService.hash_password(data.new_password)
    
    # Cerrar todas las sesiones
    sesiones = db.query(SesionUsuario).filter(
        SesionUsuario.id_usuario == current_user.id,
        SesionUsuario.es_activa == True
    ).all()
    
    for sesion in sesiones:
        sesion.es_activa = False
        token_blacklist = TokenBlacklist(
            token=sesion.token,
            fecha_expiracion=sesion.fecha_expiracion
        )
        db.add(token_blacklist)
    
    db.commit()
    
    return ApiResponse(
        success=True,
        message="Contraseña cambiada exitosamente. Inicia sesión nuevamente."
    )
```

---

## 3. FIX: Missing Similarity Function (CRITICAL)

**File:** `backend/app/services/embeddings.py`

**Add this method to the `EmbeddingService` class:**

```python
    @staticmethod
    def calcular_similitud_coseno(embedding1: List[float], embedding2: List[float]) -> float:
        """Calcula similitud coseno entre dos embeddings"""
        if not embedding1 or not embedding2:
            return 0.0
        
        if len(embedding1) != len(embedding2):
            return 0.0
        
        try:
            # Convertir a numpy arrays si es necesario
            arr1 = np.array(embedding1, dtype=np.float32)
            arr2 = np.array(embedding2, dtype=np.float32)
            
            # Calcular similitud coseno
            norm1 = np.linalg.norm(arr1)
            norm2 = np.linalg.norm(arr2)
            
            if norm1 == 0 or norm2 == 0:
                return 0.0
            
            similitud = np.dot(arr1, arr2) / (norm1 * norm2)
            return float(similitud)
        except Exception:
            return 0.0
```

---

## 4. FIX: Chat Response Missing Field (CRITICAL)

**File:** `backend/app/services/chat_handler.py`

**Find the return statement in `procesar_consulta()` and update:**

```python
        # BEFORE:
        return {
            "respuesta": respuesta,
            "intent": intent,
            "fragmentos_usados": len(fragmentos),
            "tiempo_ms": tiempo_ms,
        }
        
        # AFTER:
        return {
            "respuesta": respuesta,
            "intent": intent,
            "fragmentos_usados": len(fragmentos),
            "tiempo_ms": tiempo_ms,
            "escalado": escalar,  # ADD THIS LINE
        }
```

---

## 5. FIX: Token Blacklist on Logout (CRITICAL)

**File:** `backend/app/api/routes/auth.py`

**Find the logout endpoint and complete it:**

```python
@router.post("/logout", response_model=ApiResponse)
async def logout(
    request: Request,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Cierra la sesión actual"""
    
    # Obtener token del header
    auth_header = request.headers.get("authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token no proporcionado"
        )
    
    token = auth_header.replace("Bearer ", "")
    
    # Cerrar sesión
    sesion = db.query(SesionUsuario).filter(SesionUsuario.token == token).first()
    if sesion:
        sesion.es_activa = False
        sesion.fecha_cierre = datetime.utcnow()
    
    # Añadir token a blacklist
    try:
        payload = SecurityService.decode_token(token)
        fecha_expiracion = datetime.fromtimestamp(payload.get("exp", 0))
    except:
        fecha_expiracion = datetime.utcnow() + timedelta(hours=1)
    
    token_blacklist = TokenBlacklist(
        token=token,
        fecha_expiracion=fecha_expiracion
    )
    
    db.add(token_blacklist)
    db.commit()
    
    return ApiResponse(
        success=True,
        message="Sesión cerrada exitosamente"
    )
```

---

## 6. FIX: Global Error Handler Middleware (CRITICAL)

**File:** `backend/app/main.py`

**Add after CORS middleware:**

```python
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.exceptions import RequestValidationError

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "status": exc.status_code,
            "message": exc.detail,
            "data": None,
            "errors": []
        },
        headers={"Access-Control-Allow-Origin": "*"}
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "status": 422,
            "message": "Validación fallida",
            "data": None,
            "errors": exc.errors()
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    import traceback
    
    # Log the error
    print(f"Unhandled exception: {str(exc)}")
    traceback.print_exc()
    
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "status": 500,
            "message": "Error interno del servidor",
            "data": None,
            "errors": [str(exc)] if not isinstance(exc, HTTPException) else []
        }
    )
```

---

## 7. FIX: Fix CORS Configuration (HIGH PRIORITY)

**File:** `backend/app/main.py`

**Replace CORS configuration:**

```python
# BEFORE:
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# AFTER:
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:8080",
        "https://yourdomain.com",  # Add your production domain
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
    max_age=3600,
    expose_headers=["Content-Type"]
)
```

---

## 8. FIX: Database Connection Pool (HIGH PRIORITY)

**File:** `backend/app/database/connection.py`

**Replace:**

```python
# BEFORE:
engine = create_engine(Config.DATABASE_URL, pool_size=10, max_overflow=20)

# AFTER:
engine = create_engine(
    Config.DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,  # Test connections before using
    pool_recycle=3600,   # Recycle connections every hour
    echo=False,  # Set to True for debugging
    connect_args={"connect_timeout": 10}
)
```

---

## 9. FIX: CourseContext Implementation (CRITICAL - Frontend)

**File:** `frontend/src/contexts/CourseContext.jsx` (NEW FILE)

**Create with:**

```javascript
import React, { createContext, useState, useContext, useEffect } from 'react';
import * as courseAPI from '../api/courses';
import * as contextAPI from '../api/context';
import { handleApiError } from '../utils/errorHandler';

const CourseContext = createContext();

export const useCourse = () => {
  const context = useContext(CourseContext);
  if (!context) {
    throw new Error('useCourse must be used within CourseProvider');
  }
  return context;
};

export const CourseProvider = ({ children }) => {
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load enrollments when component mounts
  useEffect(() => {
    loadEnrollments();
  }, []);

  const loadCourses = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await courseAPI.getCourses();
      setCourses(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      const errorInfo = handleApiError(err);
      setError(errorInfo.message);
      console.error('Error loading courses:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadEnrollments = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await contextAPI.getMyCourses();
      setEnrollments(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      const errorInfo = handleApiError(err);
      setError(errorInfo.message);
      console.error('Error loading enrollments:', err);
      setEnrollments([]); // Fallback to empty array
    } finally {
      setLoading(false);
    }
  };

  const enrollCourse = async (idCurso, idPeriodo = null) => {
    try {
      const response = await contextAPI.enrollCourse(idCurso, idPeriodo);
      await loadEnrollments(); // Refresh list
      return response;
    } catch (err) {
      const errorInfo = handleApiError(err);
      setError(errorInfo.message);
      throw err;
    }
  };

  const getEnrollmentByCourse = (courseId) => {
    return enrollments.find(e => e.id_curso === courseId);
  };

  const value = {
    courses,
    enrollments,
    loading,
    error,
    loadCourses,
    loadEnrollments,
    enrollCourse,
    getEnrollmentByCourse,
  };

  return (
    <CourseContext.Provider value={value}>
      {children}
    </CourseContext.Provider>
  );
};
```

---

## 10. FIX: Add Missing API Functions (Frontend)

**File:** `frontend/src/api/context.js` (NEW FILE)

**Create with:**

```javascript
import apiClient from './client';

export const getMyCourses = async () => {
  const response = await apiClient.get('/contexto/mis-cursos');
  return response.data;
};

export const enrollCourse = async (idCurso, idPeriodo = null) => {
  const response = await apiClient.post('/contexto/inscribir', {
    id_curso: idCurso,
    id_periodo: idPeriodo,
  });
  return response.data;
};

export const getContextoDetails = async (idContexto) => {
  const response = await apiClient.get(`/contexto/${idContexto}`);
  return response.data;
};
```

---

## 11. FIX: Input Validation on Endpoints (HIGH PRIORITY)

**File:** `backend/app/api/routes/chat.py`

**Update the ChatRequest model:**

```python
from pydantic import BaseModel, Field, validator

class ChatRequest(BaseModel):
    id_contexto: int = Field(..., gt=0)
    pregunta: str = Field(..., min_length=1, max_length=5000)
    
    @validator('pregunta')
    def sanitize_pregunta(cls, v):
        # Remove extra whitespace
        v = ' '.join(v.split())
        return v

class ChatResponse(BaseModel):
    respuesta: str
    intent: str
    fragmentos_usados: int = Field(ge=0)
    tiempo_ms: int = Field(ge=0)
    escalado: bool = False  # Add this field
```

---

## 12. FIX: Use Vector Type for Embeddings (HIGH PRIORITY)

**File:** `backend/app/database/models.py`

**Update SilaboChunk model:**

```python
from pgvector.sqlalchemy import Vector
from app.config import Config

class SilaboChunk(Base):
    __tablename__ = "silabo_chunk"
    
    id_seccion = Column(Integer, primary_key=True, index=True)
    id_silabo = Column(Integer, ForeignKey("silabo.id_silabo", ondelete="CASCADE"), nullable=False)
    tipo_seccion = Column(Enum(TipoSeccionChunk), nullable=False)
    titulo = Column(String(200), nullable=True)
    contenido = Column(Text, nullable=False)
    embedding = Column(Vector(Config.PG_VECTOR_DIM), nullable=True)  # Changed from JSON
    orden = Column(Integer, default=0)
    metadata_json = Column(JSON, nullable=True)
    fecha_creacion = Column(DateTime, default=func.now())
    
    # Add index for faster queries
    __table_args__ = (
        Index('ix_silabo_chunk_silabo', 'id_silabo'),
    )
    
    silabo = relationship("Silabo", back_populates="chunks")
```

---

## 13. FIX: Add Missing Chat Endpoints (HIGH PRIORITY)

**File:** `backend/app/api/routes/chat.py`

**Add:**

```python
@router.get("/silabos")
async def get_user_syllabi(
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Obtiene los sílabos disponibles para el usuario"""
    
    # Get user's contexts with their syllabi
    contextos = db.query(ContextoCursoUsuario).filter(
        ContextoCursoUsuario.id_usuario == current_user.id
    ).all()
    
    syllabi = []
    for ctx in contextos:
        if ctx.silabo_asignado:
            syllabi.append({
                "id_silabo": ctx.silabo_asignado.id_silabo,
                "nombre": ctx.silabo_asignado.nombre_archivo,
                "curso": ctx.curso.nombre_curso,
                "validado": ctx.estado_verificacion in [EstadoVerificacion.APROBADO, EstadoVerificacion.OFICIAL]
            })
    
    return {"syllabi": syllabi}
```

---

## 14. FIX: Add Error Boundary Component (Frontend)

**File:** `frontend/src/components/ErrorBoundary.jsx` (NEW FILE)

**Create with:**

```javascript
import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // You can log to Sentry or error tracking service here
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-red-50">
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
            <h1 className="text-2xl font-bold text-red-600 mb-4">
              ⚠️ Algo salió mal
            </h1>
            <p className="text-gray-600 mb-4">
              {this.state.error?.message || 'Ha ocurrido un error inesperado'}
            </p>
            <button
              onClick={() => window.location.href = '/'}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Volver al inicio
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

**Use in App.jsx:**

```javascript
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <AppRoutes />
    </ErrorBoundary>
  );
}

export default App;
```

---

## 15. FIX: Create .env Files

**File:** `backend/.env.example`

```
# Database
DATABASE_URL=postgresql://chatbot_user:password@localhost:5432/chatbot_db

# Security
SECRET_KEY=your-super-secret-key-that-is-at-least-32-characters-long

# API Keys
GEMINI_API_KEY=your-gemini-api-key
OPENAI_API_KEY=your-openai-api-key

# Configuration
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
USE_GEMINI=false
NOTA_APROBACION=14
UMBRAL_RIESGO_ALTO=11
UMBRAL_RIESGO_MEDIO=13

# PDF Processing
MAX_PDF_SIZE_MB=10
```

**File:** `frontend/.env.example`

```
VITE_API_URL=http://localhost:8000
```

---

## Summary of Fixes

| # | Issue | Priority | Time |
|---|-------|----------|------|
| 1 | Complete AuthService | 🔴 CRITICAL | 1 hour |
| 2 | Add missing auth endpoints | 🔴 CRITICAL | 1 hour |
| 3 | Add similarity function | 🔴 CRITICAL | 30 min |
| 4 | Fix ChatResponse model | 🔴 CRITICAL | 15 min |
| 5 | Add token blacklist on logout | 🔴 CRITICAL | 30 min |
| 6 | Add error handler middleware | 🟠 HIGH | 30 min |
| 7 | Fix CORS | 🟠 HIGH | 15 min |
| 8 | Fix database connection pool | 🟠 HIGH | 15 min |
| 9 | Create CourseContext | 🔴 CRITICAL | 1 hour |
| 10 | Add API functions | 🔴 CRITICAL | 30 min |
| 11 | Add input validation | 🟠 HIGH | 1 hour |
| 12 | Use pgvector for embeddings | 🟠 HIGH | 30 min |
| 13 | Add missing endpoints | 🟠 HIGH | 1 hour |
| 14 | Add error boundary | 🔴 CRITICAL | 30 min |
| 15 | Create .env files | 🟠 HIGH | 15 min |

**Total Estimated Time: 8-10 hours** for fixing all critical and high-priority issues

