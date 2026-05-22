import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LayoutDashboard, BookMarked, CalendarDays, FileText, Search, Ticket, AlertTriangle, BarChart3, Menu, LogOut, ShieldAlert, ShieldCheck } from 'lucide-react';

const AdminDashboardPage = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768);

  const menuItems = [
    { path: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/admin/cursos', icon: BookMarked, label: 'Gestión de Cursos' },
    { path: '/admin/periodos', icon: CalendarDays, label: 'Gestión de Periodos' },
    { path: '/admin/silabos', icon: FileText, label: 'Sílabos Oficiales' },
    { path: '/admin/silabos/pendientes', icon: Search, label: 'Validación Pendiente' },
    { path: '/admin/service-desk', icon: Ticket, label: 'Service Desk' },
    { path: '/admin/incidentes', icon: AlertTriangle, label: 'Incidentes Académicos' },
    { path: '/admin/incidentes-servicio', icon: ShieldAlert, label: 'Incidentes de Servicio' },
    { path: '/admin/metricas', icon: BarChart3, label: 'Métricas RAG' },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (!user || (user?.rol && user.rol.toLowerCase() !== 'admin')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center p-8 bg-white border border-slate-200 rounded-2xl shadow-sm max-w-sm w-full">
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Acceso Denegado</h2>
          <p className="text-slate-500 mb-6">Solo personal autorizado puede acceder al panel de administración.</p>
          <Link to="/dashboard" className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors w-full inline-block">
            Volver al Inicio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#FAF9F6] relative overflow-hidden font-['Plus_Jakarta_Sans',sans-serif]">

      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-[#0B0F19]/40 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 md:relative
        ${sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0 md:w-20'}
        transition-all duration-300 bg-[#0B0F19] border-r border-[#1E293B] flex flex-col shadow-2xl md:shadow-none
      `}>
        <div className="h-16 shrink-0 flex items-center justify-between px-5 border-b border-[#1E293B]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm shrink-0">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <h1 className={`font-bold text-white tracking-tight transition-all ${sidebarOpen ? 'text-sm' : 'text-[10px] mx-auto hidden'}`}>
              Centro de Mando
            </h1>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {sidebarOpen && (
            <div className="mb-3 px-3 pt-2">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Gestión ITIL</p>
            </div>
          )}
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => {
                  if (window.innerWidth < 768) setSidebarOpen(false);
                }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-300 font-semibold'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
                title={!sidebarOpen ? item.label : ''}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                {sidebarOpen && <span className="truncate text-sm">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-[#1E293B] shrink-0">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-rose-400 hover:bg-rose-500/10 w-full transition-colors text-sm"
            title={!sidebarOpen ? 'Salir' : ''}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {sidebarOpen && <span className="font-semibold">Cerrar Sesión</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        {/* Top Bar */}
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 h-16 shrink-0 flex items-center justify-between px-4 sm:px-6 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 -ml-2 text-slate-500 hover:text-[#0B0F19] hover:bg-slate-100 rounded-xl transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5">
               <span className="font-bold text-[#0B0F19] text-sm hidden sm:block tracking-tight">Panel de Administración</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end mr-1">
              <span className="text-sm font-bold text-[#0B0F19] leading-tight">
                {user?.nombres?.split(' ')[0] || 'Administrador'}
              </span>
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider hidden sm:block">
                Administrador
              </span>
            </div>
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
              {user?.nombres?.charAt(0) || 'A'}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8 bg-[#FAF9F6] relative">
          <div className="max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
