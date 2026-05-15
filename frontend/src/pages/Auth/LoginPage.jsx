import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Mail, Lock, AlertCircle } from 'lucide-react';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.success) {
      const role = result.user?.rol || '';
      if (role === 'admin') navigate('/admin');
      else navigate('/dashboard');
    } else {
      setError(result.error?.message || 'Credenciales incorrectas. Por favor, verifica tu correo y contraseña.');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Decorative Panel (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-indigo-900 flex-col justify-between p-12 relative overflow-hidden">
        {/* Subtle background pattern/glow */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-indigo-800/50 blur-[120px]"></div>
          <div className="absolute bottom-[10%] right-[0%] w-[60%] h-[60%] rounded-full bg-indigo-600/30 blur-[100px]"></div>
        </div>

        <div className="relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/20 mb-8 shadow-2xl">
            <img src="/logo.png" alt="Sylia Logo" className="w-10 h-10 object-contain" />
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight mb-5">
            Transformando la<br />gestión académica
          </h1>
          <p className="text-indigo-200 text-lg max-w-md leading-relaxed">
            Sylia AI integra validación inteligente de sílabos y un Service Desk predictivo para optimizar tu experiencia universitaria de forma segura y eficiente.
          </p>
        </div>

        <div className="relative z-10 text-indigo-300/80 text-sm font-medium">
          &copy; {new Date().getFullYear()} Sylia AI. Todos los derechos reservados.
        </div>
      </div>

      {/* Form Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-white p-6 sm:p-12 relative overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden w-16 h-16 mb-8 rounded-2xl overflow-hidden bg-indigo-50 border border-indigo-100 flex items-center justify-center shadow-sm mx-auto">
            <img src="/logo.png" alt="Sylia Logo" className="w-10 h-10 object-contain" />
          </div>
          
          <div className="text-center lg:text-left mb-10">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Bienvenido de nuevo</h2>
            <p className="text-slate-500 mt-2 text-sm sm:text-base">Ingresa tus credenciales para acceder a tu panel.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-red-800">Error de autenticación</h3>
                <p className="text-sm text-red-600 mt-1">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Correo electrónico"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@unitru.edu.pe"
              icon={Mail}
              required
            />
            
            <div className="space-y-1.5">
              <Input
                label="Contraseña"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                icon={Lock}
                required
              />
              <div className="flex justify-end">
                <a href="#" className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors">
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
            </div>

            <Button type="submit" loading={loading} className="w-full h-12 mt-2 text-base">
              Iniciar Sesión
            </Button>
          </form>

          <p className="text-center text-sm text-slate-600 mt-8">
            ¿No tienes una cuenta institucional?{' '}
            <Link to="/register" className="font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">
              Regístrate aquí
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;