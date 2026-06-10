import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { useCourse } from '../contexts/CourseContext';
import { useServiceDesk } from '../contexts/ServiceDeskContext';
import Button from '../components/ui/Button';
import { getMyActivity } from '../api/metrics';
import {
  MessageSquare, BookOpen, Clock, Settings, User as UserIcon,
  BarChart3, LayoutDashboard, AlertTriangle, BookMarked, Layers,
  ChevronRight, CheckCircle2, CircleDashed, ArrowRight,
  GraduationCap, FileText, Compass, TrendingUp, Activity,
  Zap, MoreHorizontal, Calendar
} from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] } })
};

const chartData = [
  { name: 'Lun', actividad: 4 }, { name: 'Mar', actividad: 7 }, { name: 'Mie', actividad: 5 },
  { name: 'Jue', actividad: 9 }, { name: 'Vie', actividad: 6 }, { name: 'Sab', actividad: 3 }, { name: 'Dom', actividad: 2 }
];

const gradeData = [
  { name: 'Parcial 1', nota: 14 }, { name: 'Parcial 2', nota: 16 }, { name: 'Pract', nota: 18 },
  { name: 'Final', nota: 15 }, { name: 'Extra', nota: 0 }
];

const DashboardPage = () => {
  const { user } = useAuth();
  const { enrollments, loading: coursesLoading } = useCourse();
  const { incidents } = useServiceDesk();
  const [recentIncidents, setRecentIncidents] = useState([]);
  const [activityData, setActivityData] = useState([
    { name: 'Lun', actividad: 0 }, { name: 'Mar', actividad: 0 }, { name: 'Mie', actividad: 0 },
    { name: 'Jue', actividad: 0 }, { name: 'Vie', actividad: 0 }, { name: 'Sab', actividad: 0 }, { name: 'Dom', actividad: 0 }
  ]);

  useEffect(() => {
    if (incidents && incidents.length > 0) {
      setRecentIncidents(incidents.slice(0, 3));
    }
  }, [incidents]);

  useEffect(() => {
    if (user && user.rol !== 'admin') {
      const fetchActivity = async () => {
        try {
          const data = await getMyActivity();
          if (data && Array.isArray(data)) {
            setActivityData(data);
          }
        } catch (error) {
          console.error('Error fetching weekly activity:', error);
        }
      };
      fetchActivity();
    }
  }, [user]);

  const stats = useMemo(() => {
    const completedCourses = enrollments.filter(e => 
      e.notas && 
      e.notas.pu1 !== null && e.notas.pu1 !== undefined && 
      e.notas.pu2 !== null && e.notas.pu2 !== undefined && 
      e.notas.pu3 !== null && e.notas.pu3 !== undefined
    );
    
    const sum = completedCourses.reduce((s, e) => s + (e.notas.nota_final || 0), 0);
    const promedioGeneral = completedCourses.length
      ? (sum / completedCourses.length).toFixed(1)
      : '—';

    return {
      total: enrollments.length,
      validados: enrollments.filter(e => e.silabo_validado).length,
      pendientes: enrollments.filter(e => !e.silabo_validado).length,
      alertas: recentIncidents.filter(i => i.estado !== 'RESUELTO').length,
      promedioGeneral
    };
  }, [enrollments, recentIncidents]);

  const QuickLink = ({ to, icon: Icon, title, description, tourId = null }) => (
    <Link to={to} className="group block h-full" data-tour={tourId || undefined}>
      <div className="h-full p-4 rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#131A2C] hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md transition-all duration-200 flex items-start gap-4">
        <div className="p-2.5 bg-slate-100 dark:bg-slate-800/50 rounded-xl group-hover:bg-slate-200 dark:group-hover:bg-slate-800 transition-colors shrink-0">
          <Icon className="w-5 h-5 text-slate-700 dark:text-slate-300" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-slate-700 dark:group-hover:text-slate-350 transition-colors flex items-center justify-between gap-2">
            <span className="truncate">{title}</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400 transition-colors shrink-0" />
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{description}</p>
        </div>
      </div>
    </Link>
  );

  const StatCard = ({ icon: Icon, value, label, tone }) => {
    const toneMap = {
      blue:   { bg: 'bg-blue-50 dark:bg-blue-950/20',   text: 'text-blue-700 dark:text-blue-400',   border: 'border-blue-100 dark:border-blue-900/30' },
      emerald:{ bg: 'bg-emerald-50 dark:bg-emerald-950/20',text: 'text-emerald-700 dark:text-emerald-400',border: 'border-emerald-100 dark:border-emerald-900/30' },
      amber:  { bg: 'bg-amber-50 dark:bg-amber-950/20',  text: 'text-amber-700 dark:text-amber-400',  border: 'border-amber-100 dark:border-amber-900/30' },
      rose:   { bg: 'bg-rose-50 dark:bg-rose-950/20',   text: 'text-rose-700 dark:text-rose-400',   border: 'border-rose-100 dark:border-rose-900/30' },
      slate:  { bg: 'bg-slate-100 dark:bg-slate-800/50', text: 'text-slate-700 dark:text-slate-300',  border: 'border-slate-200 dark:border-slate-700' }
    };
    const t = toneMap[tone] || toneMap.slate;
    return (
      <div className="p-5 bg-white dark:bg-[#131A2C] border border-slate-200 dark:border-slate-800/80 rounded-3xl shadow-sm flex items-center gap-4">
        <div className={`w-12 h-12 rounded-2xl ${t.bg} flex items-center justify-center shrink-0 border ${t.border}`}>
          <Icon className={`w-5 h-5 ${t.text}`} />
        </div>
        <div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">{value}</p>
          <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">{label}</p>
        </div>
      </div>
    );
  };

  // Vista Administrador
  if (user?.rol === 'admin') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight mb-8">Dashboard General</h1>
        </motion.div>

        <motion.div
          initial="hidden" animate="visible" variants={fadeUp} custom={1}
          className="mb-8 p-6 lg:p-8 bg-slate-900 dark:bg-slate-900/60 border dark:border-slate-800 rounded-3xl shadow-xl text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
        >
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-[10px] font-bold uppercase tracking-wider text-slate-300 border border-white/10 mb-3">
              <Zap className="w-3 h-3" /> Panel de Control
            </div>
            <h2 className="text-2xl font-bold">
              ¡Hola, {user?.nombres || 'Administrador'}!
            </h2>
            <p className="text-slate-400 dark:text-slate-300 mt-2 text-sm max-w-xl leading-relaxed">
              Gestiona los cursos, usuarios, periodos y monitorea las métricas del sistema RAG desde un solo lugar.
            </p>
          </div>
          <Link to="/admin/dashboard" className="shrink-0 w-full md:w-auto">
            <Button className="w-full md:w-auto bg-white text-slate-900 hover:bg-slate-100 font-bold shadow-sm">Panel Admin Avanzado</Button>
          </Link>
        </motion.div>

        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={2}>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-4 tracking-tight">Accesos de Administración</h3>
        </motion.div>
        <motion.div
          initial="hidden" animate="visible" variants={fadeUp} custom={3}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8"
        >
          <QuickLink to="/admin/dashboard" icon={LayoutDashboard} title="Panel ITIL" description="Vista general de servicios" />
          <QuickLink to="/admin/cursos" icon={BookMarked} title="Gestión de Cursos" description="Administrar catálogo" />
          <QuickLink to="/admin/periodos" icon={Clock} title="Periodos Académicos" description="Configurar semestres" />
          <QuickLink to="/admin/silabos/pendientes" icon={Layers} title="Sílabos Pendientes" description="Revisar extracciones" />
          <QuickLink to="/admin/service-desk" icon={MessageSquare} title="Service Desk" description="Tickets e incidentes" />
          <QuickLink to="/metrics" icon={BarChart3} title="Métricas del Sistema" description="Rendimiento del LLM" />
        </motion.div>
      </div>
    );
  }

  // Vista Estudiante
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
      {/* Header */}
      <motion.header initial="hidden" animate="visible" variants={fadeUp} custom={0} className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Mi Panel</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1.5 text-sm font-medium">Visión general de tu progreso y herramientas académicas.</p>
        </div>
        <Link to="/chat" className="shrink-0">
          <Button className="py-2.5 px-5 shadow-sm flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-2xl">
            <MessageSquare className="w-4 h-4" />
            Abrir Asistente
          </Button>
        </Link>
      </motion.header>

      {/* Stats Row */}
      <motion.div
        initial="hidden" animate="visible" variants={fadeUp} custom={1}
        className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8"
      >
        <StatCard icon={BookOpen} value={stats.total} label="Cursos" tone="blue" />
        <StatCard icon={CheckCircle2} value={stats.validados} label="Validados" tone="emerald" />
        <StatCard icon={CircleDashed} value={stats.pendientes} label="Pendientes" tone="amber" />
        <StatCard icon={TrendingUp} value={stats.promedioGeneral} label="Prom. General" tone="slate" />
        <StatCard icon={AlertTriangle} value={stats.alertas} label="Alertas" tone="rose" />
      </motion.div>

      <div className="grid lg:grid-cols-12 gap-8">

        {/* Left Column */}
        <motion.div
          initial="hidden" animate="visible" variants={fadeUp} custom={2}
          className="lg:col-span-8 space-y-8"
        >
          {/* Activity Chart */}
          <div className="bg-white dark:bg-[#131A2C] border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-650 dark:text-blue-400" />
                  Actividad Semanal
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">Interacciones con el asistente Sylia</p>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Esta semana
              </div>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activityData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorAct" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.08}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--chart-text)', fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: 'var(--chart-text)', fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '16px', border: '1px solid var(--chart-tooltip-border)', backgroundColor: 'var(--chart-tooltip-bg)', color: 'var(--chart-text)', fontSize: '12px', fontWeight: 'bold', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    cursor={{ stroke: 'var(--chart-grid)', strokeWidth: 1, strokeDasharray: '4 4' }}
                  />
                  <Area type="monotone" dataKey="actividad" stroke="#2563eb" strokeWidth={2.5} fillOpacity={1} fill="url(#colorAct)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Cursos */}
          <div>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-650 dark:text-blue-400" />
                Mis Cursos
              </h3>
              <Link to="/mis-cursos" className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1 transition-colors">
                Ver todos <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {coursesLoading ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-40 border border-slate-100 dark:border-slate-800 rounded-3xl bg-slate-50 dark:bg-slate-900/60 animate-pulse" />
                ))}
              </div>
            ) : enrollments.length === 0 ? (
              <div className="border border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center bg-white dark:bg-[#131A2C] shadow-sm">
                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900/60 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-slate-100 dark:border-slate-800">
                  <BookMarked className="w-7 h-7 text-slate-300 dark:text-slate-700" />
                </div>
                <h4 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">Sin cursos inscritos</h4>
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-5">No estás matriculado en ningún curso activo todavía.</p>
                <Link to="/cursos">
                  <Button variant="outline" size="sm" className="rounded-2xl">Explorar Catálogo</Button>
                </Link>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {enrollments.slice(0, 4).map((ctx, idx) => (
                  <motion.div
                    key={ctx.id_contexto}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + idx * 0.06, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className="p-5 border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 rounded-3xl bg-white dark:bg-[#131A2C] transition-all duration-200 hover:shadow-md group"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-[10px] font-bold tracking-wider text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg uppercase">
                        {ctx.codigo_curso || 'CURSO'}
                      </span>
                      {ctx.silabo_validado ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-450 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-1 rounded-lg border border-emerald-100 dark:border-emerald-900/40">
                          <CheckCircle2 className="w-3 h-3" /> Validado
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-450 bg-amber-50 dark:bg-amber-950/20 px-2 py-1 rounded-lg border border-amber-100 dark:border-amber-900/40">
                          <CircleDashed className="w-3 h-3" /> Pendiente
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-tight mb-1 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors line-clamp-2">
                      {ctx.curso}
                    </h4>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mb-5 font-medium">{ctx.periodo}</p>
                    <Link to={`/chat?contexto=${ctx.id_contexto}`}>
                      <button className="text-xs font-bold text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 flex items-center gap-1 transition-colors">
                        Consultar IA <ChevronRight className="w-3 h-3" />
                      </button>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Grades Chart */}
          {enrollments.length > 0 && (
            <div className="bg-white dark:bg-[#131A2C] border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-650 dark:text-blue-400" />
                    Rendimiento Académico
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">Notas por evaluación (último curso)</p>
                </div>
              </div>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={gradeData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--chart-text)', fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: 'var(--chart-text)', fontWeight: 600 }} axisLine={false} tickLine={false} domain={[0, 20]} />
                    <Tooltip
                      contentStyle={{ borderRadius: '16px', border: '1px solid var(--chart-tooltip-border)', backgroundColor: 'var(--chart-tooltip-bg)', color: 'var(--chart-text)', fontSize: '12px', fontWeight: 'bold', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      cursor={{ fill: 'var(--chart-grid)' }}
                    />
                    <Bar dataKey="nota" fill="var(--chart-bar)" radius={[8, 8, 0, 0]} barSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Incidentes Recientes */}
          {recentIncidents.length > 0 && (
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2 mb-5">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Alertas Académicas y Recomendaciones
              </h3>
              <div className="space-y-3">
                {recentIncidents.map((inc, idx) => {
                  const isResuelto = inc.estado === 'RESUELTO';
                  return (
                    <motion.div
                      key={inc.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + idx * 0.06, duration: 0.35 }}
                      className={`p-5 border rounded-3xl transition-all shadow-sm flex flex-col gap-3 ${
                        isResuelto
                          ? 'bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-900/55'
                          : inc.severidad === 'ALTA'
                            ? 'bg-rose-50/50 dark:bg-rose-950/10 border-rose-200 dark:border-rose-900/55'
                            : 'bg-amber-50/50 dark:bg-amber-950/10 border-amber-200 dark:border-amber-900/55'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-3">
                          {isResuelto ? (
                            <div className="p-2 bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 rounded-2xl shrink-0">
                              <CheckCircle2 className="w-4 h-4" />
                            </div>
                          ) : (
                            <div className={`p-2 rounded-2xl shrink-0 ${inc.severidad === 'ALTA' ? 'bg-rose-100 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400' : 'bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400'}`}>
                              <AlertTriangle className="w-4 h-4" />
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h5 className="font-bold text-xs text-slate-900 dark:text-slate-100 leading-none">
                                {isResuelto ? 'Intervención Atendida' : `Alerta: Riesgo ${inc.severidad === 'ALTA' ? 'Crítico' : 'Moderado'}`}
                              </h5>
                              <span className="text-[9px] bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-mono text-slate-500 dark:text-slate-400 font-bold">INC-{String(inc.id).padStart(4, '0')}</span>
                            </div>
                            {inc.promedio_actual !== null && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 font-medium">
                                Promedio Proyectado: <span className="font-mono font-bold text-slate-900 dark:text-slate-150">{inc.promedio_actual} / 20.0</span>
                              </p>
                            )}
                          </div>
                        </div>
                        {isResuelto ? (
                          <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-400 text-[10px] font-bold rounded-lg border border-emerald-200 dark:border-emerald-800/80 flex items-center gap-1 shadow-sm">
                            <CheckCircle2 className="w-3 h-3" /> Resuelto
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-950/30 text-amber-800 dark:text-amber-400 text-[10px] font-bold rounded-lg border border-amber-200 dark:border-amber-800/80 flex items-center gap-1 animate-pulse shadow-sm">
                            <CircleDashed className="w-3 h-3" /> Pendiente
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm">
                        <span className="font-bold text-[10px] mb-1 uppercase tracking-wider text-blue-700 dark:text-blue-400 block">Plan de Acción / Recomendación:</span>
                        <p className="line-clamp-3">{inc.recomendacion || 'Rendimiento por debajo del umbral aprobatorio. Se recomienda asistir a las sesiones de tutoría académica.'}</p>
                      </div>

                      {isResuelto && inc.fecha_cierre && (
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 text-right font-semibold">
                          Atendido el: {new Date(inc.fecha_cierre).toLocaleDateString('es-ES', { dateStyle: 'medium' })}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>

        {/* Right Column: Tools */}
        <motion.div
          initial="hidden" animate="visible" variants={fadeUp} custom={3}
          className="lg:col-span-4 space-y-8"
          data-tour="student-tools"
        >
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-5">Herramientas</h3>
            <div className="grid grid-cols-1 gap-3">
              <QuickLink to="/chat" icon={MessageSquare} title="Sylia" description="Resuelve tus dudas del sílabo con IA" />
              <QuickLink to="/cursos" icon={BookMarked} title="Catálogo" description="Inscríbete en nuevos cursos disponibles" tourId="student-catalog-option" />
              <QuickLink to="/syllabus" icon={FileText} title="Mis Sílabos" description="Gestiona y sube archivos PDF" />
              <QuickLink to="/profile" icon={Settings} title="Configuración" description="Perfil, cuenta y preferencias" />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-[#131A2C] border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm">
            <h4 className="text-sm font-extrabold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              Acciones Rápidas
            </h4>
            <div className="space-y-2.5">
              <Link to="/chat" className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group">
                <MessageSquare className="w-4 h-4 text-slate-650 dark:text-slate-400" />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white">Nueva consulta a Sylia</span>
              </Link>
              <Link to="/cursos" className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group">
                <BookMarked className="w-4 h-4 text-slate-650 dark:text-slate-400" />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white">Inscribirme en un curso</span>
              </Link>
              <Link to="/sugerencias" className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group">
                <Compass className="w-4 h-4 text-slate-650 dark:text-slate-400" />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white">Ver sugerencias</span>
              </Link>
            </div>
          </div>

          {/* Promo card */}
          <div className="p-6 bg-slate-900 dark:bg-[#131A2C] border dark:border-slate-800 rounded-3xl text-white shadow-lg">
            <Compass className="w-6 h-6 text-blue-400 mb-3" />
            <h4 className="text-sm font-bold mb-1">¿Primera vez aquí?</h4>
            <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed mb-5">
              Descubre todas las funciones de Sylia con nuestra guía interactiva paso a paso.
            </p>
            <Link to="/sugerencias">
              <button className="text-xs font-bold text-blue-300 dark:text-blue-400 hover:text-white dark:hover:text-blue-200 transition-colors flex items-center gap-1">
                Ver sugerencias <ArrowRight className="w-3 h-3" />
              </button>
            </Link>
          </div>
        </motion.div>

      </div>
    </div>
  );
};

export default DashboardPage;