import apiClient from './client';

export const register = async (userData) => {
  const response = await apiClient.post('/auth/registro', userData);
  return response.data;
};

export const login = async (email, password) => {
  const response = await apiClient.post('/auth/login', { email, password });
  if (response.data.access_token) {
    localStorage.setItem('access_token', response.data.access_token);
    localStorage.setItem('refresh_token', response.data.refresh_token);
  }
  return response.data;
};

export const logout = async () => {
  try {
    await apiClient.post('/auth/logout');
  } finally {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }
};

export const refreshToken = async (refreshToken) => {
  const response = await apiClient.post('/auth/refresh', { refresh_token: refreshToken });
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await apiClient.get('/auth/me');
  return response.data;
};

export const getUserSessions = async () => {
  const response = await apiClient.get('/auth/sesiones');
  return response.data;
};

export const closeAllSessions = async () => {
  const response = await apiClient.post('/auth/cerrar-todas-sesiones');
  return response.data;
};

export const changePassword = async (currentPassword, newPassword) => {
  const response = await apiClient.post('/auth/cambiar-password', {
    current_password: currentPassword,
    new_password: newPassword,
  });
  return response.data;
};