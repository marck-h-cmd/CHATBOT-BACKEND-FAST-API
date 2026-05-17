import apiClient from './client';

// Solicitudes de Servicio
export const getServiceRequests = async () => {
  const response = await apiClient.get('/services/requests');
  return response.data;
};

export const getServiceRequest = async (id_solicitud) => {
  const response = await apiClient.get(`/services/requests/${id_solicitud}`);
  return response.data;
};

export const createServiceRequest = async (requestData) => {
  const response = await apiClient.post('/services/requests', requestData);
  return response.data;
};

export const updateServiceRequest = async (id_solicitud, requestData) => {
  const response = await apiClient.put(`/services/requests/${id_solicitud}`, requestData);
  return response.data;
};

export const deleteServiceRequest = async (id_solicitud) => {
  const response = await apiClient.delete(`/services/requests/${id_solicitud}`);
  return response.data;
};

// Incidentes Académicos
export const getIncidents = async () => {
  const response = await apiClient.get('/services/incidents');
  return response.data;
};

export const getIncident = async (id_incidente) => {
  const response = await apiClient.get(`/services/incidents/${id_incidente}`);
  return response.data;
};

export const createIncident = async (incidentData) => {
  const response = await apiClient.post('/services/incidents', incidentData);
  return response.data;
};

export const updateIncident = async (id_incidente, incidentData) => {
  const response = await apiClient.put(`/services/incidents/${id_incidente}`, incidentData);
  return response.data;
};

export const deleteIncident = async (id_incidente) => {
  const response = await apiClient.delete(`/services/incidents/${id_incidente}`);
  return response.data;
};

// Incidentes de Servicio (Admin)
export const getServiceIncidents = async () => {
  const response = await apiClient.get('/silabo/incidentes-servicio');
  return response.data;
};

export const resolveServiceIncident = async (id_incidente, formData) => {
  const response = await apiClient.post(`/silabo/incidentes-servicio/${id_incidente}/resolver`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};
