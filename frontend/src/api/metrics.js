import apiClient from './client';

// Métricas ITIL Dashboard
export const getDashboardSummary = async () => {
  const response = await apiClient.get('/metrics/dashboard');
  return response.data;
};

// Alias para compatibilidad
export const getDashboardMetrics = async () => {
  const response = await apiClient.get('/metrics/dashboard');
  return response.data;
};

export const getTicketMetrics = async () => {
  const response = await apiClient.get('/metrics/tickets');
  return response.data;
};

export const getRiskMetrics = async () => {
  const response = await apiClient.get('/metrics/riesgo');
  return response.data;
};

export const getImprovementMetrics = async () => {
  const response = await apiClient.get('/metrics/mejora-continua');
  return response.data;
};

export const getKnowledgeMetrics = async () => {
  const response = await apiClient.get('/metrics/conocimiento');
  return response.data;
};

// Legacy endpoint (mantener por compatibilidad)
export const getServiceDeskMetrics = async () => {
  const response = await apiClient.get('/metrics/service-desk');
  return response.data;
};

export const getMetricsHealth = async () => {
  const response = await apiClient.get('/metrics/health');
  return response.data;
};