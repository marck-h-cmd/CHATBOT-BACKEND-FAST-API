import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSyllabus } from '../contexts/SyllabusContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

const DashboardPage = () => {
  const { user } = useAuth();
  const { preloadedSyllabus, selectedSyllabusId } = useSyllabus();
  const [recentIncidents, setRecentIncidents] = useState([]);

  // Simulación: aquí luego se puede conectar a métricas para mostrar incidentes recientes
  useEffect(() => {
    // Aquí se podría llamar a getServiceDeskMetrics() para mostrar los últimos incidentes
    // Por ahora se deja vacío
  }, []);

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
              Bienvenido al Chatbot Académico ITIL 4. Resuelve tus dudas sobre sílabos y gestiona tu rendimiento.
            </p>
          </div>
          <Link to="/chat">
            <Button>Ir al chat →</Button>
          </Link>
        </div>
      </Card>

      {/* Tarjeta de sílabo actual */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card title="Sílabo activo">
          {preloadedSyllabus ? (
            <div>
              <p className="font-medium">{preloadedSyllabus.curso?.nombre || 'Gestión de Servicios TIC'}</p>
              <p className="text-sm text-gray-500 mt-1">
                {preloadedSyllabus.es_oficial ? 'Oficial' : 'Subido por ti'}
              </p>
              <Link to="/syllabus" className="text-blue-600 text-sm mt-2 inline-block">
                Ver detalles →
              </Link>
            </div>
          ) : (
            <p className="text-gray-500">Cargando sílabo...</p>
          )}
        </Card>

        <Card title="Acceso rápido">
          <div className="space-y-2">
            <Link to="/chat" className="block text-blue-600 hover:underline">💬 Ir al chat</Link>
            <Link to="/syllabus" className="block text-blue-600 hover:underline">📚 Gestionar sílabos</Link>
            {user?.rol === 'admin' && (
              <Link to="/metrics" className="block text-blue-600 hover:underline">📊 Ver métricas ITIL</Link>
            )}
            <Link to="/profile" className="block text-blue-600 hover:underline">👤 Mi perfil</Link>
          </div>
        </Card>
      </div>

      {/* Sección de incidentes recientes (solo si hay) */}
      {recentIncidents.length > 0 && (
        <Card title="Incidentes recientes" className="mt-6">
          <ul className="divide-y divide-gray-200">
            {recentIncidents.slice(0, 3).map(inc => (
              <li key={inc.id} className="py-2">
                <span className="text-sm">{inc.recomendacion}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
};

export default DashboardPage;