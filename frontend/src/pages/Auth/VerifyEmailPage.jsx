import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Mail, ArrowLeft, ShieldCheck, AlertCircle, RefreshCw, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const VerifyEmailPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { verifyOTP, resendOTP } = useAuth();

  const { email, nombres, message } = location.state || {};

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState(message || '');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const inputRefs = useRef([]);

  useEffect(() => {
    if (!email) {
      navigate('/register');
      return;
    }
    // Auto-focus first input
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [email, navigate]);

  useEffect(() => {
    if (countdown > 0 && !canResend) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
    if (countdown === 0) {
      setCanResend(true);
    }
  }, [countdown, canResend]);

  const handleChange = (index, value) => {
    // Only allow digits
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setError('');

    // Auto-advance to next input
    if (value && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1].focus();
    }

    // Auto-submit when all digits are filled
    if (index === 5 && value) {
      const code = [...newOtp.slice(0, 5), value.slice(-1)].join('');
      if (code.length === 6) {
        handleSubmit(code);
      }
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const newOtp = [...otp];
    for (let i = 0; i < pasted.length; i++) {
      if (i < 6) newOtp[i] = pasted[i];
    }
    setOtp(newOtp);
    setError('');

    // Focus next empty or last
    const nextIndex = Math.min(pasted.length, 5);
    if (inputRefs.current[nextIndex]) {
      inputRefs.current[nextIndex].focus();
    }

    if (pasted.length === 6) {
      handleSubmit(pasted);
    }
  };

  const handleSubmit = async (code) => {
    const otpCode = code || otp.join('');
    if (otpCode.length !== 6) {
      setError('Ingresa los 6 dígitos del código de verificación.');
      return;
    }

    setLoading(true);
    setError('');
    const result = await verifyOTP(email, otpCode);
    setLoading(false);

    if (result.success) {
      const role = result.user?.rol || '';
      if (role === 'admin') navigate('/admin');
      else navigate('/dashboard');
    } else {
      setError(result.error?.message || 'Código incorrecto. Intenta de nuevo.');
      // Clear inputs on error for retry
      setOtp(['', '', '', '', '', '']);
      if (inputRefs.current[0]) inputRefs.current[0].focus();
    }
  };

  const handleResend = async () => {
    if (!canResend || resendLoading) return;

    setResendLoading(true);
    setError('');
    const result = await resendOTP(email);
    setResendLoading(false);

    if (result.success) {
      setSuccessMessage('Se ha enviado un nuevo código de verificación a tu correo.');
      setCanResend(false);
      setCountdown(60);
      setOtp(['', '', '', '', '', '']);
      if (inputRefs.current[0]) inputRefs.current[0].focus();
    } else {
      setError(result.error?.message || 'No se pudo reenviar el código. Intenta más tarde.');
    }
  };

  return (
    <div className="min-h-screen lg:h-screen w-screen flex bg-[#FAF9F6] font-['Plus_Jakarta_Sans',sans-serif] lg:overflow-hidden select-none">

      {/* LEFT PANEL */}
      <div className="hidden lg:flex lg:w-[42%] bg-[#0B0F19] flex-col justify-between p-10 relative overflow-hidden border-r border-[#1E293B]">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="otp-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#otp-grid)" />
          </svg>
        </div>

        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-md">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">Sylia AI</span>
          </div>
        </div>

        <div className="relative z-10 my-auto space-y-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-2.5"
          >
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Verificación de Seguridad
            </span>
            <h1 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-[1.15]">
              Confirma tu <br />
              <span className="text-blue-500">identidad institucional</span>
            </h1>
            <p className="text-slate-400 text-sm max-w-sm leading-relaxed">
              Hemos enviado un código de verificación de 6 dígitos a tu correo oficial de la UNT. Este paso garantiza la seguridad de tu cuenta.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-3"
          >
            <div className="flex gap-3 p-3 rounded-xl bg-[#131A2C] border border-[#1E293B]">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                <Mail className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white">Correo verificado</h3>
                <p className="text-[10px] text-slate-400 leading-normal">
                  Solo usuarios con correos @unitru.edu.pe pueden acceder al sistema.
                </p>
              </div>
            </div>
            <div className="flex gap-3 p-3 rounded-xl bg-[#131A2C] border border-[#1E293B]">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white">Código de un solo uso</h3>
                <p className="text-[10px] text-slate-400 leading-normal">
                  El OTP expira en 10 minutos y es válido para una sola verificación.
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-[10px] text-slate-500 font-semibold"
        >
          UNT • Ingeniería de Sistemas &copy; {new Date().getFullYear()}
        </motion.div>
      </div>

      {/* RIGHT PANEL */}
      <div className="w-full lg:w-[58%] flex items-center justify-center p-6 sm:p-10 relative bg-white overflow-y-auto no-scrollbar">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 100, damping: 15 }}
          className="w-full max-w-sm space-y-6"
        >
          {/* Mobile header */}
          <div className="lg:hidden flex items-center justify-between mb-2">
            <Link to="/register" className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 shadow-sm hover:bg-slate-100 transition-colors">
              <ArrowLeft className="w-4.5 h-4.5" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-xs font-extrabold text-slate-900 tracking-tight">Sylia AI</span>
            </div>
          </div>

          {/* Form Header */}
          <div className="space-y-1.5 text-left">
            <h2 className="text-2xl lg:text-3xl font-extrabold text-[#0B0F19] tracking-tight">
              Verificar cuenta
            </h2>
            <p className="text-slate-500 text-xs font-semibold leading-relaxed">
              Ingresa el código de 6 dígitos enviado a <span className="text-slate-900 font-bold">{email}</span>
            </p>
          </div>

          {/* Success / Info message */}
          <AnimatePresence mode="wait">
            {successMessage && (
              <motion.div
                initial={{ opacity: 0, y: -6, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -6, height: 0 }}
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
                className="overflow-hidden"
              >
                <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200 flex items-start gap-2.5">
                  <Mail className="w-4.5 h-4.5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <h4 className="text-[10px] font-bold text-blue-950">Código enviado</h4>
                    <p className="text-[10px] text-blue-700 font-medium leading-relaxed">{successMessage}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error Alert */}
          <AnimatePresence mode="wait">
            {error && (
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
                    <h4 className="text-[10px] font-bold text-red-950">Error de verificación</h4>
                    <p className="text-[10px] text-red-700 font-medium leading-relaxed">{error}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* OTP Inputs */}
          <div className="space-y-4">
            <div className="flex justify-center gap-2 sm:gap-3">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={el => inputRefs.current[index] = el}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={index === 0 ? handlePaste : undefined}
                  disabled={loading}
                  className="w-12 h-14 sm:w-14 sm:h-16 text-center text-xl sm:text-2xl font-bold text-slate-900 bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                />
              ))}
            </div>

            {/* Submit Button */}
            <motion.button
              whileHover={{ scale: 1.012, backgroundColor: "#151C2F" }}
              whileTap={{ scale: 0.988 }}
              onClick={() => handleSubmit()}
              disabled={loading || otp.join('').length !== 6}
              className="relative w-full py-2.5 bg-[#0B0F19] text-white rounded-xl font-bold text-xs tracking-wide shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2 group disabled:opacity-75 disabled:cursor-not-allowed overflow-hidden"
            >
              {loading ? (
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <>
                  <span>Verificar código</span>
                  <CheckCircle className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-all duration-200" />
                </>
              )}
            </motion.button>

            {/* Resend Section */}
            <div className="text-center space-y-2">
              <p className="text-xs text-slate-500 font-medium">
                ¿No recibiste el código?{' '}
                <button
                  onClick={handleResend}
                  disabled={!canResend || resendLoading}
                  className={`font-bold transition-colors inline-flex items-center gap-1 ${
                    canResend && !resendLoading
                      ? 'text-blue-600 hover:text-blue-700 cursor-pointer'
                      : 'text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {resendLoading ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : canResend ? (
                    'Reenviar código'
                  ) : (
                    `Reenviar en ${countdown}s`
                  )}
                </button>
              </p>
              <p className="text-[10px] text-slate-400">
                Revisa tu bandeja de entrada y correo no deseado.
              </p>
            </div>
          </div>

          {/* Back to register */}
          <div className="text-center pt-2.5 border-t border-slate-100">
            <p className="text-xs text-slate-500 font-medium">
              ¿Usaste un correo incorrecto?{' '}
              <Link to="/register" className="font-bold text-blue-600 hover:text-blue-700 hover:underline transition-colors ml-0.5">
                Volver al registro
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
