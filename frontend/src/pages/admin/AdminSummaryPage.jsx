import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as metricsAPI from '../../api/metrics';
import Card from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const AdminSummaryPage = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const data = await metricsAPI.getDashboardMetrics();
      setDashboardData(data);
    } catch (error) {
      console.error('Error al cargar métricas:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard ITIL - Resumen Operativo</h1>

      {/* KPIs principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-600">
              {dashboardData?.total_estudiantes || 0}
            </p>
            <p className="text-sm text-gray-500 mt-1">Estudiantes Activos</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600">
              {dashboardData?.total_inscripciones || 0}
            </p>
            <p className="text-sm text-gray-500 mt-1">Inscripciones</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-3xl font-bold text-yellow-600">
              {dashboardData?.silabos_pendientes || 0}
            </p>
            <p className="text-sm text-gray-500 mt-1">Sílabos Pendientes</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-3xl font-bold text-purple-600">
              {dashboardData?.total_consultas || 0}
            </p>
            <p className="text-sm text-gray-500 mt-1">Consultas Chat</p>
          </div>
        </Card>
      </div>

      {/* Acciones rápidas */}
      <Card title="Acciones Rápidas" className="mb-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link to="/admin/silabos/pendientes">
            <div className="p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-center">
              <span className="text-2xl">🔍</span>
              <p className="text-sm font-medium mt-2">Validar Sílabos</p>
            </div>
          </Link>
          <Link to="/admin/cursos">
            <div className="p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors text-center">
              <span className="text-2xl">📚</span>
              <p className="text-sm font-medium mt-2">Gestionar Cursos</p>
            </div>
          </Link>
          <Link to="/admin/periodos">
            <div className="p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors text-center">
              <span className="text-2xl">📅</span>
              <p className="text-sm font-medium mt-2">Gestionar Periodos</p>
            </div>
          </Link>
          <Link to="/metrics">
            <div className="p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors text-center">
              <span className="text-2xl">📊</span>
              <p className="text-sm font-medium mt-2">Ver Métricas</p>
            </div>
          </Link>
        </div>
      </Card>

      {/* Estado del sistema */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card title="Estado del Servicio Desk">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Solicitudes Abiertas</span>
              <span className="font-semibold text-blue-600">
                {dashboardData?.solicitudes_abiertas || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Solicitudes Resueltas</span>
              <span className="font-semibold text-green-600">
                {dashboardData?.solicitudes_resueltas || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Incidentes Activos</span>
              <span className="font-semibold text-yellow-600">
                {dashboardData?.incidentes_activos || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Tiempo Promedio Respuesta</span>
              <span className="font-semibold text-gray-600">
                {dashboardData?.tiempo_promedio_respuesta || 0}ms
              </span>
            </div>
          </div>
        </Card>

        <Card title="Estado Académico">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Sílabos Validados</span>
              <span className="font-semibold text-green-600">
                {dashboardData?.silabos_validados || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Sílabos Rechazados</span>
              <span className="font-semibold text-red-600">
                {dashboardData?.silabos_rechazados || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Alertas de Riesgo</span>
              <span className="font-semibold text-yellow-600">
                {dashboardData?.alertas_riesgo || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Estudiantes en Riesgo</span>
              <span className="font-semibold text-orange-600">
                {dashboardData?.estudiantes_riesgo || 0}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AdminSummaryPage;
