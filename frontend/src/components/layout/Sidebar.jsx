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
    <aside className="w-64 bg-white border-r border-slate-100 h-[calc(100vh-64px)] sticky top-16 overflow-y-auto flex flex-col justify-between hidden md:flex">
      <div className="p-4">
        <div className="mb-4 px-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
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
                    ? 'bg-[#0B0F19] text-white shadow-sm'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-[#0B0F19]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={`w-5 h-5 transition-colors ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-700'
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
        <div className="bg-[#FAF9F6] rounded-xl p-4 border border-slate-100 flex items-center gap-3">
          <img src="/logo.png" alt="Sylia AI Logo" className="h-8 w-auto object-contain shrink-0" />
          <div>
            <p className="text-xs font-bold text-slate-800 tracking-tight">Sylia AI</p>
            <p className="text-[10px] text-slate-400 font-medium">v1.2.0 • Estable</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;