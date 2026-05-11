import React from 'react';
import { useSyllabus } from '../contexts/SyllabusContext';
import { useAuth } from '../contexts/AuthContext';
import SyllabusSelector from '../components/syllabus/SyllabusSelector';
import SyllabusSummary from '../components/syllabus/SyllabusSummary';
import SyllabusUploader from '../components/syllabus/SyllabusUploader';
import SyllabusChunksList from '../components/syllabus/SyllabusChunksList';
import Card from '../components/ui/Card';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const SyllabusManagerPage = () => {
  const { loading, userSyllabi } = useSyllabus();
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Card>
          <p className="text-gray-600">Inicia sesión para gestionar sílabos.</p>
        </Card>
      </div>
    );
  }

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Gestión de Sílabos</h1>
      
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card title="Sílabo activo">
            <SyllabusSelector />
          </Card>
          <SyllabusSummary />
        </div>
        
        <div className="space-y-6">
          <Card title="Subir nuevo sílabo">
            <SyllabusUploader />
          </Card>
          
          {userSyllabi.length > 0 && (
            <Card title="Mis sílabos subidos">
              <ul className="divide-y divide-gray-200">
                {userSyllabi.map(s => (
                  <li key={s.id} className="py-2 flex justify-between">
                    <span>{s.nombre_archivo}</span>
                    <span className="text-xs text-gray-500">
                      {s.fecha_subida ? new Date(s.fecha_subida).toLocaleDateString() : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>

      {/* Debug solo visible para admin (opcional) */}
      {userSyllabi.length > 0 && <SyllabusChunksList />}
    </div>
  );
};

export default SyllabusManagerPage;