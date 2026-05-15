import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useServiceDesk } from '../../contexts/ServiceDeskContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { LayoutDashboard, BookMarked, CalendarDays, FileText, Search, Ticket, AlertTriangle, BarChart3, Menu, Home, LogOut, ShieldAlert } from 'lucide-react';

const AdminDashboardPage = () => {
  const { user, logout } = useAuth();
  const { loading } = useServiceDesk();
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
    { path: '/admin/incidentes', icon: AlertTriangle, label: 'Incidentes' },
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
    <div className="min-h-screen flex bg-slate-50 relative overflow-hidden">
      
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 md:relative
        ${sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0 md:w-20'} 
        transition-all duration-300 bg-white border-r border-slate-200 flex flex-col shadow-xl md:shadow-sm
      `}>
        <div className="h-16 shrink-0 flex items-center justify-between px-4 border-b border-slate-100">
          <h1 className={`font-bold text-indigo-700 tracking-tight transition-all ${sidebarOpen ? 'text-lg' : 'text-xs mx-auto'}`}>
            {sidebarOpen ? 'Centro de Mando' : 'ADMIN'}
          </h1>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          <div className="mb-4">
            {sidebarOpen && <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-3">Gestión ITIL</p>}
          </div>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => {
                  if (window.innerWidth < 768) setSidebarOpen(false);
                }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-indigo-600'
                }`}
                title={!sidebarOpen ? item.label : ''}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-indigo-500'}`} />
                {sidebarOpen && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100 space-y-2 shrink-0">
          <Link
            to="/dashboard"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors group"
            title={!sidebarOpen ? 'Vista Estudiante' : ''}
          >
            <Home className="w-5 h-5 shrink-0 text-slate-400 group-hover:text-indigo-500" />
            {sidebarOpen && <span className="font-medium">Vista Estudiante</span>}
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-600 hover:bg-red-50 w-full transition-colors"
            title={!sidebarOpen ? 'Salir' : ''}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {sidebarOpen && <span className="font-medium">Cerrar Sesión</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        {/* Top Bar */}
        <header className="bg-white border-b border-slate-200 h-16 shrink-0 flex items-center justify-between px-4 sm:px-6 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 -ml-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
               <div className="w-8 h-8 rounded-lg overflow-hidden shadow-sm border border-slate-100 hidden sm:block">
                  <img src="/logo.png" alt="Sylia Logo" className="w-full h-full object-cover" />
               </div>
               <span className="font-bold text-slate-800 text-sm hidden sm:block md:hidden">Admin Panel</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end mr-1">
              <span className="text-sm font-bold text-slate-800 leading-tight">
                {user?.nombres?.split(' ')[0] || 'Administrador'}
              </span>
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider hidden sm:block">
                Administrador
              </span>
            </div>
            <div className="w-9 h-9 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-sm border border-indigo-200 shrink-0">
              {user?.nombres?.charAt(0) || 'A'}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8 bg-slate-50 relative">
          {loading ? (
            <LoadingSpinner fullScreen />
          ) : (
            <div className="max-w-7xl mx-auto w-full">
              <Outlet />
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
