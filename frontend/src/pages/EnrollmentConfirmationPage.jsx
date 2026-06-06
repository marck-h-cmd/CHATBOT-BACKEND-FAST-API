import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCourse } from '../contexts/CourseContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const EnrollmentConfirmationPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { courses, loading: coursesLoading } = useCourse();

  const enrollments = location.state?.enrollments || [];

  if (coursesLoading) {
    return <LoadingSpinner fullScreen />;
  }

  if (enrollments.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="dark:bg-[#131A2C] dark:border-slate-800 transition-colors duration-200">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">❌</div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Error en la Inscripción</h2>
            <p className="text-gray-600 dark:text-slate-400 mb-8">
              No se encontraron los datos de la inscripción. Por favor, intenta de nuevo.
            </p>
            <Button onClick={() => navigate('/cursos')}>
              Volver al Catálogo
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Card className="mb-6 border-green-200 dark:border-green-900/30 bg-green-50 dark:bg-green-955/20 transition-colors duration-200">
        <div className="text-center py-4">
          <div className="text-5xl mb-3">✅</div>
          <h1 className="text-2xl font-bold text-green-900 dark:text-green-400 mb-2">¡Inscripciones Confirmadas!</h1>
          <p className="text-green-800 dark:text-green-300 mb-4">
            Te has inscrito exitosamente en {enrollments.length} {enrollments.length === 1 ? 'curso' : 'cursos'}.
          </p>
        </div>
      </Card>

      <div className="space-y-4 mb-8">
        {enrollments.map((enrollment, index) => {
          const courseData = courses.find(c => c.id_curso === enrollment.id_curso);
          
          return (
            <Card key={index} className="dark:bg-[#131A2C] dark:border-slate-800 transition-colors duration-200 p-5">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <p className="text-lg font-bold text-gray-800 dark:text-white mb-1">
                    {courseData ? courseData.nombre_curso : `Curso ID: ${enrollment.id_curso}`}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-slate-400">
                    {courseData ? `${courseData.codigo_curso} • ` : ''}El sílabo oficial ha sido asignado automáticamente.
                  </p>
                </div>
                <Button
                  onClick={() => navigate('/chat', { state: { selectedContextId: enrollment.id_contexto } })}
                  className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Ir al Chat 💬
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="flex gap-3 justify-center">
        <Button
          onClick={() => navigate('/cursos')}
          variant="outline"
          className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-705 dark:text-slate-300 rounded-xl transition-colors"
        >
          ← Volver al Catálogo
        </Button>
        <Button
          onClick={() => navigate('/mis-cursos')}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          Ver Mis Cursos
        </Button>
      </div>
    </div>
  );
};

export default EnrollmentConfirmationPage;
