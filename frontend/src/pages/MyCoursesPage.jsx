import React from 'react';
import { Link } from 'react-router-dom';
import { useCourse } from '../contexts/CourseContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const MyCoursesPage = () => {
  const { enrollments, loading, refreshData } = useCourse();

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Mis Cursos Inscritos</h1>
        <div className="space-x-2">
          <Link to="/cursos">
            <Button variant="outline">Explorar Cursos</Button>
          </Link>
          <Link to="/inscripcion">
            <Button>Inscribir Nuevo Curso</Button>
          </Link>
        </div>
      </div>

      {enrollments.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📚</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              No estás inscrito en ningún curso
            </h2>
            <p className="text-gray-600 mb-6">
              Inscríbete en cursos para poder usar el chat con contexto académico.
            </p>
            <Link to="/cursos">
              <Button>Ver Catálogo de Cursos</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {enrollments.map((enrollment) => (
            <Card key={enrollment.id_contexto} className="hover:shadow-md transition-shadow">
              <div className="mb-3">
                <span className="text-xs font-mono bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  {enrollment.codigo_curso || 'N/A'}
                </span>
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">{enrollment.curso}</h3>
              <p className="text-sm text-gray-500 mb-3">{enrollment.periodo}</p>
              
              {/* Estado del sílabo */}
              <div className="mb-4">
                {enrollment.silabo_validado ? (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <span>✅</span>
                    <span>Sílabo validado</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-yellow-600">
                    <span>⏳</span>
                    <span>Sílabo pendiente</span>
                  </div>
                )}
              </div>

              {/* Estado de verificación */}
              <div className="mb-4">
                <span className={`text-xs px-2 py-1 rounded ${
                  enrollment.estado_verificacion === 'OFICIAL' ? 'bg-green-100 text-green-800' :
                  enrollment.estado_verificacion === 'APROBADO' ? 'bg-blue-100 text-blue-800' :
                  enrollment.estado_verificacion === 'PENDIENTE_CONFIRMACION' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {enrollment.estado_verificacion?.replace(/_/g, ' ') || 'Sin estado'}
                </span>
              </div>

              {/* Acciones */}
              <div className="space-y-2">
                <Link to={`/chat?contexto=${enrollment.id_contexto}`}>
                  <Button size="sm" className="w-full">
                    Ir al Chat
                  </Button>
                </Link>
                {enrollment.estado_verificacion === 'PENDIENTE_CONFIRMACION' && (
                  <Link to="/syllabus">
                    <Button variant="outline" size="sm" className="w-full">
                      Subir Sílabo
                    </Button>
                  </Link>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyCoursesPage;
