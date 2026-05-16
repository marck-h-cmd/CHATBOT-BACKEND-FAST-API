import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Mail, Lock, User, Hash, AlertCircle, ArrowLeft } from 'lucide-react';
import { isValidUniversityEmail, isValidUniversityCode, isValidPassword, isValidName } from '../../utils/validators';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    codigo_universitario: '',
    email: '',
    nombres: '',
    apellidos: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Limpiar error del campo al escribir
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: '' });
  };

  const validateForm = () => {
    const newErrors = {};
    if (!isValidUniversityCode(formData.codigo_universitario))
      newErrors.codigo_universitario = 'Código universitario debe tener 8-10 dígitos';
    if (!isValidUniversityEmail(formData.email))
      newErrors.email = 'Correo debe ser @unitru.edu.pe';
    if (!isValidName(formData.nombres))
      newErrors.nombres = 'Ingresa nombres válidos (solo letras, mínimo 2 caracteres)';
    if (!isValidName(formData.apellidos))
      newErrors.apellidos = 'Ingresa apellidos válidos';
    if (!isValidPassword(formData.password))
      newErrors.password = 'Contraseña debe tener al menos 6 caracteres';
    if (formData.password !== formData.confirmPassword)
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setLoading(true);
    const { confirmPassword, ...userData } = formData;
    const result = await register(userData);
    setLoading(false);
    if (result.success) {
      navigate('/login', { state: { message: 'Registro exitoso. Ahora inicia sesión.' } });
    } else {
      setErrors({ general: result.error?.message || 'Hubo un error al crear la cuenta. Por favor, intenta de nuevo.' });
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Decorative Panel (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-5/12 bg-indigo-950 flex-col justify-between p-12 relative overflow-hidden">
        {/* Subtle geometric pattern (optional, kept minimal) */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]"></div>

        <div className="relative z-10">
          <Link to="/login" className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 transition-colors border border-white/10 mb-12 shadow-sm text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-4xl font-bold text-white tracking-tight leading-tight mb-5">
            Únete a la nueva<br />plataforma Sylia
          </h1>
          <p className="text-indigo-200 text-lg leading-relaxed max-w-sm">
            Crea tu cuenta institucional en segundos y comienza a gestionar tus herramientas académicas con el poder de la IA.
          </p>
        </div>

        <div className="relative z-10 text-indigo-200/60 text-sm font-medium tracking-wide">
          &copy; {new Date().getFullYear()} Sylia AI. Todos los derechos reservados.
        </div>
      </div>

      {/* Form Panel */}
      <div className="w-full lg:w-7/12 flex items-center justify-center bg-white p-6 sm:p-12 relative overflow-y-auto">
        <div className="w-full max-w-2xl">
          {/* Mobile Back Button & Logo */}
          <div className="lg:hidden flex items-center justify-between mb-8">
            <Link to="/login" className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 shadow-sm">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shadow-sm">
              <img src="/logo.png" alt="Sylia Logo" className="w-6 h-6 object-contain" />
            </div>
          </div>
          
          <div className="mb-10">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Crear cuenta</h2>
            <p className="text-slate-500 mt-2 text-sm sm:text-base font-medium">Completa tus datos usando tu correo institucional @unitru.edu.pe</p>
          </div>

          {errors.general && (
            <div className="mb-8 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-red-800">Error de registro</h3>
                <p className="text-sm text-red-600 mt-1">{errors.general}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Grid Layout for Desktop */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Nombres"
                name="nombres"
                value={formData.nombres}
                onChange={handleChange}
                placeholder="Ej. Juan Carlos"
                icon={User}
                required
                error={errors.nombres}
              />
              <Input
                label="Apellidos"
                name="apellidos"
                value={formData.apellidos}
                onChange={handleChange}
                placeholder="Ej. Pérez Gómez"
                icon={User}
                required
                error={errors.apellidos}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Código Universitario"
                name="codigo_universitario"
                value={formData.codigo_universitario}
                onChange={handleChange}
                placeholder="Ej. 12345678"
                icon={Hash}
                required
                error={errors.codigo_universitario}
              />
              <Input
                label="Correo Institucional"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="usuario@unitru.edu.pe"
                icon={Mail}
                required
                error={errors.email}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Contraseña"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Mínimo 6 caracteres"
                icon={Lock}
                required
                error={errors.password}
              />
              <Input
                label="Confirmar Contraseña"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Repite la contraseña"
                icon={Lock}
                required
                error={errors.confirmPassword}
              />
            </div>

            <div className="pt-4">
              <Button type="submit" loading={loading} className="w-full h-12 text-base font-semibold shadow-sm">
                Crear cuenta institucional
              </Button>
            </div>
          </form>

          <p className="text-center text-sm text-slate-600 mt-8 font-medium">
            ¿Ya tienes una cuenta?{' '}
            <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">
              Inicia sesión aquí
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;