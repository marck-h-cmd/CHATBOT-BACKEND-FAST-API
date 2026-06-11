import React, { useMemo } from 'react';
import { useSyllabus } from '../contexts/SyllabusContext';
import { useAuth } from '../contexts/AuthContext';
import SyllabusSelector from '../components/syllabus/SyllabusSelector';
import SyllabusSummary from '../components/syllabus/SyllabusSummary';
import SyllabusUploader from '../components/syllabus/SyllabusUploader';
import SyllabusPdfViewer from '../components/syllabus/SyllabusPdfViewer';
import SyllabusChunksList from '../components/syllabus/SyllabusChunksList';
import Card from '../components/ui/Card';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const SyllabusManagerPage = () => {
  const { loading, userSyllabi, selectedSyllabusId, syllabusDetail } = useSyllabus();
  const { isAuthenticated } = useAuth();

  // Filtrar los sílabos subidos de forma particular por el estudiante (no oficiales)
  const uploadedSyllabi = useMemo(() => {
    return userSyllabi.filter(s => !s.es_oficial);
  }, [userSyllabi]);

  if (!isAuthenticated) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Card>
          <p className="text-gray-600 dark:text-slate-400">Inicia sesión para gestionar sílabos.</p>
        </Card>
      </div>
    );
  }

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Gestión de Sílabos</h1>
      
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card title="Sílabo activo">
            <SyllabusSelector />
          </Card>
          <SyllabusSummary />
          {selectedSyllabusId && syllabusDetail?.ruta_pdf && (
            <SyllabusPdfViewer 
              pdfPath={syllabusDetail.ruta_pdf} 
              title={syllabusDetail.nombre_curso} 
            />
          )}
        </div>
        
        <div className="space-y-6">
          <Card title="Subir nuevo sílabo">
            <SyllabusUploader />
          </Card>
          
          {uploadedSyllabi.length > 0 && (
            <Card title="Mis sílabos subidos">
              <ul className="divide-y divide-gray-250 dark:divide-slate-800">
                {uploadedSyllabi.map(s => (
                  <li key={s.id} className="py-2 flex justify-between items-center text-sm">
                    <span className="text-slate-800 dark:text-slate-200 truncate pr-4">{s.nombre_archivo}</span>
                    <span className="text-xs text-gray-500 dark:text-slate-400 shrink-0">
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