import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';
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
      setErrors({ general: result.error?.message || 'Error al registrar' });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="max-w-md w-full">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-gray-800">Registro</h2>
          <p className="text-gray-600 mt-2">Crea tu cuenta institucional</p>
        </div>
        <form onSubmit={handleSubmit}>
          <Input
            label="Código universitario"
            name="codigo_universitario"
            value={formData.codigo_universitario}
            onChange={handleChange}
            placeholder="12345678"
            required
            error={errors.codigo_universitario}
          />
          <Input
            label="Correo electrónico"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="usuario@unitru.edu.pe"
            required
            error={errors.email}
            className="mt-4"
          />
          <Input
            label="Nombres"
            name="nombres"
            value={formData.nombres}
            onChange={handleChange}
            placeholder="Juan Carlos"
            required
            error={errors.nombres}
            className="mt-4"
          />
          <Input
            label="Apellidos"
            name="apellidos"
            value={formData.apellidos}
            onChange={handleChange}
            placeholder="Pérez Gómez"
            required
            error={errors.apellidos}
            className="mt-4"
          />
          <Input
            label="Contraseña"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Mínimo 6 caracteres"
            required
            error={errors.password}
            className="mt-4"
          />
          <Input
            label="Confirmar contraseña"
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="Repite la contraseña"
            required
            error={errors.confirmPassword}
            className="mt-4"
          />
          {errors.general && <p className="text-red-600 text-sm mt-2">{errors.general}</p>}
          <Button type="submit" loading={loading} className="w-full mt-6">
            Registrarse
          </Button>
        </form>
        <p className="text-center text-sm text-gray-600 mt-4">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-blue-600 hover:text-blue-800">
            Inicia sesión
          </Link>
        </p>
      </Card>
    </div>
  );
};

export default RegisterPage;