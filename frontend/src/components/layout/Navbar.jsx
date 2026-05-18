import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useOnboarding } from '../../contexts/OnboardingContext';
import Button from '../ui/Button';
import { LogOut, Menu, X, LayoutDashboard, MessageSquare, BookMarked, BookOpen, BarChart3, User as UserIcon, Compass } from 'lucide-react';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const { canStartOnboarding, startOnboarding } = useOnboarding();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const NavItem = ({ to, icon: Icon, label, tourId = null }) => {
    const isActive = location.pathname === to || location.pathname.startsWith(to + '/');
    return (
      <Link 
        to={to} 
        data-tour={tourId || undefined}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          isActive 
            ? 'bg-indigo-50 text-indigo-700' 
            : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-50'
        }`}
      >
        {Icon && <Icon className="w-4 h-4" />}
        {label}
      </Link>
    );
  };

  const MobileNavItem = ({ to, icon: Icon, label, onClick, tourId = null }) => {
    const isActive = location.pathname === to || location.pathname.startsWith(to + '/');
    return (
      <Link 
        to={to} 
        onClick={onClick}
        data-tour={tourId || undefined}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-colors ${
          isActive 
            ? 'bg-indigo-50 text-indigo-700' 
            : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-50'
        }`}
      >
        {Icon && <Icon className="w-5 h-5" />}
        {label}
      </Link>
    );
  };

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo y nombre */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center shadow-sm">
                <img src="/logo.png" alt="Sylia Logo" className="w-full h-full object-cover" />
              </div>
              <span className="font-bold text-slate-800 text-lg tracking-tight group-hover:text-indigo-700 transition-colors">
                Sylia
              </span>
            </Link>
          </div>

          {/* Menú de escritorio */}
          {isAuthenticated && (
            <div className="hidden md:flex items-center gap-1 ml-6 flex-1">
              <NavItem to="/dashboard" icon={LayoutDashboard} label="Panel" tourId="student-nav-dashboard" />
              <NavItem to="/chat" icon={MessageSquare} label="Asistente" tourId="student-nav-chat" />
              <NavItem to="/cursos" icon={BookMarked} label="Cursos" tourId="student-nav-courses" />
              <NavItem to="/sugerencias" icon={BookOpen} label="Sugerencias" />
              {user?.rol === 'admin' && (
                <NavItem to="/metrics" icon={BarChart3} label="Métricas" />
              )}
            </div>
          )}

          {/* Usuario y logout (escritorio) */}
          <div className="hidden md:flex items-center gap-4">
            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                {canStartOnboarding && user?.rol === 'estudiante' && (
                  <button
                    onClick={() => startOnboarding(0)}
                    className="text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-1.5"
                    data-tour="student-reopen-onboarding"
                  >
                    <Compass className="w-4 h-4" /> Guia
                  </button>
                )}
                <Link to="/profile" className="flex items-center gap-2 hover:bg-slate-50 px-2 py-1.5 rounded-lg transition-colors group">
                  <div className="w-7 h-7 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-xs">
                    {user?.nombres?.charAt(0) || 'U'}
                  </div>
                  <span className="text-sm font-medium text-slate-700 group-hover:text-indigo-700 transition-colors">
                    {user?.nombres?.split(' ')[0]}
                  </span>
                </Link>
                <div className="h-4 w-px bg-slate-200"></div>
                <button 
                  onClick={handleLogout}
                  className="text-sm font-medium text-slate-500 hover:text-red-600 transition-colors flex items-center gap-1.5"
                >
                  <LogOut className="w-4 h-4" /> Salir
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login">
                  <Button variant="outline" size="sm" className="bg-white">Ingresar</Button>
                </Link>
                <Link to="/register">
                  <Button size="sm">Registrarse</Button>
                </Link>
              </div>
            )}
          </div>

          {/* Botón menú hamburguesa (móvil) */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors focus:outline-none"
            >
              {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Menú móvil desplegable */}
      {menuOpen && isAuthenticated && (
        <div className="md:hidden bg-white border-t border-slate-100 px-4 py-4 space-y-1 shadow-lg absolute w-full">
          <MobileNavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" onClick={() => setMenuOpen(false)} tourId="student-nav-dashboard" />
          <MobileNavItem to="/chat" icon={MessageSquare} label="Sylia" onClick={() => setMenuOpen(false)} tourId="student-nav-chat" />
          <MobileNavItem to="/cursos" icon={BookMarked} label="Cursos y Matrícula" onClick={() => setMenuOpen(false)} tourId="student-nav-courses" />
          <MobileNavItem to="/sugerencias" icon={BookOpen} label="Sugerencias" onClick={() => setMenuOpen(false)} />
          {user?.rol === 'admin' && (
            <MobileNavItem to="/metrics" icon={BarChart3} label="Métricas ITIL" onClick={() => setMenuOpen(false)} />
          )}
          {canStartOnboarding && user?.rol === 'estudiante' && (
            <button
              onClick={() => { setMenuOpen(false); startOnboarding(0); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-indigo-600 hover:bg-indigo-50 rounded-xl text-base font-medium transition-colors"
              data-tour="student-reopen-onboarding"
            >
              <Compass className="w-5 h-5" /> Ver guia interactiva
            </button>
          )}
          <div className="h-px bg-slate-100 my-2"></div>
          <MobileNavItem to="/profile" icon={UserIcon} label="Mi Perfil" onClick={() => setMenuOpen(false)} />
          <button
            onClick={() => { handleLogout(); setMenuOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl text-base font-medium transition-colors"
          >
            <LogOut className="w-5 h-5" /> Cerrar sesión
          </button>
        </div>
      )}
      {menuOpen && !isAuthenticated && (
        <div className="md:hidden bg-white border-t border-slate-100 px-4 py-4 space-y-2 shadow-lg absolute w-full">
          <Link to="/login" onClick={() => setMenuOpen(false)}>
            <Button variant="outline" className="w-full justify-center">Ingresar</Button>
          </Link>
          <Link to="/register" onClick={() => setMenuOpen(false)}>
            <Button className="w-full justify-center">Registrarse</Button>
          </Link>
        </div>
      )}
    </nav>
  );
};

export default Navbar;