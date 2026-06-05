import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import * as metricsAPI from '../../api/metrics';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import {
  Users, GraduationCap, FileSearch, MessageSquare, Search,
  BookMarked, Calendar, BarChart3, Clock, AlertTriangle,
  ShieldAlert, Ticket, FileCheck, FileX, Activity,
  TrendingUp, TrendingDown, Minus, ArrowRight, Zap
} from 'lucide-react';

const COLORS = {
  primary: '#2563eb',
  success: '#16a34a',
  warning: '#d97706',
  danger: '#dc2626',
  info: '#0891b2',
  slate: '#64748b',
  purple: '#7c3aed',
};

const SEVERITY_COLORS = {
  ALTA: COLORS.danger,
  MEDIA: COLORS.warning,
  BAJA: COLORS.slate,
};

const PIE_COLORS = [COLORS.success, COLORS.warning, COLORS.danger, COLORS.slate];

const formatNumber = (num) => {
  if (num === null || num === undefined) return '0';
  return num.toLocaleString('es-PE');
};

const formatDate = () => {
  const now = new Date();
  return now.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const AdminSummaryPage = () => {
  const [data, setData] = useState({
    dashboard: null,
    tickets: null,
    risk: null,
    knowledge: null,
    improvement: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [dashboard, tickets, risk, knowledge, improvement] = await Promise.allSettled([
        metricsAPI.getDashboardMetrics(),
        metricsAPI.getTicketMetrics(),
        metricsAPI.getRiskMetrics(),
        metricsAPI.getKnowledgeMetrics(),
        metricsAPI.getImprovementMetrics(),
      ]);

      setData({
        dashboard: dashboard.status === 'fulfilled' ? dashboard.value : null,
        tickets: tickets.status === 'fulfilled' ? tickets.value : null,
        risk: risk.status === 'fulfilled' ? risk.value : null,
        knowledge: knowledge.status === 'fulfilled' ? knowledge.value : null,
        improvement: improvement.status === 'fulfilled' ? improvement.value : null,
      });
    } catch (error) {
      console.error('Error al cargar métricas:', error);
    } finally {
      setLoading(false);
    }
  };

  const d = data.dashboard || {};

  const severityData = useMemo(() => {
    if (!data.risk?.incidentes_por_severidad) return [];
    const sev = data.risk.incidentes_por_severidad;
    return [
      { name: 'Alta', value: sev.ALTA || 0, fill: COLORS.danger },
      { name: 'Media', value: sev.MEDIA || 0, fill: COLORS.warning },
      { name: 'Baja', value: sev.BAJA || 0, fill: COLORS.slate },
    ];
  }, [data.risk]);

  const silabosData = useMemo(() => {
    const k = data.knowledge || {};
    return [
      { name: 'Publicados', value: k.oficiales_publicados || 0 },
      { name: 'Subidos', value: k.subidos_usuarios || 0 },
      { name: 'Pendientes', value: k.compartibles_pendientes || 0 },
      { name: 'Rechazados', value: k.rechazados || 0 },
    ];
  }, [data.knowledge]);

  const topConsultas = useMemo(() => {
    return data.improvement?.top_consultas || [];
  }, [data.improvement]);

  const maxConsultas = useMemo(() => {
    if (!topConsultas.length) return 1;
    return Math.max(...topConsultas.map(c => c.count));
  }, [topConsultas]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner />
      </div>
    );
  }

  const StatCard = ({ title, value, icon: Icon, tone, trend, trendLabel }) => {
    const toneMap = {
      blue: { iconBg: 'bg-blue-50 dark:bg-blue-950/20', iconText: 'text-blue-600 dark:text-blue-400', border: 'border-blue-100 dark:border-blue-900/30' },
      emerald: { iconBg: 'bg-emerald-50 dark:bg-emerald-950/20', iconText: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-100 dark:border-emerald-900/30' },
      amber: { iconBg: 'bg-amber-50 dark:bg-amber-950/20', iconText: 'text-amber-600 dark:text-amber-400', border: 'border-amber-100 dark:border-amber-900/30' },
      rose: { iconBg: 'bg-rose-50 dark:bg-rose-950/20', iconText: 'text-rose-600 dark:text-rose-400', border: 'border-rose-100 dark:border-rose-900/30' },
      slate: { iconBg: 'bg-slate-100 dark:bg-slate-800', iconText: 'text-slate-600 dark:text-slate-400', border: 'border-slate-200 dark:border-slate-700' },
      purple: { iconBg: 'bg-violet-50 dark:bg-violet-950/20', iconText: 'text-violet-600 dark:text-violet-400', border: 'border-violet-100 dark:border-violet-900/30' },
    };
    const t = toneMap[tone] || toneMap.slate;
    const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
    const trendColor = trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-rose-600' : 'text-slate-500';

    return (
      <div className={`bg-white dark:bg-[#131A2C] border ${t.border} rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-shadow duration-200`}>
        <div className="flex items-start justify-between mb-4">
          <div className={`w-11 h-11 rounded-xl ${t.iconBg} flex items-center justify-center shrink-0`}>
            <Icon className={`w-5 h-5 ${t.iconText}`} />
          </div>
          {trend && (
            <div className={`flex items-center gap-1 text-xs font-semibold ${trendColor} bg-white dark:bg-slate-900 px-2 py-1 rounded-lg border border-slate-100 dark:border-slate-850`}>
              <TrendIcon className="w-3.5 h-3.5" />
              {trendLabel}
            </div>
          )}
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{formatNumber(value)}</p>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wide">{title}</p>
        </div>
      </div>
    );
  };

  const SectionHeader = ({ icon: Icon, title, action, actionLabel, actionTo }) => (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <Icon className="w-5 h-5 text-slate-700 dark:text-slate-300" />
        <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">{title}</h2>
      </div>
      {action && (
        <Link to={actionTo} className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 transition-colors">
          {actionLabel} <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  );

  const ProgressBar = ({ value, max, color = COLORS.primary }) => {
    const pct = max > 0 ? (value / max) * 100 : 0;
    return (
      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{formatDate()}</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Resumen Operativo</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
            Visión integral del sistema RAG, operaciones ITIL y salud académica en tiempo real.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-card">
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          <span>Actualizado: {new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Estudiantes Activos"
          value={d.total_estudiantes}
          icon={Users}
          tone="blue"
          trend="up"
          trendLabel="+12%"
        />
        <StatCard
          title="Inscripciones"
          value={d.total_inscripciones}
          icon={GraduationCap}
          tone="emerald"
          trend="up"
          trendLabel="+5%"
        />
        <StatCard
          title="Consultas Sylia"
          value={d.total_consultas}
          icon={MessageSquare}
          tone="purple"
          trend="up"
          trendLabel="+8%"
        />
        <StatCard
          title="Incidentes Activos"
          value={d.incidentes_activos}
          icon={AlertTriangle}
          tone={d.incidentes_activos > 0 ? 'rose' : 'slate'}
          trend={d.incidentes_activos > 0 ? 'down' : undefined}
          trendLabel={d.incidentes_activos > 0 ? 'Atención' : 'Estable'}
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Sílabos Validados', value: d.silabos_validados, icon: FileCheck, tone: 'success' },
          { label: 'Sílabos Pendientes', value: d.silabos_pendientes, icon: FileSearch, tone: 'warning' },
          { label: 'Sílabos Rechazados', value: d.silabos_rechazados, icon: FileX, tone: 'danger' },
          { label: 'Tickets Abiertos', value: d.solicitudes_abiertas, icon: Ticket, tone: 'info' },
          { label: 'Tickets Resueltos', value: d.solicitudes_resueltas, icon: ShieldAlert, tone: 'success' },
          { label: 'Tasa Resolución', value: `${d.tasa_resolucion_sin_escalar || 0}%`, icon: Activity, tone: 'emerald' },
        ].map((item) => (
          <div key={item.label} className="bg-white dark:bg-[#131A2C] border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-card transition-colors duration-200">
            <div className="flex items-center gap-2 mb-2">
              <item.icon className="w-4 h-4 text-slate-400" />
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">{item.label}</span>
            </div>
            <p className="text-lg font-bold text-slate-900 dark:text-white">{formatNumber(item.value)}</p>
          </div>
        ))}
      </div>

      {/* Main Charts Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Incidentes por Severidad */}
        <div className="bg-white dark:bg-[#131A2C] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-card transition-colors duration-200">
          <SectionHeader icon={AlertTriangle} title="Incidentes por Severidad" />
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={severityData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--chart-text)', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--chart-text)', fontWeight: 600 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--chart-tooltip-bg)', borderRadius: '12px', border: '1px solid var(--chart-tooltip-border)', color: 'var(--chart-text)', fontSize: '12px', fontWeight: 600, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }}
                  cursor={{ fill: 'var(--chart-grid)', opacity: 0.1 }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {severityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {data.risk && (
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="bg-rose-50 dark:bg-rose-950/20 rounded-lg p-2">
                <p className="text-lg font-bold text-rose-600 dark:text-rose-400">{data.risk.incidentes_por_severidad?.ALTA || 0}</p>
                <p className="text-[10px] font-semibold text-rose-700 dark:text-rose-300 uppercase tracking-wider">Alta</p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-2">
                <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{data.risk.incidentes_por_severidad?.MEDIA || 0}</p>
                <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wider">Media</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-2">
                <p className="text-lg font-bold text-slate-600 dark:text-slate-400">{data.risk.incidentes_por_severidad?.BAJA || 0}</p>
                <p className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Baja</p>
              </div>
            </div>
          )}
        </div>

        {/* Distribución Sílabos */}
        <div className="bg-white dark:bg-[#131A2C] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-card transition-colors duration-200">
          <SectionHeader icon={BookMarked} title="Distribución de Sílabos" />
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={silabosData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="none"
                >
                  {silabosData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: 'var(--chart-tooltip-bg)', borderRadius: '12px', border: '1px solid var(--chart-tooltip-border)', color: 'var(--chart-text)', fontSize: '12px', fontWeight: 600 }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  formatter={(value) => <span className="text-xs font-medium text-slate-605 dark:text-slate-400">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Total documentos: <span className="font-bold text-slate-800 dark:text-slate-200">
                {silabosData.reduce((a, b) => a + b.value, 0)}
              </span>
            </p>
          </div>
        </div>

        {/* Service Desk Status */}
        <div className="bg-white dark:bg-[#131A2C] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-card transition-colors duration-200">
          <SectionHeader icon={Ticket} title="Service Desk" action actionLabel="Ver tickets" actionTo="/admin/service-desk" />
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center">
                  <Ticket className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Tickets</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">{formatNumber(data.tickets?.total_tickets)}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/20 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white dark:bg-slate-900 border border-blue-100 dark:border-blue-900/30 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Backlog</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">{formatNumber(data.tickets?.backlog)}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-900/30 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Tiempo Medio Resolución</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">{Math.round(data.tickets?.tiempo_medio_resolucion_ms || 0)} ms</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white dark:bg-slate-900 border border-amber-100 dark:border-amber-900/30 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Tickets Vencidos</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">{formatNumber(data.tickets?.tickets_vencidos)}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-medium text-slate-500 dark:text-slate-405">Tasa de Resolución</span>
              <span className="font-bold text-slate-900 dark:text-white">{d.tasa_resolucion_sin_escalar || 0}%</span>
            </div>
            <ProgressBar value={d.tasa_resolucion_sin_escalar || 0} max={100} color={COLORS.success} />
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Consultas */}
        <div className="bg-white dark:bg-[#131A2C] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-card transition-colors duration-200">
          <SectionHeader icon={BarChart3} title="Top Consultas Frecuentes" />
          {topConsultas.length === 0 ? (
            <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">No hay datos de consultas disponibles</div>
          ) : (
            <div className="space-y-3">
              {topConsultas.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-500 w-5 text-center">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-slate-705 dark:text-slate-300 truncate">{item.categoria || 'Sin categoría'}</span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white ml-2">{item.count}</span>
                    </div>
                    <ProgressBar value={item.count} max={maxConsultas} color={COLORS.primary} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Salud Académica Detalle */}
        <div className="bg-white dark:bg-[#131A2C] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-card transition-colors duration-200">
          <SectionHeader icon={Activity} title="Salud Académica" action actionLabel="Ver incidentes" actionTo="/admin/incidentes" />
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Estudiantes en Riesgo</p>
                <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{formatNumber(d.estudiantes_riesgo)}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">PP proyectado &lt; 14</p>
              </div>
              <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Escalados a Tutoría</p>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{formatNumber(data.risk?.casos_escalados_tutoria)}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Requieren intervención</p>
              </div>
            </div>
            <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Satisfacción del Servicio</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{d.satisfaccion || 95}%</span>
              </div>
              <ProgressBar value={d.satisfaccion || 95} max={100} color={COLORS.primary} />
            </div>
            <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tiempo Promedio de Respuesta</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{d.tiempo_promedio_respuesta || 0} ms</span>
              </div>
              <ProgressBar value={Math.min(d.tiempo_promedio_respuesta || 0, 2000)} max={2000} color={COLORS.info} />
            </div>
            {data.improvement?.cursos_sin_silabo_oficial > 0 && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xl flex items-center gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                    {data.improvement.cursos_sin_silabo_oficial} cursos sin sílabo oficial
                  </p>
                  <p className="text-[10px] text-amber-600 dark:text-amber-550 mt-0.5">Revisar gestión de contenido</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-4">Acciones Rápidas</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { to: '/admin/silabos/pendientes', icon: Search, label: 'Validar Sílabos', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/30' },
            { to: '/admin/cursos', icon: BookMarked, label: 'Gestionar Cursos', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
            { to: '/admin/periodos', icon: Calendar, label: 'Gestionar Periodos', color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-950/30' },
            { to: '/admin/metricas', icon: BarChart3, label: 'Ver Métricas RAG', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30' },
          ].map((action) => (
            <Link
              key={action.to}
              to={action.to}
              className="bg-white dark:bg-[#131A2C] border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center gap-3 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-card-hover transition-all duration-200 group"
            >
              <div className={`w-10 h-10 rounded-lg ${action.bg} flex items-center justify-center shrink-0`}>
                <action.icon className={`w-5 h-5 ${action.color}`} />
              </div>
              <span className="text-sm font-semibold text-slate-755 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminSummaryPage;
