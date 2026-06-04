import React, { useState, useEffect } from 'react';
import * as metricsAPI from '../../api/metrics';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { BarChart3, Users, MessageSquare, Ticket, AlertTriangle, Clock, TrendingUp, Smile } from 'lucide-react';

const MetricsPage = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const data = await metricsAPI.getDashboardMetrics();
      setMetrics(data);
    } catch (error) {
      console.error('Error al cargar métricas:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner fullScreen />;

  const MetricCard = ({ title, value, icon: Icon, colorClass, bgClass }) => (
    <div className="bg-white dark:bg-[#131A2C] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-card flex flex-col justify-between group hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors duration-200">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-xl ${bgClass} ${colorClass}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      <div>
        <p className="text-3xl font-bold text-slate-800 dark:text-white mb-1 tracking-tight">
          {value || 0}
        </p>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-indigo-650 dark:text-indigo-400" /> Analítica y Rendimiento RAG
        </h1>
        <p className="text-slate-505 dark:text-slate-400 mt-1">KPIs e indicadores de rendimiento de Sylia y el Service Desk.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        <MetricCard 
          title="Estudiantes Activos" 
          value={metrics?.total_estudiantes} 
          icon={Users} 
          colorClass="text-blue-600 dark:text-blue-400" 
          bgClass="bg-blue-50 dark:bg-blue-950/20" 
        />
        <MetricCard 
          title="Consultas a Sylia" 
          value={metrics?.total_consultas} 
          icon={MessageSquare} 
          colorClass="text-emerald-600 dark:text-emerald-400" 
          bgClass="bg-emerald-50 dark:bg-emerald-950/20" 
        />
        <MetricCard 
          title="Tickets de Soporte" 
          value={metrics?.solicitudes_abiertas} 
          icon={Ticket} 
          colorClass="text-indigo-600 dark:text-indigo-400" 
          bgClass="bg-indigo-50 dark:bg-indigo-950/20" 
        />
        <MetricCard 
          title="Alertas de Riesgo" 
          value={metrics?.incidentes_activos} 
          icon={AlertTriangle} 
          colorClass="text-red-600 dark:text-red-400" 
          bgClass="bg-red-50 dark:bg-red-950/20" 
        />
      </div>

      <div className="bg-white dark:bg-[#131A2C] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-card p-6 lg:p-8 transition-colors duration-200">
        <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
          <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Indicadores de Calidad de Servicio (SLA)
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex flex-col items-center text-center p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
            <Clock className="w-8 h-8 text-indigo-500 dark:text-indigo-400 mb-4" />
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Tiempo Promedio</p>
            <p className="text-4xl font-bold text-slate-800 dark:text-white tracking-tight">
              {metrics?.tiempo_promedio_respuesta || 0}<span className="text-lg text-slate-500 dark:text-slate-400 font-medium ml-1">ms</span>
            </p>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-2">Latencia de inferencia AI</p>
          </div>

          <div className="flex flex-col items-center text-center p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
            <Ticket className="w-8 h-8 text-amber-500 dark:text-amber-400 mb-4" />
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Tasa de Escalamiento</p>
            <p className="text-4xl font-bold text-amber-600 dark:text-amber-400 tracking-tight">
              {metrics?.tasa_escalamiento || 0}<span className="text-lg text-amber-500 dark:text-amber-405 font-medium ml-1">%</span>
            </p>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-2">Consultas transferidas a humanos</p>
          </div>

          <div className="flex flex-col items-center text-center p-6 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
            <Smile className="w-8 h-8 text-emerald-500 dark:text-emerald-400 mb-4" />
            <p className="text-xs font-bold text-emerald-600/70 dark:text-emerald-400 uppercase tracking-wider mb-2">CSAT Estimado</p>
            <p className="text-4xl font-bold text-emerald-700 dark:text-emerald-400 tracking-tight">
              {metrics?.satisfaccion || 0}<span className="text-lg text-emerald-500 dark:text-emerald-400 font-medium ml-1">%</span>
            </p>
            <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mt-2">Nivel de satisfacción de usuario</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetricsPage;
