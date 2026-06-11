import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useOnboarding } from '../../contexts/OnboardingContext';
import Button from '../ui/Button';
import { LogOut, Menu, X, LayoutDashboard, MessageSquare, BookMarked, BookOpen, BarChart3, User as UserIcon, Compass, ShieldCheck, Sun, Moon, FileText } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const { canStartOnboarding, startOnboarding } = useOnboarding();
  const { resolvedTheme, toggleTheme } = useTheme();
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
            ? 'bg-[#0B0F19] dark:bg-slate-800 text-white dark:text-slate-100 shadow-sm'
            : 'text-slate-500 dark:text-slate-400 hover:text-[#0B0F19] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
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
            ? 'bg-[#0B0F19] dark:bg-slate-800 text-white dark:text-slate-100 shadow-sm'
            : 'text-slate-600 dark:text-slate-400 hover:text-[#0B0F19] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
        }`}
      >
        {Icon && <Icon className="w-5 h-5" />}
        {label}
      </Link>
    );
  };

  return (
    <nav className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 sticky top-0 z-50 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo y nombre */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2.5 group">
              <img src="/logo.png" alt="Sylia Logo" className="h-8 w-auto object-contain" />
              <span className="font-bold text-[#0B0F19] dark:text-white text-lg tracking-tight group-hover:text-blue-600 transition-colors">
                Sylia
              </span>
            </Link>
          </div>

          {/* Menú de escritorio */}
          {isAuthenticated && (
            <div className="hidden md:flex items-center gap-1 ml-6 flex-1">
              <NavItem to="/dashboard" icon={LayoutDashboard} label="Panel" tourId="student-nav-dashboard" />
              <NavItem to="/chat" icon={MessageSquare} label="Asistente" tourId="student-nav-chat" />
              {user?.rol === 'estudiante' && (
                <>
                  <NavItem to="/mis-cursos" icon={BookMarked} label="Mis Cursos" tourId="student-nav-mycourses" />
                  <NavItem to="/syllabus" icon={FileText} label="Mis Sílabos" />
                </>
              )}
              <NavItem to="/cursos" icon={BookMarked} label="Cursos" tourId="student-nav-courses" />
              <NavItem to="/sugerencias" icon={BookOpen} label="Sugerencias" />
              {user?.rol === 'admin' && (
                <NavItem to="/metrics" icon={BarChart3} label="Métricas" />
              )}
            </div>
          )}

          {/* Usuario y logout (escritorio) */}
          <div className="hidden md:flex items-center gap-3">
            {/* Botón de cambio de tema */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-200"
              title="Cambiar tema"
            >
              {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                {canStartOnboarding && user?.rol === 'estudiante' && (
                  <button
                    onClick={() => startOnboarding(0)}
                    className="text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-blue-600 transition-colors flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                    data-tour="student-reopen-onboarding"
                  >
                    <Compass className="w-4 h-4" /> Guia
                  </button>
                )}
                <Link to="/profile" className="flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 px-2.5 py-1.5 rounded-xl transition-colors group border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
                  <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-full flex items-center justify-center font-bold text-[10px] shadow-sm">
                    {user?.nombres?.charAt(0) || 'U'}
                  </div>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 group-hover:text-[#0B0F19] dark:group-hover:text-white transition-colors">
                    {user?.nombres?.split(' ')[0]}
                  </span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-sm font-semibold text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login">
                  <Button variant="outline" size="sm" className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">Ingresar</Button>
                </Link>
                <Link to="/register">
                  <Button size="sm" className="bg-[#0B0F19] dark:bg-slate-800 hover:bg-[#1a2035] dark:hover:bg-slate-700 text-white">Registrarse</Button>
                </Link>
              </div>
            )}
          </div>

          {/* Botón menú hamburguesa (móvil) & theme toggle */}
          <div className="md:hidden flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-200"
              title="Cambiar tema"
            >
              {resolvedTheme === 'dark' ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
            </button>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 text-slate-600 dark:text-slate-300 hover:text-[#0B0F19] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors focus:outline-none"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Menú móvil desplegable */}
      {menuOpen && isAuthenticated && (
        <div className="md:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-100 dark:border-slate-800 px-4 py-4 space-y-1 shadow-xl absolute w-full transition-colors duration-200">
          <MobileNavItem to="/dashboard" icon={LayoutDashboard} label="Panel" onClick={() => setMenuOpen(false)} tourId="student-nav-dashboard" />
          <MobileNavItem to="/chat" icon={MessageSquare} label="Asistente" onClick={() => setMenuOpen(false)} tourId="student-nav-chat" />
          {user?.rol === 'estudiante' && (
            <>
              <MobileNavItem to="/mis-cursos" icon={BookMarked} label="Mis Cursos" onClick={() => setMenuOpen(false)} tourId="student-nav-mycourses" />
              <MobileNavItem to="/syllabus" icon={FileText} label="Mis Sílabos" onClick={() => setMenuOpen(false)} />
            </>
          )}
          <MobileNavItem to="/cursos" icon={BookMarked} label="Cursos y Matrícula" onClick={() => setMenuOpen(false)} tourId="student-nav-courses" />
          <MobileNavItem to="/sugerencias" icon={BookOpen} label="Sugerencias" onClick={() => setMenuOpen(false)} />
          {user?.rol === 'admin' && (
            <MobileNavItem to="/metrics" icon={BarChart3} label="Métricas ITIL" onClick={() => setMenuOpen(false)} />
          )}
          {canStartOnboarding && user?.rol === 'estudiante' && (
            <button
              onClick={() => { setMenuOpen(false); startOnboarding(0); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-xl text-base font-semibold transition-colors"
              data-tour="student-reopen-onboarding"
            >
              <Compass className="w-5 h-5" /> Ver guia interactiva
            </button>
          )}
          <div className="h-px bg-slate-100 dark:bg-slate-800 my-2"></div>
          <MobileNavItem to="/profile" icon={UserIcon} label="Mi Perfil" onClick={() => setMenuOpen(false)} />
          <button
            onClick={() => { handleLogout(); setMenuOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl text-base font-semibold transition-colors"
          >
            <LogOut className="w-5 h-5" /> Cerrar sesión
          </button>
        </div>
      )}
      {menuOpen && !isAuthenticated && (
        <div className="md:hidden bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 px-4 py-4 space-y-2 shadow-lg absolute w-full transition-colors duration-200">
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