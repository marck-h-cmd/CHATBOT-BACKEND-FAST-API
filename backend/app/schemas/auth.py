from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional
from datetime import datetime
import re


class UsuarioRegistro(BaseModel):
    codigo_universitario: str = Field(..., min_length=8, max_length=20)
    email: EmailStr
    nombres: str = Field(..., min_length=2, max_length=100)
    apellidos: str = Field(..., min_length=2, max_length=100)
    password: str = Field(..., min_length=6, max_length=100)
    
    @validator('email')
    def validar_dominio_unitru(cls, v):
        if not re.match(r'^[a-zA-Z0-9._%+-]+@unitru\.edu\.pe$', v):
            raise ValueError('El email debe ser institucional (@unitru.edu.pe)')
        return v
    
    @validator('codigo_universitario')
    def validar_codigo(cls, v):
        if not re.match(r'^\d{8,10}$', v):
            raise ValueError('El código universitario debe tener entre 8 y 10 dígitos')
        return v


class UsuarioLogin(BaseModel):
    email: EmailStr
    password: str


class UsuarioResponse(BaseModel):
    id: int
    codigo_universitario: str
    email: str
    nombres: str
    apellidos: str
    rol: str
    es_activo: bool
    email_verificado: bool
    ultimo_login: Optional[datetime]
    fecha_registro: datetime
    
    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    usuario: UsuarioResponse


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6, max_length=100)


class ApiResponse(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None


class VerificarOTPRequest(BaseModel):
    email: EmailStr
    otp_code: str = Field(..., min_length=6, max_length=6)

    @validator('email')
    def validar_dominio_unitru(cls, v):
        if not re.match(r'^[a-zA-Z0-9._%+-]+@unitru\.edu\.pe$', v):
            raise ValueError('El email debe ser institucional (@unitru.edu.pe)')
        return v


class ReenviarOTPRequest(BaseModel):
    email: EmailStr

    @validator('email')
    def validar_dominio_unitru(cls, v):
        if not re.match(r'^[a-zA-Z0-9._%+-]+@unitru\.edu\.pe$', v):
            raise ValueError('El email debe ser institucional (@unitru.edu.pe)')
        return v