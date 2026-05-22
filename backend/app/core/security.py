from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
import bcrypt
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import re
import random

from app.config import Config
from app.database.connection import get_db
from app.database.models import Usuario, SesionUsuario, TokenBlacklist
from app.services.email_service import EmailService

# Esquema de seguridad
security = HTTPBearer()


class SecurityService:
    SECRET_KEY = Config.SECRET_KEY
    ALGORITHM = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 horas
    REFRESH_TOKEN_EXPIRE_DAYS = 7  # 7 días
    
    @staticmethod
    def verificar_dominio_unitru(email: str) -> bool:
        """Verifica que el email pertenezca al dominio unitru.edu.pe"""
        patron = r'^[a-zA-Z0-9._%+-]+@unitru\.edu\.pe$'
        return bool(re.match(patron, email))
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Hashea una contraseña con bcrypt (truncado a 72 bytes según estándar bcrypt)."""
        password_bytes = password.encode('utf-8')[:72]
        return bcrypt.hashpw(password_bytes, bcrypt.gensalt()).decode('utf-8')

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verifica una contraseña contra su hash bcrypt."""
        password_bytes = plain_password.encode('utf-8')[:72]
        hashed_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(password_bytes, hashed_bytes)
    
    @staticmethod
    def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
        """Crea un token JWT de acceso"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=SecurityService.ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire, "type": "access"})
        encoded_jwt = jwt.encode(to_encode, SecurityService.SECRET_KEY, algorithm=SecurityService.ALGORITHM)
        return encoded_jwt
    
    @staticmethod
    def create_refresh_token(data: Dict[str, Any]) -> str:
        """Crea un token JWT de refresco"""
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(days=SecurityService.REFRESH_TOKEN_EXPIRE_DAYS)
        to_encode.update({"exp": expire, "type": "refresh"})
        encoded_jwt = jwt.encode(to_encode, SecurityService.SECRET_KEY, algorithm=SecurityService.ALGORITHM)
        return encoded_jwt
    
    @staticmethod
    def decode_token(token: str) -> Dict[str, Any]:
        """Decodifica un token JWT"""
        try:
            payload = jwt.decode(token, SecurityService.SECRET_KEY, algorithms=[SecurityService.ALGORITHM])
            return payload
        except JWTError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Token inválido: {str(e)}",
                headers={"WWW-Authenticate": "Bearer"},
            )
    
    @staticmethod
    async def get_current_user(
        credentials: HTTPAuthorizationCredentials = Depends(security),
        db: Session = Depends(get_db)
    ) -> Usuario:
        """Obtiene el usuario actual a partir del token"""
        token = credentials.credentials
        
        # Verificar si token está en blacklist
        blacklisted = db.query(TokenBlacklist).filter(TokenBlacklist.token == token).first()
        if blacklisted:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token revocado",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Decodificar token
        try:
            payload = SecurityService.decode_token(token)
        except HTTPException as e:
            raise
        
        # Verificar tipo de token
        if payload.get("type") != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido para este endpoint",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        user_id: int = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido: usuario no identificado",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Verificar sesión activa
        sesion = db.query(SesionUsuario).filter(
            SesionUsuario.token == token,
            SesionUsuario.es_activa == True,
            SesionUsuario.fecha_expiracion > datetime.utcnow()
        ).first()
        
        if not sesion:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Sesión expirada o inválida",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Obtener usuario
        user = db.query(Usuario).filter(Usuario.id == user_id, Usuario.es_activo == True).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Usuario no encontrado o inactivo",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return user


class AuthService:
    
    @staticmethod
    def _generar_otp() -> str:
        """Genera un código OTP numérico de 6 dígitos."""
        return ''.join([str(random.randint(0, 9)) for _ in range(6)])

    @staticmethod
    async def registrar_usuario(
        db: Session,
        codigo_universitario: str,
        email: str,
        nombres: str,
        apellidos: str,
        password: str
    ) -> Usuario:
        """Registra un nuevo usuario con estado inactivo y envía OTP por email."""

        # Validar dominio del email
        if not SecurityService.verificar_dominio_unitru(email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El email debe ser institucional (@unitru.edu.pe)"
            )

        # Verificar si ya existe un usuario activo o verificado con ese email/código
        existing_user = db.query(Usuario).filter(
            (Usuario.email == email) | (Usuario.codigo_universitario == codigo_universitario)
        ).first()

        if existing_user and existing_user.email_verificado:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya existe un usuario con ese email o código universitario"
            )

        # Si existe pero no está verificado, reutilizar el registro (sobreescribir datos)
        hashed_password = SecurityService.hash_password(password)
        otp_code = AuthService._generar_otp()
        otp_expires_at = datetime.utcnow() + timedelta(minutes=10)

        if existing_user and not existing_user.email_verificado:
            usuario = existing_user
            usuario.codigo_universitario = codigo_universitario
            usuario.nombres = nombres
            usuario.apellidos = apellidos
            usuario.hashed_password = hashed_password
            usuario.otp_code = otp_code
            usuario.otp_expires_at = otp_expires_at
            db.commit()
            db.refresh(usuario)
        else:
            # Crear usuario nuevo (inactivo hasta verificar OTP)
            usuario = Usuario(
                codigo_universitario=codigo_universitario,
                email=email,
                nombres=nombres,
                apellidos=apellidos,
                hashed_password=hashed_password,
                es_activo=False,
                email_verificado=False,
                otp_code=otp_code,
                otp_expires_at=otp_expires_at
            )
            db.add(usuario)
            db.commit()
            db.refresh(usuario)

        # Enviar email con OTP (asíncrono, no bloquea el registro)
        await EmailService.enviar_email_verificacion_otp(
            destinatario=email,
            nombres=nombres,
            codigo_otp=otp_code
        )

        return usuario

    @staticmethod
    def verificar_otp(db: Session, email: str, otp_code: str) -> Dict[str, Any]:
        """Verifica el código OTP y activa la cuenta del usuario."""

        usuario = db.query(Usuario).filter(Usuario.email == email).first()
        if not usuario:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado"
            )

        if usuario.email_verificado:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La cuenta ya ha sido verificada"
            )

        if not usuario.otp_code or not usuario.otp_expires_at:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No hay un código de verificación pendiente"
            )

        if datetime.utcnow() > usuario.otp_expires_at:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El código de verificación ha expirado. Solicita uno nuevo."
            )

        if usuario.otp_code != otp_code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Código de verificación incorrecto"
            )

        # Activar cuenta
        usuario.email_verificado = True
        usuario.es_activo = True
        usuario.otp_code = None
        usuario.otp_expires_at = None
        db.commit()
        db.refresh(usuario)

        # Crear tokens y sesión
        token_data = {"sub": str(usuario.id), "email": usuario.email, "rol": usuario.rol}
        access_token = SecurityService.create_access_token(token_data)
        refresh_token = SecurityService.create_refresh_token(token_data)
        fecha_expiracion = datetime.utcnow() + timedelta(minutes=SecurityService.ACCESS_TOKEN_EXPIRE_MINUTES)

        sesion = SesionUsuario(
            id_usuario=usuario.id,
            token=access_token,
            refresh_token=refresh_token,
            fecha_expiracion=fecha_expiracion
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
    async def reenviar_otp(db: Session, email: str) -> bool:
        """Genera un nuevo OTP y lo reenvía por email."""

        usuario = db.query(Usuario).filter(Usuario.email == email).first()
        if not usuario:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado"
            )

        if usuario.email_verificado:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La cuenta ya ha sido verificada"
            )

        otp_code = AuthService._generar_otp()
        usuario.otp_code = otp_code
        usuario.otp_expires_at = datetime.utcnow() + timedelta(minutes=10)
        db.commit()

        await EmailService.enviar_email_verificacion_otp(
            destinatario=email,
            nombres=usuario.nombres,
            codigo_otp=otp_code
        )

        return True
    
    @staticmethod
    def login(
        db: Session,
        email: str,
        password: str,
        ip_address: str = None,
        user_agent: str = None
    ) -> Dict[str, Any]:
        """Autentica un usuario y crea sesión"""

        # Buscar usuario por email (sin filtrar por es_activo para poder validar verificación)
        usuario = db.query(Usuario).filter(Usuario.email == email).first()

        if not usuario:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales incorrectas"
            )

        # Verificar contraseña
        if not SecurityService.verify_password(password, usuario.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales incorrectas"
            )

        # Validar que la cuenta esté verificada
        if not usuario.email_verificado:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cuenta no verificada. Revisa tu correo institucional e ingresa el código de verificación."
            )

        # Validar que la cuenta esté activa
        if not usuario.es_activo:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cuenta inactiva. Contacta al administrador."
            )
        
        # Crear tokens
        token_data = {"sub": str(usuario.id), "email": usuario.email, "rol": usuario.rol}
        access_token = SecurityService.create_access_token(token_data)
        refresh_token = SecurityService.create_refresh_token(token_data)
        
        # Calcular fecha de expiración
        fecha_expiracion = datetime.utcnow() + timedelta(minutes=SecurityService.ACCESS_TOKEN_EXPIRE_MINUTES)
        
        # Guardar sesión
        sesion = SesionUsuario(
            id_usuario=usuario.id,
            token=access_token,
            refresh_token=refresh_token,
            ip_address=ip_address,
            user_agent=user_agent,
            fecha_expiracion=fecha_expiracion
        )
        db.add(sesion)
        
        # Actualizar último login
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
        
        # Decodificar refresh token
        try:
            payload = SecurityService.decode_token(refresh_token)
            if payload.get("type") != "refresh":
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token inválido"
                )
            user_id = payload.get("sub")
        except HTTPException:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token inválido"
            )
        
        # Buscar sesión con ese refresh token
        sesion = db.query(SesionUsuario).filter(
            SesionUsuario.refresh_token == refresh_token,
            SesionUsuario.es_activa == True
        ).first()
        
        if not sesion:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Sesión no encontrada"
            )
        
        # Obtener usuario
        usuario = db.query(Usuario).filter(Usuario.id == user_id, Usuario.es_activo == True).first()
        if not usuario:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Usuario no encontrado"
            )
        
        # Invalidar sesión anterior
        sesion.es_activa = False
        sesion.fecha_cierre = datetime.utcnow()
        
        # Crear nuevos tokens
        token_data = {"sub": str(usuario.id), "email": usuario.email, "rol": usuario.rol}
        new_access_token = SecurityService.create_access_token(token_data)
        new_refresh_token = SecurityService.create_refresh_token(token_data)
        
        # Crear nueva sesión
        fecha_expiracion = datetime.utcnow() + timedelta(minutes=SecurityService.ACCESS_TOKEN_EXPIRE_MINUTES)
        nueva_sesion = SesionUsuario(
            id_usuario=usuario.id,
            token=new_access_token,
            refresh_token=new_refresh_token,
            ip_address=ip_address,
            user_agent=user_agent,
            fecha_expiracion=fecha_expiracion
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
    
    @staticmethod
    def logout(db: Session, token: str, refresh_token: str = None) -> bool:
        """Cierra la sesión del usuario"""
        
        # Buscar y cerrar sesión
        sesion = db.query(SesionUsuario).filter(
            SesionUsuario.token == token,
            SesionUsuario.es_activa == True
        ).first()
        
        if sesion:
            sesion.es_activa = False
            sesion.fecha_cierre = datetime.utcnow()
            
            # Agregar token a blacklist
            blacklist = TokenBlacklist(
                token=token,
                fecha_expiracion=sesion.fecha_expiracion
            )
            db.add(blacklist)
            
            if refresh_token:
                blacklist_refresh = TokenBlacklist(
                    token=refresh_token,
                    fecha_expiracion=datetime.utcnow() + timedelta(days=7)
                )
                db.add(blacklist_refresh)
            
            db.commit()
            return True
        
        return False
    
    @staticmethod
    def cambiar_password(
        db: Session,
        usuario: Usuario,
        current_password: str,
        new_password: str
    ) -> bool:
        """Cambia la contraseña del usuario"""
        
        if not SecurityService.verify_password(current_password, usuario.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Contraseña actual incorrecta"
            )
        
        usuario.hashed_password = SecurityService.hash_password(new_password)
        usuario.fecha_actualizacion = datetime.utcnow()
        db.commit()
        
        return True
    
    @staticmethod
    def get_usuario_by_id(db: Session, user_id: int) -> Optional[Usuario]:
        return db.query(Usuario).filter(Usuario.id == user_id, Usuario.es_activo == True).first()