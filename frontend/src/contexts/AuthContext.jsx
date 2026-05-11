import React, { createContext, useState, useEffect, useContext } from 'react';
import * as authAPI from '../api/auth';
import * as storage from '../utils/localstorage';
import { handleApiError } from '../utils/errorHandler';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);

  // Cargar usuario al iniciar si hay token
  useEffect(() => {
    const loadUser = async () => {
      const token = storage.getAccessToken();
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const userData = await authAPI.getCurrentUser();
        setUser(userData);
        storage.saveUser(userData);
      } catch (error) {
        console.error('Error al cargar usuario:', error);
        storage.clearAll();
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  const login = async (email, password) => {
    try {
      const data = await authAPI.login(email, password);
      // Los tokens ya se guardaron en api/auth.js
      const userData = await authAPI.getCurrentUser();
      setUser(userData);
      storage.saveUser(userData);
      return { success: true };
    } catch (error) {
      const errorInfo = handleApiError(error);
      return { success: false, error: errorInfo };
    }
  };

  const register = async (userData) => {
    try {
      await authAPI.register(userData);
      return { success: true };
    } catch (error) {
      const errorInfo = handleApiError(error);
      return { success: false, error: errorInfo };
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Error en logout:', error);
    } finally {
      setUser(null);
      storage.clearAll();
    }
  };

  const loadSessions = async () => {
    try {
      const data = await authAPI.getUserSessions();
      setSessions(data.sessions || []);
    } catch (error) {
      console.error('Error al cargar sesiones:', error);
    }
  };

  const closeAllSessions = async () => {
    try {
      await authAPI.closeAllSessions();
      await loadSessions();
    } catch (error) {
      console.error('Error al cerrar sesiones:', error);
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      await authAPI.changePassword(currentPassword, newPassword);
      return { success: true };
    } catch (error) {
      const errorInfo = handleApiError(error);
      return { success: false, error: errorInfo };
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    sessions,
    loadSessions,
    closeAllSessions,
    changePassword,
    isAuthenticated: !!user,
    isAdmin: user?.rol === 'admin',
    isDocente: user?.rol === 'docente',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};