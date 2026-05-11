import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { formatDateTime } from '../utils/formatters';

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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Mi Perfil</h1>

      {/* Datos personales */}
      <Card title="Información personal" className="mb-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Código universitario</p>
            <p className="font-medium">{user?.codigo_universitario}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Correo electrónico</p>
            <p className="font-medium">{user?.email}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Nombres</p>
            <p className="font-medium">{user?.nombres}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Apellidos</p>
            <p className="font-medium">{user?.apellidos}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Rol</p>
            <p className="font-medium capitalize">{user?.rol}</p>
          </div>
        </div>
      </Card>

      {/* Cambio de contraseña */}
      <Card title="Cambiar contraseña" className="mb-6">
        <form onSubmit={handleChangePassword}>
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
            className="mt-4"
          />
          <Input
            label="Confirmar nueva contraseña"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="mt-4"
          />
          {passwordError && <p className="text-red-600 text-sm mt-2">{passwordError}</p>}
          {passwordSuccess && <p className="text-green-600 text-sm mt-2">{passwordSuccess}</p>}
          <Button type="submit" loading={loading} className="mt-4">
            Actualizar contraseña
          </Button>
        </form>
      </Card>

      {/* Sesiones activas */}
      <Card title="Sesiones activas">
        {sessions.length === 0 ? (
          <p className="text-gray-500">No hay otras sesiones activas.</p>
        ) : (
          <>
            <ul className="divide-y divide-gray-200">
              {sessions.map(session => (
                <li key={session.token} className="py-2 flex justify-between items-center">
                  <div>
                    <p className="text-sm">
                      <span className="font-medium">{session.user_agent || 'Dispositivo desconocido'}</span>
                      <br />
                      <span className="text-xs text-gray-500">IP: {session.ip_address || 'No disponible'}</span>
                      <br />
                      <span className="text-xs text-gray-500">Último acceso: {formatDateTime(session.ultimo_activo)}</span>
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${session.es_activa ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                    {session.es_activa ? 'Activa' : 'Cerrada'}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-4">
              <Button variant="danger" size="sm" onClick={closeAllSessions}>
                Cerrar todas las sesiones (excepto esta)
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default ProfilePage;