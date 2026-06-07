import apiClient from './client';

export const getSugerencias = async () => {
  const response = await apiClient.get('/sugerencias');
  return response.data;
};

export const updateSugerenciaEstado = async (id, estado, fecha_programada = null) => {
  let url = `/sugerencias/${id}/estado?estado=${estado}`;
  if (fecha_programada) {
    url += `&fecha_programada=${encodeURIComponent(fecha_programada)}`;
  }
  const response = await apiClient.put(url);
  return response.data;
};
