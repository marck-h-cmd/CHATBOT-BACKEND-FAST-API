import React, { createContext, useState, useContext, useEffect } from 'react';
import * as serviceDeskAPI from '../api/service-desk';
import * as metricsAPI from '../api/metrics';
import { handleApiError } from '../utils/errorHandler';
import { useAuth } from './AuthContext';

const ServiceDeskContext = createContext();

export const useServiceDesk = () => {
  const context = useContext(ServiceDeskContext);
  if (!context) {
    throw new Error('useServiceDesk must be used within a ServiceDeskProvider');
  }
  return context;
};

export const ServiceDeskProvider = ({ children }) => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [escalations, setEscalations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Cargar datos de Service Desk al iniciar
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [requestsData, incidentsData] = await Promise.all([
        serviceDeskAPI.getServiceRequests(),
        serviceDeskAPI.getIncidents()
      ]);
      setRequests(requestsData);
      setIncidents(incidentsData);
      
      // Solo cargar métricas si es admin
      if (user?.rol === 'admin') {
        const metricsData = await metricsAPI.getDashboardSummary();
        setMetrics(metricsData);
        setEscalations(metricsData?.incidentes_escalados || []);
      }
      
      setError('');
    } catch (err) {
      const errorInfo = handleApiError(err);
      setError(errorInfo.message);
    } finally {
      setLoading(false);
    }
  };

  const createRequest = async (requestData) => {
    try {
      const result = await serviceDeskAPI.createServiceRequest(requestData);
      const requestsData = await serviceDeskAPI.getServiceRequests();
      setRequests(requestsData);
      return { success: true, data: result };
    } catch (err) {
      const errorInfo = handleApiError(err);
      return { success: false, error: errorInfo };
    }
  };

  const updateRequest = async (id_solicitud, requestData) => {
    try {
      const result = await serviceDeskAPI.updateServiceRequest(id_solicitud, requestData);
      const requestsData = await serviceDeskAPI.getServiceRequests();
      setRequests(requestsData);
      return { success: true, data: result };
    } catch (err) {
      const errorInfo = handleApiError(err);
      return { success: false, error: errorInfo };
    }
  };

  const deleteRequest = async (id_solicitud) => {
    try {
      await serviceDeskAPI.deleteServiceRequest(id_solicitud);
      const requestsData = await serviceDeskAPI.getServiceRequests();
      setRequests(requestsData);
      return { success: true };
    } catch (err) {
      const errorInfo = handleApiError(err);
      return { success: false, error: errorInfo };
    }
  };

  const createIncident = async (incidentData) => {
    try {
      const result = await serviceDeskAPI.createIncident(incidentData);
      const incidentsData = await serviceDeskAPI.getIncidents();
      setIncidents(incidentsData);
      return { success: true, data: result };
    } catch (err) {
      const errorInfo = handleApiError(err);
      return { success: false, error: errorInfo };
    }
  };

  const updateIncident = async (id_incidente, incidentData) => {
    try {
      const result = await serviceDeskAPI.updateIncident(id_incidente, incidentData);
      const incidentsData = await serviceDeskAPI.getIncidents();
      setIncidents(incidentsData);
      return { success: true, data: result };
    } catch (err) {
      const errorInfo = handleApiError(err);
      return { success: false, error: errorInfo };
    }
  };

  const deleteIncident = async (id_incidente) => {
    try {
      await serviceDeskAPI.deleteIncident(id_incidente);
      const incidentsData = await serviceDeskAPI.getIncidents();
      setIncidents(incidentsData);
      return { success: true };
    } catch (err) {
      const errorInfo = handleApiError(err);
      return { success: false, error: errorInfo };
    }
  };

  const value = {
    requests,
    incidents,
    metrics,
    escalations,
    loading,
    error,
    createRequest,
    updateRequest,
    deleteRequest,
    createIncident,
    updateIncident,
    deleteIncident,
    refreshData: loadData
  };

  return <ServiceDeskContext.Provider value={value}>{children}</ServiceDeskContext.Provider>;
};
