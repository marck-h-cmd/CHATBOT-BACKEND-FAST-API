import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Sidebar = () => {
  const { isAdmin } = useAuth();

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: '📊' },
    { to: '/chat', label: 'Chat', icon: '💬' },
    { to: '/syllabus', label: 'Sílabos', icon: '📚' },
    ...(isAdmin ? [{ to: '/metrics', label: 'Métricas ITIL', icon: '📈' }] : []),
    { to: '/profile', label: 'Perfil', icon: '👤' },
  ];

  return (
    <aside className="w-64 bg-gray-50 border-r border-gray-200 h-[calc(100vh-64px)] sticky top-16 overflow-y-auto">
      <nav className="p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-200 transition-colors ${
                isActive ? 'bg-blue-100 text-blue-700 font-medium' : ''
              }`
            }
          >
            <span className="text-xl">{item.icon}</span>
          <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;