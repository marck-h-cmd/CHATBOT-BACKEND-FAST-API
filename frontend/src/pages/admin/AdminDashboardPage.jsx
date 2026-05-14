import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useServiceDesk } from '../../contexts/ServiceDeskContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const AdminDashboardPage = () => {
  const { user } = useAuth();
  const { metrics, loading } = useServiceDesk();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const menuItems = [
    { path: '/admin/dashboard', icon: '📊', label: 'Dashboard' },
    { path: '/admin/cursos', icon: '📚', label: 'Gestión de Cursos' },
    { path: '/admin/periodos', icon: '📅', label: 'Gestión de Periodos' },
    { path: '/admin/silabos', icon: '📄', label: 'Sílabos' },
    { path: '/admin/silabos/pendientes', icon: '🔍', label: 'Sílabos Pendientes' },
    { path: '/admin/service-desk', icon: '🎫', label: 'Service Desk' },
    { path: '/admin/incidentes', icon: '⚠️', label: 'Incidentes' },
    { path: '/admin/metricas', icon: '📈', label: 'Métricas ITIL' },
  ];

  if (user?.rol !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-xl mb-4">Acceso denegado</p>
          <p className="text-gray-600">Solo administradores pueden acceder a esta página.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300 bg-gray-900 text-white`}>
        <div className="p-4 border-b border-gray-700">
          <h1 className={`font-bold ${sidebarOpen ? 'text-xl' : 'text-center text-lg'}`}>
            {sidebarOpen ? 'Admin ITIL' : '🔧'}
          </h1>
        </div>
        
        <nav className="p-4 space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                location.pathname === item.path
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              {sidebarOpen && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
          <Link
            to="/dashboard"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors"
          >
            <span className="text-xl">🏠</span>
            {sidebarOpen && <span>Volver al Dashboard</span>}
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-600 hover:text-gray-800"
          >
            ☰
          </button>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              Bienvenido, {user?.nombres}
            </span>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
              Administrador
            </span>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 overflow-y-auto">
          {loading ? (
            <LoadingSpinner />
          ) : (
            <Outlet />
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
