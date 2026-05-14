import React from 'react';
import { useCourse } from '../contexts/CourseContext';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const CourseListPage = () => {
  const { courses, loading, getCurrentPeriod } = useCourse();
  const [filter, setFilter] = React.useState('all');
  const [searchTerm, setSearchTerm] = React.useState('');

  const currentPeriod = getCurrentPeriod();

  // Filtrar cursos
  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.nombre_curso.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.codigo_curso.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filter === 'all') return matchesSearch;
    if (filter === 'sistemas') return course.escuela?.toLowerCase().includes('sistemas') && matchesSearch;
    if (filter === 'estudios_generales') return course.codigo_curso.startsWith('EG') && matchesSearch;
    if (filter === 'estudios_especificos') return course.codigo_curso.startsWith('EP') && matchesSearch;
    if (filter === 'electivos') return course.codigo_curso.startsWith('EL') && matchesSearch;
    if (filter === 'investigacion') return course.codigo_curso.startsWith('EI') && matchesSearch;
    return matchesSearch;
  });

  // Agrupar por ciclo
  const coursesByCycle = filteredCourses.reduce((acc, course) => {
    const cycle = course.ciclo_referencial || 'Sin ciclo';
    if (!acc[cycle]) acc[cycle] = [];
    acc[cycle].push(course);
    return acc;
  }, {});

  const cycleOrder = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'Sin ciclo'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Catálogo de Cursos</h1>

      {/* Filtros y búsqueda */}
      <Card className="mb-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Buscar curso</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Nombre o código del curso..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filtrar por tipo</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos los cursos</option>
              <option value="sistemas">Ingeniería de Sistemas</option>
              <option value="estudios_generales">Estudios Generales (EG)</option>
              <option value="estudios_especificos">Estudios Específicos (EP)</option>
              <option value="electivos">Electivos (EL)</option>
              <option value="investigacion">Investigación (EI)</option>
            </select>
          </div>
        </div>
      </Card>

      {loading ? (
        <LoadingSpinner fullScreen />
      ) : (
        <div className="space-y-8">
          {cycleOrder.map(cycle => {
            const cycleCourses = coursesByCycle[cycle];
            if (!cycleCourses || cycleCourses.length === 0) return null;

            return (
              <div key={cycle}>
                <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                    Ciclo {cycle}
                  </span>
                  <span className="text-gray-500 text-sm font-normal">
                    {cycleCourses.length} curso{cycleCourses.length !== 1 ? 's' : ''}
                  </span>
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {cycleCourses.map(course => (
                    <Card key={course.id_curso} className="hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                          {course.codigo_curso}
                        </span>
                        <span className="text-xs text-gray-500">
                          {course.creditos} créditos
                        </span>
                      </div>
                      <h3 className="font-semibold text-gray-800 mb-2">{course.nombre_curso}</h3>
                      <p className="text-sm text-gray-500 mb-3">{course.escuela}</p>
                      <Link to="/inscripcion">
                        <Button size="sm" className="w-full">
                          Inscribirse
                        </Button>
                      </Link>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}

          {filteredCourses.length === 0 && (
            <Card>
              <p className="text-center text-gray-500 py-8">
                No se encontraron cursos que coincidan con la búsqueda.
              </p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default CourseListPage;
