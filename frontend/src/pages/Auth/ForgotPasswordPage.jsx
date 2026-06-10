import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Mail, ArrowRight, AlertCircle, CheckCircle2, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';

const ForgotPasswordPage = () => {
  const location = useLocation();
  // Pre-fill with email passed from login, if available
  const [email, setEmail] = useState(location.state?.email || '');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { requestPasswordReset } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    
    // Si email está vacío y estamos usando "por default", lo forzamos.
    // Aunque HTML required prevendrá el submit vacío en la mayoría de casos.
    const emailToUse = email.trim();
    if (!emailToUse) {
        setError('Por favor, ingresa tu correo institucional.');
        setLoading(false);
        return;
    }

    const result = await requestPasswordReset(emailToUse);
    setLoading(false);

    if (result.success) {
      setSuccess(result.message || 'Código de recuperación enviado. Revisa tu correo institucional.');
      // Redirigir a la página de reset después de unos segundos
      setTimeout(() => {
        navigate('/reset-password', { state: { email: emailToUse } });
      }, 2000);
    } else {
      setError(result.error?.message || 'Error al solicitar recuperación. Verifica el correo.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF9F6] dark:bg-[#0B0F19] font-['Plus_Jakarta_Sans',sans-serif] p-4 sm:p-6 lg:p-8 select-none relative transition-colors duration-200">
      
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
      
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 15 }}
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden"
      >
        <div className="p-8 sm:p-10">
            {/* Header Logo */}
            <div className="flex justify-center items-center gap-2.5 mb-8">
                <img src="/logo.png" alt="Sylia AI Logo" className="h-8 w-auto object-contain" />
                <span className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Sylia AI</span>
            </div>

            <div className="text-center mb-8">
                <h2 className="text-2xl font-extrabold text-[#0B0F19] dark:text-white tracking-tight mb-2">
                    Recuperar Contraseña
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold leading-relaxed">
                    Ingresa tu correo institucional y te enviaremos un código para restablecer tu contraseña.
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

            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                    <label htmlFor="email" className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 tracking-tight">
                        Correo Institucional
                    </label>
                    <div className="relative">
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="usuario@unitru.edu.pe"
                            required
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 text-sm font-semibold placeholder-slate-400 dark:placeholder-slate-500 transition-all focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm"
                        />
                        <Mail className="absolute left-3.5 top-3 w-4.5 h-4.5 text-slate-400" />
                    </div>
                </div>

                <div className="pt-2">
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
                            <span>Enviar código</span>
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

export default ForgotPasswordPage;
