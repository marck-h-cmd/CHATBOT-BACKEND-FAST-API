import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useOnboarding } from '../../contexts/OnboardingContext';
import Button from '../ui/Button';
import { LogOut, Menu, X, LayoutDashboard, MessageSquare, BookMarked, BookOpen, BarChart3, User as UserIcon, Compass, ShieldCheck } from 'lucide-react';

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
        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
          isActive
            ? 'bg-[#0B0F19] text-white shadow-sm'
            : 'text-slate-500 hover:text-[#0B0F19] hover:bg-slate-100'
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
        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-semibold transition-all duration-200 ${
          isActive
            ? 'bg-[#0B0F19] text-white shadow-sm'
            : 'text-slate-600 hover:text-[#0B0F19] hover:bg-slate-100'
        }`}
      >
        {Icon && <Icon className="w-5 h-5" />}
        {label}
      </Link>
    );
  };

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo y nombre */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-xl bg-[#0B0F19] flex items-center justify-center shadow-sm">
                <ShieldCheck className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-[#0B0F19] text-lg tracking-tight group-hover:text-blue-600 transition-colors">
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
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                {canStartOnboarding && user?.rol === 'estudiante' && (
                  <button
                    onClick={() => startOnboarding(0)}
                    className="text-sm font-semibold text-slate-500 hover:text-blue-600 transition-colors flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-slate-100"
                    data-tour="student-reopen-onboarding"
                  >
                    <Compass className="w-4 h-4" /> Guia
                  </button>
                )}
                <Link to="/profile" className="flex items-center gap-2.5 hover:bg-slate-100 px-2.5 py-1.5 rounded-xl transition-colors group border border-transparent hover:border-slate-200">
                  <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-full flex items-center justify-center font-bold text-[10px] shadow-sm">
                    {user?.nombres?.charAt(0) || 'U'}
                  </div>
                  <span className="text-sm font-semibold text-slate-700 group-hover:text-[#0B0F19] transition-colors">
                    {user?.nombres?.split(' ')[0]}
                  </span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-sm font-semibold text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-red-50"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login">
                  <Button variant="outline" size="sm" className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50">Ingresar</Button>
                </Link>
                <Link to="/register">
                  <Button size="sm" className="bg-[#0B0F19] hover:bg-[#1a2035]">Registrarse</Button>
                </Link>
              </div>
            )}
          </div>

          {/* Botón menú hamburguesa (móvil) */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 text-slate-600 hover:text-[#0B0F19] hover:bg-slate-100 rounded-xl transition-colors focus:outline-none"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Menú móvil desplegable */}
      {menuOpen && isAuthenticated && (
        <div className="md:hidden bg-white/95 backdrop-blur-lg border-t border-slate-100 px-4 py-4 space-y-1 shadow-xl absolute w-full">
          <MobileNavItem to="/dashboard" icon={LayoutDashboard} label="Panel" onClick={() => setMenuOpen(false)} tourId="student-nav-dashboard" />
          <MobileNavItem to="/chat" icon={MessageSquare} label="Asistente" onClick={() => setMenuOpen(false)} tourId="student-nav-chat" />
          <MobileNavItem to="/cursos" icon={BookMarked} label="Cursos y Matrícula" onClick={() => setMenuOpen(false)} tourId="student-nav-courses" />
          <MobileNavItem to="/sugerencias" icon={BookOpen} label="Sugerencias" onClick={() => setMenuOpen(false)} />
          {user?.rol === 'admin' && (
            <MobileNavItem to="/metrics" icon={BarChart3} label="Métricas ITIL" onClick={() => setMenuOpen(false)} />
          )}
          {canStartOnboarding && user?.rol === 'estudiante' && (
            <button
              onClick={() => { setMenuOpen(false); startOnboarding(0); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-blue-600 hover:bg-blue-50 rounded-xl text-base font-semibold transition-colors"
              data-tour="student-reopen-onboarding"
            >
              <Compass className="w-5 h-5" /> Ver guia interactiva
            </button>
          )}
          <div className="h-px bg-slate-100 my-2"></div>
          <MobileNavItem to="/profile" icon={UserIcon} label="Mi Perfil" onClick={() => setMenuOpen(false)} />
          <button
            onClick={() => { handleLogout(); setMenuOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl text-base font-semibold transition-colors"
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