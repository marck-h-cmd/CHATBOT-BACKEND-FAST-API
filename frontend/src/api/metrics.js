import apiClient from './client';

export const getServiceDeskMetrics = async () => {
  const response = await apiClient.get('/metrics/service-desk');
  return response.data;
};

export const getMetricsHealth = async () => {
  const response = await apiClient.get('/metrics/health');
  return response.data;
};