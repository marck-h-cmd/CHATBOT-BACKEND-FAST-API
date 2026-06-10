import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Mail, Lock, AlertCircle, Eye, EyeOff, ArrowRight, BookOpen, Shield, MessageSquare, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
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
      const msg = result.error?.message || 'Error al iniciar sesión. Verifica tu correo institucional y contraseña.';
      // Si el backend indica que la cuenta no está verificada, redirigir a verificación
      if (msg.toLowerCase().includes('no verificada') || msg.toLowerCase().includes('código de verificación')) {
        navigate('/verify-email', { state: { email, message: 'Tu cuenta aún no ha sido verificada. Ingresa el código de 6 dígitos enviado a tu correo.' } });
      } else {
        setError(msg);
      }
    }
  };

  return (
    <div className="min-h-screen lg:h-screen w-screen flex bg-[#FAF9F6] dark:bg-[#0B0F19] font-['Plus_Jakarta_Sans',sans-serif] lg:overflow-hidden select-none relative transition-colors duration-200">
      
      {/* Theme Toggle Button */}
      <div className="absolute top-4 right-4 z-50">
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200 shadow-sm"
          title="Cambiar tema"
        >
          {resolvedTheme === 'dark' ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
        </button>
      </div>
      
      {/* LEFT PANEL: Classic Deep Slate Split Branding Panel */}
      <div className="hidden lg:flex lg:w-[42%] bg-[#0B0F19] flex-col justify-between p-10 relative overflow-hidden border-r border-[#1E293B]">
        {/* Subtle geometric lines background pattern */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="split-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#split-grid)" />
          </svg>
        </div>

        {/* Top Brand Logo */}
        <motion.div 
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
          className="relative z-10 flex items-center gap-3"
        >
          <img src="/logo.png" alt="Sylia AI Logo" className="h-10 w-auto object-contain" />
          <span className="text-lg font-bold text-white tracking-tight">Sylia AI</span>
        </motion.div>


        {/* Content Body */}
        <div className="relative z-10 my-auto space-y-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-2.5"
          >
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Versión 1.0.1 • Producción
            </span>
            <h1 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-[1.15]">
              Gestión académica <br />
              <span className="text-blue-500">inteligente y fluida</span>
            </h1>
            <p className="text-slate-400 text-sm max-w-sm leading-relaxed">
              Sylia AI integra validación inteligente de sílabos con un Service Desk predictivo basado en ITIL 4 para potenciar tu experiencia académica.
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
              className="flex gap-3 p-3.5 rounded-xl bg-[#131A2C] border border-[#1E293B] cursor-pointer transition-colors duration-200"
            >
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white">Análisis RAG de Sílabos</h3>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-normal">
                  Pregunta cualquier duda sobre tus asignaturas, fórmulas de evaluación o asistencia y obtén respuestas precisas al instante.
                </p>
              </div>
            </motion.div>

            {/* Feature 2 */}
            <motion.div 
              whileHover={{ scale: 1.015, x: 4, backgroundColor: "#151C2F", borderColor: "#334155" }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="flex gap-3 p-3.5 rounded-xl bg-[#131A2C] border border-[#1E293B] cursor-pointer transition-colors duration-200"
            >
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white">Service Desk Predictivo ITIL 4</h3>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-normal">
                  Reporta incidentes o realiza solicitudes académicas con categorización inteligente y flujos de aprobación automáticos.
                </p>
              </div>
            </motion.div>

            {/* Feature 3 */}
            <motion.div 
              whileHover={{ scale: 1.015, x: 4, backgroundColor: "#151C2F", borderColor: "#334155" }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="flex gap-3 p-3.5 rounded-xl bg-[#131A2C] border border-[#1E293B] cursor-pointer transition-colors duration-200"
            >
              <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white">Escalamiento a Consejería</h3>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-normal">
                  Ante cualquier situación de riesgo académico, el sistema te conecta automáticamente con los canales de tutoría docente.
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
      <div className="w-full lg:w-[58%] flex items-center justify-center p-6 sm:p-10 relative bg-white dark:bg-[#0B0F19] overflow-y-auto no-scrollbar transition-colors duration-200">
        
        {/* Centered Minimalist Form Container */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 100, damping: 15 }}
          className="w-full max-w-sm space-y-6"
        >
          {/* Mobile Header Logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-2">
            <img src="/logo.png" alt="Sylia AI Logo" className="h-8 w-auto object-contain" />
            <span className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">Sylia AI</span>
          </div>

          {/* Form Header */}
          <div className="space-y-1.5 text-left">
            <h2 className="text-2xl lg:text-3xl font-extrabold text-[#0B0F19] dark:text-white tracking-tight">
              Iniciar Sesión
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold leading-relaxed">
              Ingresa tus credenciales oficiales de la Universidad Nacional de Trujillo
            </p>
          </div>

          {/* Alert Message for Errors */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -6, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -6, height: 0 }}
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
                className="overflow-hidden"
              >
                <div className="p-3.5 rounded-xl bg-red-50/80 dark:bg-red-950/20 border border-red-200 dark:border-red-800/50 flex items-start gap-2.5">
                  <AlertCircle className="w-4.5 h-4.5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <h4 className="text-[10px] font-bold text-red-950 dark:text-red-200">Acceso Incorrecto</h4>
                    <p className="text-[10px] text-red-700 dark:text-red-400 font-medium leading-relaxed">{error}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Login Form (Clean, Modern, No Inside Icons) */}
          <form onSubmit={handleSubmit} className="space-y-4.5">
            
            {/* Email Input */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 tracking-tight">
                Correo Institucional
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@unitru.edu.pe"
                required
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 text-xs font-semibold placeholder-slate-400 dark:placeholder-slate-500 transition-all duration-200 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 dark:focus:border-slate-100 dark:focus:ring-1 dark:focus:ring-slate-100 shadow-sm focus:shadow-sm"
              />
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label htmlFor="password" className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 tracking-tight">
                  Contraseña
                </label>
                <Link to="/forgot-password" state={{ email }} className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-all">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <div className="relative group">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-4 pr-10 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 text-xs font-semibold placeholder-slate-400 dark:placeholder-slate-500 transition-all duration-200 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 dark:focus:border-slate-100 dark:focus:ring-1 dark:focus:ring-slate-100 shadow-sm focus:shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 dark:text-slate-550 hover:text-slate-600 dark:hover:text-slate-300 transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <motion.button
                whileHover={{ scale: 1.015, backgroundColor: resolvedTheme === 'dark' ? '#1e293b' : '#151C2F' }}
                whileTap={{ scale: 0.985 }}
                type="submit"
                disabled={loading}
                className="relative w-full py-3 bg-[#0B0F19] dark:bg-slate-800 text-white rounded-xl font-bold text-xs tracking-wide shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2 group disabled:opacity-75 disabled:cursor-not-allowed overflow-hidden"
              >
                {loading ? (
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <>
                    <span>Ingresar al panel</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all duration-200" />
                  </>
                )}
              </motion.button>
            </div>
          </form>

          {/* Extra Register Redirect */}
          <div className="text-center pt-2.5 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              ¿Aún no tienes una cuenta institucional?{' '}
              <Link to="/register" className="font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-colors ml-0.5">
                Regístrate aquí
              </Link>
            </p>
          </div>
        </motion.div>
      </div>

    </div>
  );
};

export default LoginPage;