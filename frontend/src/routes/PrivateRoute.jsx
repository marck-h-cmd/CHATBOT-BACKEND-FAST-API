import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const PrivateRoute = ({ children, requiredRole = null, requiredRoles = [] }) => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Convertir requiredRole singular a array para consistencia
  const rolesRequired = requiredRoles.length > 0 ? requiredRoles : (requiredRole ? [requiredRole] : []);

  // Si se especificó role(s) requerido(s), validar
  if (rolesRequired.length > 0) {
    const hasRequiredRole = rolesRequired.includes(user?.rol?.toLowerCase());
    if (!hasRequiredRole) {
      // Redirigir según el rol del usuario
      if (user?.rol?.toLowerCase() === 'admin') {
        return <Navigate to="/admin" replace />;
      }
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
};

export default PrivateRoute;