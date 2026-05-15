import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as metricsAPI from '../../api/metrics';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { Users, GraduationCap, FileSearch, MessageSquare, Search, BookMarked, Calendar, BarChart3, Clock, AlertTriangle, ShieldAlert } from 'lucide-react';

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

  const StatCard = ({ title, value, icon: Icon, colorClass, bgClass }) => (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between group hover:border-indigo-200 transition-colors">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-xl ${bgClass} ${colorClass}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      <div>
        <p className="text-3xl font-bold text-slate-800 mb-1 tracking-tight">
          {value || 0}
        </p>
        <p className="text-sm font-medium text-slate-500">{title}</p>
      </div>
    </div>
  );

  const QuickAction = ({ to, icon: Icon, label }) => (
    <Link to={to} className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col items-center justify-center gap-3 hover:bg-slate-50 hover:border-indigo-200 transition-all group">
      <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-indigo-50 transition-colors text-slate-500 group-hover:text-indigo-600">
        <Icon className="w-6 h-6" />
      </div>
      <span className="text-sm font-semibold text-slate-700">{label}</span>
    </Link>
  );

  const StatusRow = ({ label, value, highlight = false, alert = false }) => (
    <div className="flex justify-between items-center py-3 border-b border-slate-100 last:border-0">
      <span className="text-sm font-medium text-slate-600">{label}</span>
      <span className={`text-sm font-bold ${
        alert ? 'text-red-600' : highlight ? 'text-indigo-600' : 'text-slate-800'
      }`}>
        {value}
      </span>
    </div>
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Resumen Operativo</h1>
        <p className="text-slate-500 mt-1">Visión general del sistema RAG y operaciones académicas.</p>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        <StatCard 
          title="Estudiantes Activos" 
          value={dashboardData?.total_estudiantes} 
          icon={Users} 
          colorClass="text-blue-600" 
          bgClass="bg-blue-50" 
        />
        <StatCard 
          title="Inscripciones" 
          value={dashboardData?.total_inscripciones} 
          icon={GraduationCap} 
          colorClass="text-emerald-600" 
          bgClass="bg-emerald-50" 
        />
        <StatCard 
          title="Sílabos en Revisión" 
          value={dashboardData?.silabos_pendientes} 
          icon={FileSearch} 
          colorClass="text-amber-600" 
          bgClass="bg-amber-50" 
        />
        <StatCard 
          title="Consultas a Sylia" 
          value={dashboardData?.total_consultas} 
          icon={MessageSquare} 
          colorClass="text-indigo-600" 
          bgClass="bg-indigo-50" 
        />
      </div>

      {/* Acciones rápidas */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Acciones Rápidas</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickAction to="/admin/silabos/pendientes" icon={Search} label="Validar Sílabos" />
          <QuickAction to="/admin/cursos" icon={BookMarked} label="Gestionar Cursos" />
          <QuickAction to="/admin/periodos" icon={Calendar} label="Gestionar Periodos" />
          <QuickAction to="/admin/metricas" icon={BarChart3} label="Ver Métricas" />
        </div>
      </div>

      {/* Estado del sistema */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <ShieldAlert className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-800">Estado del Service Desk</h2>
          </div>
          <div className="space-y-1">
            <StatusRow label="Solicitudes Abiertas" value={dashboardData?.solicitudes_abiertas || 0} highlight />
            <StatusRow label="Solicitudes Resueltas" value={dashboardData?.solicitudes_resueltas || 0} />
            <StatusRow label="Incidentes Activos" value={dashboardData?.incidentes_activos || 0} alert={(dashboardData?.incidentes_activos || 0) > 0} />
            <StatusRow label="Tiempo Prom. Respuesta" value={`${dashboardData?.tiempo_promedio_respuesta || 0} ms`} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <BookMarked className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-800">Salud Académica</h2>
          </div>
          <div className="space-y-1">
            <StatusRow label="Sílabos Validados (Automáticos/Manual)" value={dashboardData?.silabos_validados || 0} highlight />
            <StatusRow label="Sílabos Rechazados" value={dashboardData?.silabos_rechazados || 0} alert={(dashboardData?.silabos_rechazados || 0) > 0} />
            <StatusRow label="Alertas de Riesgo ITIL" value={dashboardData?.alertas_riesgo || 0} alert={(dashboardData?.alertas_riesgo || 0) > 0} />
            <StatusRow label="Estudiantes en Riesgo" value={dashboardData?.estudiantes_riesgo || 0} alert={(dashboardData?.estudiantes_riesgo || 0) > 0} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSummaryPage;
