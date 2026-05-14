import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';

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
      setError(result.error?.message || 'Error al iniciar sesión');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="max-w-md w-full">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-gray-800">Chatbot Académico</h2>
          <p className="text-gray-600 mt-2">Inicia sesión con tu correo institucional</p>
        </div>
        <form onSubmit={handleSubmit}>
          <Input
            label="Correo electrónico"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="usuario@unitru.edu.pe"
            required
            error={error}
          />
          <Input
            label="Contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••"
            required
            className="mt-4"
          />
          {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
          <Button type="submit" loading={loading} className="w-full mt-6">
            Ingresar
          </Button>
        </form>
        <p className="text-center text-sm text-gray-600 mt-4">
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="text-blue-600 hover:text-blue-800">
            Regístrate aquí
          </Link>
        </p>
      </Card>
    </div>
  );
};

export default LoginPage;