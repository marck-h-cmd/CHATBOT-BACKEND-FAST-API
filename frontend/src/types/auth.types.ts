export interface User {
  id: number;
  codigo_universitario: string;
  email: string;
  nombres: string;
  apellidos: string;
  rol: 'estudiante' | 'docente' | 'admin';
  es_activo: boolean;
  email_verificado: boolean;
  ultimo_login?: string;
  fecha_creacion: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  usuario: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  codigo_universitario: string;
  email: string;
  nombres: string;
  apellidos: string;
  password: string;
}

export interface Session {
  id: number;
  fecha_inicio: string;
  fecha_expiracion: string;
  ip_address?: string;
  user_agent?: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}
