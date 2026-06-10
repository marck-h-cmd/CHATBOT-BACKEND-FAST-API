import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LayoutDashboard, MessageSquare, BookMarked, Layers, BarChart3, Settings, LogOut, FileText, Lightbulb } from 'lucide-react';
import * as sugerenciasAPI from '../../api/sugerencias';

const Sidebar = () => {
  const { isAdmin, isAuthenticated } = useAuth();
  const [pendingSuggestions, setPendingSuggestions] = useState(0);

  useEffect(() => {
    if (isAuthenticated && !isAdmin) {
      const fetchSuggestions = async () => {
        try {
          const data = await sugerenciasAPI.getSugerencias();
          const pendingCount = data.filter(s => s.estado === 'PENDIENTE').length;
          setPendingSuggestions(pendingCount);
        } catch (err) {
          console.error("Error fetching suggestions for sidebar:", err);
        }
      };
      fetchSuggestions();
      
      const interval = setInterval(fetchSuggestions, 30000); // Actualiza cada 30 segundos
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, isAdmin]);

  const studentNavItems = [
    { to: '/dashboard', label: 'Mi Panel', icon: LayoutDashboard },
    { to: '/chat', label: 'Sylia', icon: MessageSquare },
    { to: '/sugerencias', label: 'Sugerencias', icon: Lightbulb, badge: pendingSuggestions },
    { to: '/mis-cursos', label: 'Mis Cursos', icon: BookMarked },
    { to: '/cursos', label: 'Catálogo', icon: Layers },
    { to: '/profile', label: 'Configuración', icon: Settings },
  ];

  const adminNavItems = [
    { to: '/admin/dashboard', label: 'Panel ITIL', icon: LayoutDashboard },
    { to: '/admin/cursos', label: 'Gestión Cursos', icon: BookMarked },
    { to: '/admin/silabos/pendientes', label: 'Sílabos', icon: FileText },
    { to: '/admin/service-desk', label: 'Service Desk', icon: MessageSquare },
    { to: '/metrics', label: 'Métricas RAG', icon: BarChart3 },
    { to: '/admin/profile', label: 'Perfil Admin', icon: Settings },
  ];

  const navItems = isAdmin ? adminNavItems : studentNavItems;

  return (
    <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800/80 h-[calc(100vh-64px)] sticky top-16 overflow-y-auto flex flex-col justify-between hidden md:flex transition-colors duration-200">
      <div className="p-4">
        <div className="mb-4 px-3">
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            {isAdmin ? 'Administración' : 'Estudiante'}
          </p>
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 group ${
                  isActive
                    ? 'bg-[#0B0F19] dark:bg-slate-800 text-white dark:text-slate-100 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-[#0B0F19] dark:hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={`w-5 h-5 transition-colors ${
                    isActive ? 'text-white dark:text-slate-100' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300'
                  }`} />
                  <span className="flex-1">{item.label}</span>
                  {item.badge > 0 && (
                    <span className="bg-red-500 dark:bg-red-600 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full min-w-[20px] text-center ml-auto">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Footer Area of Sidebar */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800/80">
        <div className="bg-[#FAF9F6] dark:bg-slate-900/60 rounded-xl p-4 border border-slate-100 dark:border-slate-800 flex items-center gap-3">
          <img src="/logo.png" alt="Sylia AI Logo" className="h-8 w-auto object-contain shrink-0" />
          <div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 tracking-tight">Sylia AI</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">v1.2.0 • Estable</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;