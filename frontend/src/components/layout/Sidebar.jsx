import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LayoutDashboard, MessageSquare, BookMarked, Layers, BarChart3, Settings, LogOut, FileText } from 'lucide-react';

const Sidebar = () => {
  const { isAdmin } = useAuth();

  const studentNavItems = [
    { to: '/dashboard', label: 'Mi Panel', icon: LayoutDashboard },
    { to: '/chat', label: 'Sylia', icon: MessageSquare },
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
    { to: '/profile', label: 'Perfil Admin', icon: Settings },
  ];

  const navItems = isAdmin ? adminNavItems : studentNavItems;

  return (
    <aside className="w-64 bg-white border-r border-slate-200 h-[calc(100vh-64px)] sticky top-16 overflow-y-auto flex flex-col justify-between hidden md:flex">
      <div className="p-4">
        <div className="mb-4 px-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {isAdmin ? 'Administración' : 'Estudiante'}
          </p>
        </div>
        <nav className="space-y-1.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                  isActive 
                    ? 'bg-indigo-50 text-indigo-700' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-indigo-600'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={`w-5 h-5 transition-colors ${
                    isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-indigo-500'
                  }`} />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
      
      {/* Footer Area of Sidebar */}
      <div className="p-4 border-t border-slate-100">
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
             <span className="text-xs font-bold text-indigo-700">ITIL</span>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-700">Sylia AI</p>
            <p className="text-[10px] text-slate-500">v1.2.0 • Estable</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;