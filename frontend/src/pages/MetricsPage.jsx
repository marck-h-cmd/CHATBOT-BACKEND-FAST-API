import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getServiceDeskMetrics } from '../api/metrics';
import KPICard from '../components/metrics/KPICard';
import IncidentList from '../components/metrics/IncidentList';
import EscalationAlert from '../components/metrics/EscalationAlert';
import Card from '../components/ui/Card';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { handleApiError } from '../utils/errorHandler';

const MetricsPage = () => {
  const { isAdmin } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const data = await getServiceDeskMetrics();
      setMetrics(data);
      setError('');
    } catch (err) {
      const errorInfo = handleApiError(err);
      setError(errorInfo.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadMetrics();
    }
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Card>
          <p className="text-red-600">Acceso denegado. Solo administradores pueden ver métricas.</p>
        </Card>
      </div>
    );
  }

  if (loading) return <LoadingSpinner fullScreen />;
  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Card>
          <p className="text-red-600">Error al cargar métricas: {error}</p>
          <button onClick={loadMetrics} className="mt-2 text-blue-600">Reintentar</button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Métricas Service Desk ITIL</h1>

      {/* Alertas de escalamiento */}
      {metrics?.escalados_nivel2 > 0 && (
        <EscalationAlert
          escalations={metrics.incidentes_escalados || []}
          onViewDetails={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
        />
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <KPICard title="Solicitudes totales" value={metrics.total_solicitudes} icon="📋" color="blue" />
        <KPICard title="Incidentes totales" value={metrics.total_incidentes} icon="⚠️" color="yellow" />
        <KPICard title="Incidentes activos" value={metrics.incidentes_activos} icon="🔥" color="red" />
        <KPICard title="Escalados Nivel 2" value={metrics.escalados_nivel2} icon="📢" color="orange" />
        <KPICard 
          title="Tasa resolución N1" 
          value={`${metrics.tasa_resolucion_nivel1 || 0}%`} 
          icon="✅" 
          color="green"
          subtitle="Resueltas por Sylia"
        />
      </div>

      {/* Fallos de ingestión adicional */}
      {metrics.fallos_ingestion > 0 && (
        <Card className="mb-6">
          <div className="flex items-center gap-2 text-yellow-700">
            <span>⚠️</span>
            <span>Fallos de ingestión de sílabos: {metrics.fallos_ingestion}. Revisar logs.</span>
          </div>
        </Card>
      )}

      {/* Lista de incidentes */}
      {metrics.incidentes_recientes && (
        <IncidentList
          incidents={metrics.incidentes_recientes}
          onRefresh={loadMetrics}
          loading={loading}
        />
      )}
    </div>
  );
};

export default MetricsPage;