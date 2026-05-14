import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCourse } from '../contexts/CourseContext';
import { useServiceDesk } from '../contexts/ServiceDeskContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

const DashboardPage = () => {
  const { user } = useAuth();
  const { enrollments, loading: coursesLoading, getCurrentPeriod } = useCourse();
  const { incidents } = useServiceDesk();
  const [recentIncidents, setRecentIncidents] = useState([]);

  useEffect(() => {
    if (incidents && incidents.length > 0) {
      setRecentIncidents(incidents.slice(0, 3));
    }
  }, [incidents]);

  // Si es admin, redirigir al dashboard admin
  if (user?.rol === 'admin') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard Administrador</h1>
        <Card className="mb-6 bg-gradient-to-r from-purple-50 to-indigo-50">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">
                ¡Hola, {user?.nombres || 'Administrador'}!
              </h2>
              <p className="text-gray-600 mt-1">
                Bienvenido al Panel de Administración ITIL 4. Gestiona cursos, periodos y sílabos.
              </p>
            </div>
            <Link to="/admin/dashboard">
              <Button>Ir al Panel Admin →</Button>
            </Link>
          </div>
        </Card>
        <Card title="Acceso rápido">
          <div className="space-y-2">
            <Link to="/admin/dashboard" className="block text-blue-600 hover:underline">📊 Dashboard ITIL</Link>
            <Link to="/admin/cursos" className="block text-blue-600 hover:underline">📚 Gestión de Cursos</Link>
            <Link to="/admin/periodos" className="block text-blue-600 hover:underline">📅 Gestión de Periodos</Link>
            <Link to="/admin/silabos/pendientes" className="block text-blue-600 hover:underline">🔍 Sílabos Pendientes</Link>
            <Link to="/admin/service-desk" className="block text-blue-600 hover:underline">🎫 Service Desk</Link>
            <Link to="/metrics" className="block text-blue-600 hover:underline">📈 Métricas ITIL</Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>
      
      {/* Tarjeta de bienvenida */}
      <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              ¡Hola, {user?.nombres || 'Estudiante'}!
            </h2>
            <p className="text-gray-600 mt-1">
              Bienvenido al Chatbot Académico ITIL 4. Gestiona tus cursos, sílabos y rendimiento académico.
            </p>
          </div>
          <Link to="/chat">
            <Button>Ir al chat →</Button>
          </Link>
        </div>
      </Card>

      {/* Tarjeta de cursos inscritos */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card title="Mis Cursos Inscritos">
          {coursesLoading ? (
            <p className="text-gray-500">Cargando cursos...</p>
          ) : enrollments.length === 0 ? (
            <div>
              <p className="text-gray-500 mb-3">No estás inscrito en ningún curso.</p>
              <Link to="/cursos" className="text-blue-600 hover:underline text-sm">
                Explorar cursos disponibles →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {enrollments.map((ctx) => (
                <div key={ctx.id_contexto} className="p-3 border rounded-lg bg-white">
                  <p className="font-medium">{ctx.curso}</p>
                  <p className="text-sm text-gray-500">{ctx.periodo}</p>
                  {ctx.silabo_validado ? (
                    <span className="inline-block mt-1 text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                      ✅ Sílabo validado
                    </span>
                  ) : (
                    <span className="inline-block mt-1 text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                      ⏳ Pendiente
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Acceso rápido">
          <div className="space-y-2">
            <Link to="/chat" className="block text-blue-600 hover:underline">💬 Ir al chat</Link>
            <Link to="/cursos" className="block text-blue-600 hover:underline">📚 Inscribir cursos</Link>
            <Link to="/syllabus" className="block text-blue-600 hover:underline">� Gestionar sílabos</Link>
            {user?.rol === 'admin' && (
              <>
                <Link to="/metrics" className="block text-blue-600 hover:underline">📊 Ver métricas ITIL</Link>
                <Link to="/admin/silabos" className="block text-blue-600 hover:underline">🔍 Revisar sílabos pendientes</Link>
              </>
            )}
            <Link to="/profile" className="block text-blue-600 hover:underline">👤 Mi perfil</Link>
          </div>
        </Card>
      </div>

      {/* Sección de incidentes recientes (solo si hay) */}
      {recentIncidents.length > 0 && (
        <Card title="Incidentes recientes" className="mt-6">
          <ul className="divide-y divide-gray-200">
            {recentIncidents.map(inc => (
              <li key={inc.id} className="py-2">
                <span className="text-sm">{inc.recomendacion || `Severidad: ${inc.severidad}`}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
};

export default DashboardPage;