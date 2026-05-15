import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { formatDateTime } from '../utils/formatters';
import { User, Mail, Shield, Smartphone, Laptop, Lock, LogOut, CheckCircle2, AlertCircle } from 'lucide-react';

const ProfilePage = () => {
  const { user, loadSessions, sessions, closeAllSessions, changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    if (newPassword !== confirmPassword) {
      setPasswordError('Las nuevas contraseñas no coinciden');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setLoading(true);
    const result = await changePassword(currentPassword, newPassword);
    setLoading(false);
    if (result.success) {
      setPasswordSuccess('Contraseña actualizada correctamente');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setPasswordError(result.error?.message || 'Error al cambiar contraseña');
    }
  };

  const getDeviceIcon = (userAgent) => {
    const ua = userAgent?.toLowerCase() || '';
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) return <Smartphone className="w-5 h-5" />;
    return <Laptop className="w-5 h-5" />;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Configuración de Perfil</h1>
        <p className="text-slate-500 mt-2">Gestiona tu información personal, seguridad y sesiones activas.</p>
      </div>

      <div className="space-y-8">
        
        {/* Información Personal */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col md:flex-row">
          <div className="p-8 md:w-1/3 bg-slate-50 border-r border-slate-100 flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-3xl font-bold text-indigo-600">
                {user?.nombres?.charAt(0) || 'U'}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-800">{user?.nombres}</h2>
            <p className="text-sm text-slate-500 font-medium">{user?.apellidos}</p>
            <span className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-slate-200 text-slate-700 rounded-full text-xs font-semibold capitalize">
              <Shield className="w-3.5 h-3.5" /> Rol: {user?.rol}
            </span>
          </div>
          
          <div className="p-8 md:w-2/3">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-100 pb-4">
              <User className="w-5 h-5 text-indigo-600" /> Datos de la Cuenta
            </h3>
            
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
              <div>
                <dt className="text-sm font-medium text-slate-500 mb-1 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-slate-400" /> Código Universitario
                </dt>
                <dd className="font-semibold text-slate-800 font-mono bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                  {user?.codigo_universitario}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500 mb-1 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-400" /> Correo Electrónico
                </dt>
                <dd className="font-semibold text-slate-800 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 truncate">
                  {user?.email}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Seguridad */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 md:p-8">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-100 pb-4">
              <Lock className="w-5 h-5 text-indigo-600" /> Seguridad
            </h3>

            <div className="max-w-md">
              <form onSubmit={handleChangePassword} className="space-y-4">
                <Input
                  label="Contraseña actual"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
                <Input
                  label="Nueva contraseña"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <Input
                  label="Confirmar nueva contraseña"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                
                {passwordError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm font-medium text-red-700 flex gap-2 items-center">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {passwordError}
                  </div>
                )}
                {passwordSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-medium text-emerald-700 flex gap-2 items-center">
                    <CheckCircle2 className="w-4 h-4 shrink-0" /> {passwordSuccess}
                  </div>
                )}

                <div className="pt-2">
                  <Button type="submit" loading={loading} className="w-full sm:w-auto px-8">
                    Actualizar Contraseña
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Sesiones */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 md:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 border-b border-slate-100 pb-4 gap-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-indigo-600" /> Sesiones Activas
              </h3>
              {sessions.length > 1 && (
                <Button variant="outline" size="sm" onClick={closeAllSessions} className="text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200">
                  <LogOut className="w-4 h-4 mr-2" /> Cerrar demás sesiones
                </Button>
              )}
            </div>

            {sessions.length === 0 ? (
              <p className="text-slate-500 py-4">No hay información de sesiones.</p>
            ) : (
              <div className="space-y-4">
                {sessions.map(session => (
                  <div key={session.token} className="flex items-start gap-4 p-4 border border-slate-100 rounded-xl bg-slate-50">
                    <div className="p-2 bg-white rounded-lg border border-slate-200 text-slate-500 shrink-0 mt-0.5">
                      {getDeviceIcon(session.user_agent)}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <p className="font-semibold text-slate-800 leading-tight">
                          {session.user_agent || 'Dispositivo desconocido'}
                        </p>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-md shrink-0 ml-2 ${
                          session.es_activa 
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                            : 'bg-slate-200 text-slate-600'
                        }`}>
                          {session.es_activa ? 'Sesión Actual' : 'Inactiva'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 mt-1">
                        IP: <span className="font-mono bg-white px-1 py-0.5 rounded border border-slate-200">{session.ip_address || 'Desconocida'}</span>
                      </p>
                      <p className="text-xs text-slate-400 mt-1.5 font-medium">
                        Último acceso: {formatDateTime(session.ultimo_activo)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

// SVG Fallback for BookOpen to avoid missing import
const BookOpen = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
);

export default ProfilePage;