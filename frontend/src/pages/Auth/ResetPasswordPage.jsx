import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Mail, Lock, KeyRound, AlertCircle, Eye, EyeOff, CheckCircle2, ArrowRight, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';

const ResetPasswordPage = () => {
  const location = useLocation();
  // Obtiene el email de la ubicación, o vacío si se accede directo (no recomendado)
  const [email, setEmail] = useState(location.state?.email || '');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { resetPassword } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  // Si no hay email, podrías redirigir de vuelta a forgot-password, 
  // pero lo dejamos para que lo llene si es necesario.
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    const result = await resetPassword(email, otpCode, newPassword);
    setLoading(false);

    if (result.success) {
      setSuccess('Contraseña actualizada correctamente. Redirigiendo al login...');
      setTimeout(() => {
        navigate('/login');
      }, 2500);
    } else {
      setError(result.error?.message || 'Error al restablecer contraseña. Verifica el código OTP.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF9F6] dark:bg-[#0B0F19] font-['Plus_Jakarta_Sans',sans-serif] p-4 sm:p-6 lg:p-8 select-none relative transition-colors duration-200">
      
      {/* Theme Toggle */}
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
      
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 15 }}
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden"
      >
        <div className="p-8 sm:p-10">
            {/* Header */}
            <div className="flex justify-center items-center gap-2.5 mb-8">
                <img src="/logo.png" alt="Sylia AI Logo" className="h-8 w-auto object-contain" />
                <span className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Sylia AI</span>
            </div>

            <div className="text-center mb-8">
                <h2 className="text-2xl font-extrabold text-[#0B0F19] dark:text-white tracking-tight mb-2">
                    Nueva Contraseña
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold leading-relaxed">
                    Ingresa el código OTP que recibiste y tu nueva contraseña.
                </p>
            </div>

            <AnimatePresence mode="wait">
                {error && (
                <motion.div 
                    initial={{ opacity: 0, y: -6, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -6, height: 0 }}
                    className="overflow-hidden mb-6"
                >
                    <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 flex items-start gap-2.5">
                    <AlertCircle className="w-4.5 h-4.5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-700 dark:text-red-400 font-medium leading-relaxed">{error}</p>
                    </div>
                </motion.div>
                )}

                {success && (
                <motion.div 
                    initial={{ opacity: 0, y: -6, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -6, height: 0 }}
                    className="overflow-hidden mb-6"
                >
                    <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-start gap-2.5">
                    <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium leading-relaxed">{success}</p>
                    </div>
                </motion.div>
                )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email - Opcionalmente de solo lectura si ya vino del paso anterior */}
                <div className="space-y-1.5">
                    <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 tracking-tight">
                        Correo Institucional
                    </label>
                    <div className="relative">
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            readOnly={!!location.state?.email}
                            className={`w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold placeholder-slate-400 dark:placeholder-slate-500 shadow-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all ${location.state?.email ? 'text-slate-500 cursor-not-allowed' : 'text-slate-900 dark:text-slate-100'}`}
                        />
                        <Mail className="absolute left-3.5 top-3 w-4.5 h-4.5 text-slate-400" />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 tracking-tight">
                        Código de Verificación (OTP)
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                            placeholder="123456"
                            required
                            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 text-sm font-bold tracking-[0.2em] placeholder-slate-400 dark:placeholder-slate-500 transition-all focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm"
                        />
                        <KeyRound className="absolute left-3.5 top-3 w-4.5 h-4.5 text-slate-400" />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 tracking-tight">
                        Nueva Contraseña
                    </label>
                    <div className="relative group">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            className="w-full pl-10 pr-10 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 text-sm font-semibold placeholder-slate-400 dark:placeholder-slate-500 transition-all focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm"
                        />
                        <Lock className="absolute left-3.5 top-3 w-4.5 h-4.5 text-slate-400" />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none transition-colors"
                        >
                            {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                        </button>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 tracking-tight">
                        Confirmar Contraseña
                    </label>
                    <div className="relative group">
                        <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            className="w-full pl-10 pr-10 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 text-sm font-semibold placeholder-slate-400 dark:placeholder-slate-500 transition-all focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm"
                        />
                        <Lock className="absolute left-3.5 top-3 w-4.5 h-4.5 text-slate-400" />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none transition-colors"
                        >
                            {showConfirmPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                        </button>
                    </div>
                </div>

                <div className="pt-3">
                    <motion.button
                        whileHover={{ scale: 1.015 }}
                        whileTap={{ scale: 0.985 }}
                        type="submit"
                        disabled={loading || success}
                        className="relative w-full py-3 bg-[#0B0F19] dark:bg-blue-600 text-white rounded-xl font-bold text-sm tracking-wide shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        ) : (
                        <>
                            <span>Cambiar Contraseña</span>
                            <ArrowRight className="w-4 h-4 text-white/70 group-hover:text-white group-hover:translate-x-0.5 transition-transform" />
                        </>
                        )}
                    </motion.button>
                </div>
            </form>
            
            <div className="text-center pt-8 border-t border-slate-100 dark:border-slate-800 mt-8">
                <Link to="/login" className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
                    Volver a iniciar sesión
                </Link>
            </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ResetPasswordPage;
