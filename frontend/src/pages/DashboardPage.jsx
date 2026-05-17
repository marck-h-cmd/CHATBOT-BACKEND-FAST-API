import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCourse } from '../contexts/CourseContext';
import { useServiceDesk } from '../contexts/ServiceDeskContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { 
  MessageSquare, BookOpen, Clock, Settings, User as UserIcon, 
  BarChart3, LayoutDashboard, AlertTriangle, BookMarked, Layers,
  ChevronRight, CheckCircle2, CircleDashed
} from 'lucide-react';

const DashboardPage = () => {
  const { user } = useAuth();
  const { enrollments, loading: coursesLoading } = useCourse();
  const { incidents } = useServiceDesk();
  const [recentIncidents, setRecentIncidents] = useState([]);

  useEffect(() => {
    if (incidents && incidents.length > 0) {
      setRecentIncidents(incidents.slice(0, 3));
    }
  }, [incidents]);

  const QuickLink = ({ to, icon: Icon, title, description }) => (
    <Link to={to} className="group block h-full">
      <div className="h-full p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-500 hover:shadow-md transition-all duration-200 flex items-start gap-4">
        <div className="p-2 bg-indigo-50 rounded-lg group-hover:bg-indigo-100 transition-colors">
          <Icon className="w-5 h-5 text-indigo-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors flex items-center justify-between">
            {title}
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
          </h3>
          <p className="text-sm text-slate-500 mt-1">{description}</p>
        </div>
      </div>
    </Link>
  );

  // Vista Administrador
  if (user?.rol === 'admin') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-8 tracking-tight">Dashboard General</h1>
        
        <div className="mb-8 p-6 bg-slate-900 rounded-2xl shadow-sm text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-xl font-semibold">
              ¡Hola, {user?.nombres || 'Administrador'}!
            </h2>
            <p className="text-slate-400 mt-1.5 text-sm md:text-base max-w-2xl">
              Panel de Control Principal. Gestiona los cursos, usuarios, periodos y monitorea las métricas del sistema RAG.
            </p>
          </div>
          <Link to="/admin/dashboard" className="shrink-0 w-full md:w-auto">
            <Button className="w-full md:w-auto bg-white text-slate-900 hover:bg-slate-100">Panel Admin Avanzado</Button>
          </Link>
        </div>

        <h3 className="text-lg font-semibold text-slate-800 mb-4">Accesos de Administración</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <QuickLink to="/admin/dashboard" icon={LayoutDashboard} title="Panel ITIL" description="Vista general de servicios" />
          <QuickLink to="/admin/cursos" icon={BookMarked} title="Gestión de Cursos" description="Administrar catálogo" />
          <QuickLink to="/admin/periodos" icon={Clock} title="Periodos Académicos" description="Configurar semestres" />
          <QuickLink to="/admin/silabos/pendientes" icon={Layers} title="Sílabos Pendientes" description="Revisar extracciones" />
          <QuickLink to="/admin/service-desk" icon={MessageSquare} title="Service Desk" description="Tickets e incidentes" />
          <QuickLink to="/metrics" icon={BarChart3} title="Métricas del Sistema" description="Rendimiento del LLM" />
        </div>
      </div>
    );
  }

  // Vista Estudiante
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Mi Panel</h1>
        <p className="text-slate-500 mt-2">Visión general de tu progreso y herramientas académicas.</p>
      </header>
      
      {/* Tarjeta de bienvenida minimalista */}
      <div className="mb-8 p-6 lg:p-8 bg-indigo-50 border border-indigo-100/50 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            ¡Hola, {user?.nombres || 'Estudiante'}!
          </h2>
          <p className="text-slate-600 mt-2 max-w-2xl">
            Bienvenido a Sylia. Puedes consultar tus dudas, simular promedios y revisar la información de tus cursos al instante.
          </p>
        </div>
        <Link to="/chat" className="shrink-0 w-full md:w-auto">
          <Button className="w-full md:w-auto py-2.5 px-6 shadow-sm flex items-center justify-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Abrir Asistente
          </Button>
        </Link>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        
        {/* Columna Izquierda: Cursos */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              Mis Cursos
            </h3>
            <Link to="/mis-cursos" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
              Ver todos
            </Link>
          </div>

          {coursesLoading ? (
            <div className="h-32 border border-slate-100 rounded-xl bg-slate-50 animate-pulse" />
          ) : enrollments.length === 0 ? (
            <div className="border border-slate-200 rounded-xl p-8 text-center bg-white">
              <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <BookMarked className="w-6 h-6 text-slate-400" />
              </div>
              <h4 className="text-lg font-medium text-slate-800 mb-1">Sin cursos inscritos</h4>
              <p className="text-slate-500 text-sm mb-4">No estás matriculado en ningún curso activo.</p>
              <Link to="/cursos">
                <Button variant="outline" size="sm">Explorar Catálogo</Button>
              </Link>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {enrollments.slice(0, 4).map((ctx) => (
                <div key={ctx.id_contexto} className="p-5 border border-slate-200 hover:border-indigo-300 rounded-xl bg-white transition-colors group">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-xs font-semibold tracking-wider text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                      {ctx.codigo_curso || 'CURSO'}
                    </span>
                    {ctx.silabo_validado ? (
                      <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Validado
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-md">
                        <CircleDashed className="w-3.5 h-3.5" /> Pendiente
                      </span>
                    )}
                  </div>
                  <h4 className="font-semibold text-slate-800 leading-tight mb-1 group-hover:text-indigo-600 transition-colors line-clamp-2">
                    {ctx.curso}
                  </h4>
                  <p className="text-xs text-slate-500 mb-4">{ctx.periodo}</p>
                  <Link to={`/chat?contexto=${ctx.id_contexto}`}>
                    <button className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                      Consultar IA <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </Link>
                </div>
              ))}
            </div>
          )}

          {/* Incidentes Recientes */}
          {recentIncidents.length > 0 && (
            <div className="pt-6">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Alertas Académicas
              </h3>
              <div className="space-y-3">
                {recentIncidents.map(inc => (
                  <div key={inc.id} className="p-4 border border-amber-200/60 bg-amber-50/50 rounded-xl flex gap-3">
                    <AlertTriangle className={`w-5 h-5 shrink-0 ${inc.severidad === 'ALTA' ? 'text-red-500' : 'text-amber-500'}`} />
                    <div>
                      <h5 className="font-semibold text-slate-800 text-sm">Nivel de Riesgo: {inc.severidad}</h5>
                      <p className="text-sm text-slate-600 mt-0.5">{inc.recomendacion}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Columna Derecha: Accesos */}
        <div className="lg:col-span-4">
          <h3 className="text-xl font-bold text-slate-800 mb-6">Herramientas</h3>
          <div className="grid grid-cols-1 gap-3">
            <QuickLink to="/chat" icon={MessageSquare} title="Sylia" description="Resuelve tus dudas del sílabo" />
            <QuickLink to="/cursos" icon={BookMarked} title="Catálogo" description="Inscríbete en nuevos cursos" />
            <QuickLink to="/syllabus" icon={Layers} title="Mis Sílabos" description="Gestionar archivos PDF" />
            <QuickLink to="/profile" icon={Settings} title="Configuración" description="Perfil y cuenta" />
          </div>
        </div>

      </div>
    </div>
  );
};

export default DashboardPage;