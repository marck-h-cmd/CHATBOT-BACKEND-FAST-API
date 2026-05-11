import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../ui/Button';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo y nombre */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <span className="text-2xl">🎓</span>
              <span className="font-bold text-gray-800 text-lg">Chatbot Académico ITIL</span>
            </Link>
          </div>

          {/* Menú de escritorio */}
          {isAuthenticated && (
            <div className="hidden md:flex items-center space-x-4">
              <Link to="/dashboard" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
                Dashboard
              </Link>
              <Link to="/chat" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
                Chat
              </Link>
              <Link to="/syllabus" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
                Sílabos
              </Link>
              {user?.rol === 'admin' && (
                <Link to="/metrics" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
                  Métricas ITIL
                </Link>
              )}
              <Link to="/profile" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
                Perfil
              </Link>
            </div>
          )}

          {/* Usuario y logout (escritorio) */}
          <div className="hidden md:flex items-center space-x-3">
            {isAuthenticated ? (
              <>
                <span className="text-sm text-gray-600">
                  {user?.nombres} {user?.apellidos}
                </span>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  Cerrar sesión
                </Button>
              </>
            ) : (
              <div className="space-x-2">
                <Link to="/login">
                  <Button variant="outline" size="sm">Iniciar sesión</Button>
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
              className="text-gray-600 hover:text-gray-900 focus:outline-none"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Menú móvil desplegable */}
      {menuOpen && isAuthenticated && (
        <div className="md:hidden bg-white border-t border-gray-200 py-2">
          <Link to="/dashboard" className="block px-4 py-2 text-gray-700 hover:bg-gray-100" onClick={() => setMenuOpen(false)}>
            Dashboard
          </Link>
          <Link to="/chat" className="block px-4 py-2 text-gray-700 hover:bg-gray-100" onClick={() => setMenuOpen(false)}>
            Chat
          </Link>
          <Link to="/syllabus" className="block px-4 py-2 text-gray-700 hover:bg-gray-100" onClick={() => setMenuOpen(false)}>
            Sílabos
          </Link>
          {user?.rol === 'admin' && (
            <Link to="/metrics" className="block px-4 py-2 text-gray-700 hover:bg-gray-100" onClick={() => setMenuOpen(false)}>
              Métricas ITIL
            </Link>
          )}
          <Link to="/profile" className="block px-4 py-2 text-gray-700 hover:bg-gray-100" onClick={() => setMenuOpen(false)}>
            Perfil
          </Link>
          <button
            onClick={() => { handleLogout(); setMenuOpen(false); }}
            className="w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100"
          >
            Cerrar sesión
          </button>
        </div>
      )}
      {menuOpen && !isAuthenticated && (
        <div className="md:hidden bg-white border-t border-gray-200 py-2">
          <Link to="/login" className="block px-4 py-2 text-gray-700 hover:bg-gray-100" onClick={() => setMenuOpen(false)}>
            Iniciar sesión
          </Link>
          <Link to="/register" className="block px-4 py-2 text-gray-700 hover:bg-gray-100" onClick={() => setMenuOpen(false)}>
            Registrarse
          </Link>
        </div>
      )}
    </nav>
  );
};

export default Navbar;