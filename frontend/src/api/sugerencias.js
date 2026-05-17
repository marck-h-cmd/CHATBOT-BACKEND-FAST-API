import apiClient from './client';

export const getSugerencias = async () => {
  const response = await apiClient.get('/sugerencias');
  return response.data;
};

export const updateSugerenciaEstado = async (id, estado, dias_antes = 1) => {
  const response = await apiClient.put(`/sugerencias/${id}/estado?estado=${estado}&dias_antes=${dias_antes}`);
  return response.data;
};
