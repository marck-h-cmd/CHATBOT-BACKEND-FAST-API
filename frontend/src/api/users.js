import apiClient from './client';

export const getUsers = async (params) => {
  const response = await apiClient.get('/users/', { params });
  return response.data;
};

export const updateUserStatus = async (userId, esActivo) => {
  const response = await apiClient.patch(`/users/${userId}/status`, { es_activo: esActivo });
  return response.data;
};

