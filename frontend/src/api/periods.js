import apiClient from './client';

// Listar todos los periodos académicos
export const getPeriods = async () => {
  const response = await apiClient.get('/periodos/');
  return response.data;
};

// Crear periodo (solo admin)
export const createPeriod = async (periodData) => {
  const response = await apiClient.post('/periodos/', periodData);
  return response.data;
};

// Actualizar periodo (solo admin)
export const updatePeriod = async (id_periodo, periodData) => {
  const response = await apiClient.put(`/periodos/${id_periodo}`, periodData);
  return response.data;
};
