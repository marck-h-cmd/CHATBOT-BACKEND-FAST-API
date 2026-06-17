import apiClient from './client';

export const getUsers = async (params) => {
  const response = await apiClient.get('/users/', { params });
  return response.data;
};
