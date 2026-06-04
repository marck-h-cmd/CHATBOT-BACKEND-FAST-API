import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Mail, Lock, User, Hash, AlertCircle, ArrowLeft, ArrowRight, BookOpen, Shield, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const validateField = (name, value) => {
    switch (name) {
      case 'nombres':
        return isValidName(value) ? '' : 'Ingresa nombres válidos (solo letras, mín. 2)';
      case 'apellidos':
        return isValidName(value) ? '' : 'Ingresa apellidos válidos (solo letras, mín. 2)';
      case 'codigo_universitario':
        return isValidUniversityCode(value) ? '' : 'Código universitario debe tener entre 8 y 10 dígitos';
      case 'email':
        return isValidUniversityEmail(value) ? '' : 'Debe ser correo institucional @unitru.edu.pe';
      case 'password':
        return isValidPassword(value) ? '' : 'Mínimo 6 caracteres';
      case 'confirmPassword':
        return value === formData.password ? '' : 'Las contraseñas no coinciden';
      default:
        return '';
    }
  };

  const handleChange = (e) => {
    const { name } = e.target;
    let value = e.target.value;

    // Restricciones estrictas en tiempo real al escribir
    if (name === 'nombres' || name === 'apellidos') {
      // Bloquear números y caracteres especiales
      value = value.replace(/[^a-zA-ZáéíóúñÑ\s]/g, '');
    } else if (name === 'codigo_universitario') {
      // Bloquear todo lo que no sea dígito y máximo 10 caracteres
      value = value.replace(/\D/g, '').slice(0, 10);
    } else if (name === 'email') {
      // Convertir a minúsculas y quitar espacios en blanco
      value = value.toLowerCase().replace(/\s/g, '');
    }

    setFormData(prev => ({ ...prev, [name]: value }));

    // Validar en tiempo real si el campo ya fue tocado (onBlur previo)
    if (touched[name]) {
      const fieldError = validateField(name, value);
      setErrors(prev => ({ ...prev, [name]: fieldError }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    const fieldError = validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: fieldError }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Marcar todos los campos como tocados y validar
    const allTouched = {};
    const newErrors = {};
    Object.keys(formData).forEach(key => {
      allTouched[key] = true;
      const err = validateField(key, formData[key]);
      if (err) newErrors[key] = err;
    });

    setTouched(allTouched);
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setLoading(true);
    const { confirmPassword, ...userData } = formData;
    const result = await register(userData);
    setLoading(false);
    if (result.success) {
      navigate('/verify-email', { state: { email: userData.email, nombres: userData.nombres, message: 'Registro exitoso. Ingresa el código de verificación enviado a tu correo.' } });
    } else {
      setErrors({ general: result.error?.message || 'Hubo un error al crear la cuenta. Intenta de nuevo.' });
    }
  };

  const getInputClass = (name) => {
    const baseClass = "w-full px-3.5 py-2.5 bg-white border rounded-xl text-slate-900 text-xs font-semibold placeholder-slate-400 transition-all duration-200 focus:outline-none focus:ring-1 shadow-sm";
    if (touched[name]) {
      if (errors[name]) {
        return `${baseClass} border-red-500 focus:border-red-500 focus:ring-red-500`;
      } else if (formData[name] !== '') {
        return `${baseClass} border-emerald-500/80 focus:border-emerald-500 focus:ring-emerald-500`;
      }
    }
    return `${baseClass} border-slate-200 focus:border-slate-900 focus:ring-slate-900`;
  };

  return (
    <div className="min-h-screen lg:h-screen w-screen flex bg-[#FAF9F6] font-['Plus_Jakarta_Sans',sans-serif] lg:overflow-hidden select-none">
      
      {/* LEFT PANEL: Classic Deep Slate Split Branding Panel */}
      <div className="hidden lg:flex lg:w-[42%] bg-[#0B0F19] flex-col justify-between p-10 relative overflow-hidden border-r border-[#1E293B]">
        {/* Subtle geometric lines background pattern */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="split-grid-reg" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#split-grid-reg)" />
          </svg>
        </div>

        {/* Top Brand Logo & Back Button */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Sylia AI Logo" className="h-10 w-auto object-contain" />
            <span className="text-lg font-bold text-white tracking-tight">Sylia AI</span>
          </div>
          <Link to="/login" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300 hover:text-white transition-all">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver al login</span>
          </Link>
        </div>

        {/* Content Body */}
        <div className="relative z-10 my-auto space-y-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-2.5"
          >
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Registro Único de Cuentas
            </span>
            <h1 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-[1.15]">
              Únete a la nueva <br />
              <span className="text-blue-500">experiencia académica</span>
            </h1>
            <p className="text-slate-400 text-sm max-w-sm leading-relaxed">
              Crea tu cuenta oficial en segundos y accede a herramientas de inteligencia artificial y soporte predictivo diseñados para la UNT.
            </p>
          </motion.div>

          {/* Core Features list with clean flat design */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-3"
          >
            {/* Feature 1 */}
            <motion.div 
              whileHover={{ scale: 1.015, x: 4, backgroundColor: "#151C2F", borderColor: "#334155" }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="flex gap-3 p-3 rounded-xl bg-[#131A2C] border border-[#1E293B] cursor-pointer transition-colors duration-200"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white">Herramientas RAG</h3>
                <p className="text-[10px] text-slate-400 leading-normal">
                  Acceso completo al motor de consulta de tus sílabos e información institucional en tiempo real.
                </p>
              </div>
            </motion.div>

            {/* Feature 2 */}
            <motion.div 
              whileHover={{ scale: 1.015, x: 4, backgroundColor: "#151C2F", borderColor: "#334155" }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="flex gap-3 p-3 rounded-xl bg-[#131A2C] border border-[#1E293B] cursor-pointer transition-colors duration-200"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white">Soporte ITIL 4</h3>
                <p className="text-[10px] text-slate-400 leading-normal">
                  Crea y gestiona tus incidentes o solicitudes académicas de manera predictiva y simplificada.
                </p>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Footer info */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-[10px] text-slate-500 font-semibold"
        >
          UNT • Ingeniería de Sistemas &copy; {new Date().getFullYear()}
        </motion.div>
      </div>

      {/* RIGHT PANEL: Classic Clean White Form Column */}
      <div className="w-full lg:w-[58%] flex items-center justify-center p-6 sm:p-10 relative bg-white overflow-y-auto no-scrollbar">
        
        {/* Centered Minimalist Form Container */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 100, damping: 15 }}
          className="w-full max-w-2xl space-y-6"
        >
          {/* Mobile Back Button & Header Logo */}
          <div className="lg:hidden flex items-center justify-between mb-2">
            <Link to="/login" className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 shadow-sm hover:bg-slate-100 transition-colors">
              <ArrowLeft className="w-4.5 h-4.5" />
            </Link>
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="Sylia AI Logo" className="h-7 w-auto object-contain" />
              <span className="text-xs font-extrabold text-slate-900 tracking-tight">Sylia AI</span>
            </div>
          </div>

          {/* Form Header */}
          <div className="space-y-1 text-left">
            <h2 className="text-2xl lg:text-3xl font-extrabold text-[#0B0F19] tracking-tight">
              Crear cuenta
            </h2>
            <p className="text-slate-500 text-xs font-semibold leading-relaxed">
              Completa tus datos usando tu correo oficial @unitru.edu.pe
            </p>
          </div>

          {/* Alert Message for Errors */}
          <AnimatePresence mode="wait">
            {errors.general && (
              <motion.div 
                initial={{ opacity: 0, y: -6, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -6, height: 0 }}
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
                className="overflow-hidden"
              >
                <div className="p-3.5 rounded-xl bg-red-50/80 border border-red-200 flex items-start gap-2.5">
                  <AlertCircle className="w-4.5 h-4.5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <h4 className="text-[10px] font-bold text-red-950">Error de Registro</h4>
                    <p className="text-[10px] text-red-700 font-medium leading-relaxed">{errors.general}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Registration Form (Pristine, Modern, 2-Column Grid Layout) */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Row 1: Nombres y Apellidos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="nombres" className="block text-[12px] font-bold text-slate-700 tracking-tight">
                  Nombres
                </label>
                <input
                  id="nombres"
                  name="nombres"
                  type="text"
                  value={formData.nombres}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Juan Carlos"
                  required
                  className={getInputClass('nombres')}
                />
                <AnimatePresence>
                  {touched.nombres && errors.nombres && (
                    <motion.p 
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="text-red-500 text-[10px] font-bold mt-1"
                    >
                      {errors.nombres}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              <div className="space-y-1">
                <label htmlFor="apellidos" className="block text-[12px] font-bold text-slate-700 tracking-tight">
                  Apellidos
                </label>
                <input
                  id="apellidos"
                  name="apellidos"
                  type="text"
                  value={formData.apellidos}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Pérez Gómez"
                  required
                  className={getInputClass('apellidos')}
                />
                <AnimatePresence>
                  {touched.apellidos && errors.apellidos && (
                    <motion.p 
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="text-red-500 text-[10px] font-bold mt-1"
                    >
                      {errors.apellidos}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Row 2: Código Universitario y Correo Institucional */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="codigo_universitario" className="block text-[12px] font-bold text-slate-700 tracking-tight">
                  Código Universitario
                </label>
                <input
                  id="codigo_universitario"
                  name="codigo_universitario"
                  type="text"
                  value={formData.codigo_universitario}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="1021400523"
                  required
                  className={getInputClass('codigo_universitario')}
                />
                <AnimatePresence>
                  {touched.codigo_universitario && errors.codigo_universitario && (
                    <motion.p 
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="text-red-500 text-[10px] font-bold mt-1"
                    >
                      {errors.codigo_universitario}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              <div className="space-y-1">
                <label htmlFor="email" className="block text-[12px] font-bold text-slate-700 tracking-tight">
                  Correo Institucional
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="usuario@unitru.edu.pe"
                  required
                  className={getInputClass('email')}
                />
                <AnimatePresence>
                  {touched.email && errors.email && (
                    <motion.p 
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="text-red-500 text-[10px] font-bold mt-1"
                    >
                      {errors.email}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Row 3: Contraseña y Confirmar Contraseña */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="password" className="block text-[12px] font-bold text-slate-700 tracking-tight">
                  Contraseña
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Mínimo 6 caracteres"
                  required
                  className={getInputClass('password')}
                />
                <AnimatePresence>
                  {touched.password && errors.password && (
                    <motion.p 
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="text-red-500 text-[10px] font-bold mt-1"
                    >
                      {errors.password}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              <div className="space-y-1">
                <label htmlFor="confirmPassword" className="block text-[12px] font-bold text-slate-700 tracking-tight">
                  Confirmar Contraseña
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Repite tu contraseña"
                  required
                  className={getInputClass('confirmPassword')}
                />
                <AnimatePresence>
                  {touched.confirmPassword && errors.confirmPassword && (
                    <motion.p 
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="text-red-500 text-[10px] font-bold mt-1"
                    >
                      {errors.confirmPassword}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <motion.button
                whileHover={{ scale: 1.012, backgroundColor: "#151C2F" }}
                whileTap={{ scale: 0.988 }}
                type="submit"
                disabled={loading}
                className="relative w-full py-2.5 bg-[#0B0F19] text-white rounded-xl font-bold text-xs tracking-wide shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2 group disabled:opacity-75 disabled:cursor-not-allowed overflow-hidden"
              >
                {loading ? (
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <>
                    <span>Crear cuenta institucional</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all duration-200" />
                  </>
                )}
              </motion.button>
            </div>
          </form>

          {/* Extra Login Redirect */}
          <div className="text-center pt-2.5 border-t border-slate-100">
            <p className="text-xs text-slate-500 font-medium">
              ¿Ya tienes una cuenta registrada?{' '}
              <Link to="/login" className="font-bold text-blue-600 hover:text-blue-700 hover:underline transition-colors ml-0.5">
                Inicia sesión aquí
              </Link>
            </p>
          </div>
        </motion.div>
      </div>

    </div>
  );
};

export default RegisterPage;