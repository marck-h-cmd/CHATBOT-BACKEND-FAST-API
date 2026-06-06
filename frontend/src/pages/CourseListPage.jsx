import React from 'react';
import { useCourse } from '../contexts/CourseContext';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Modal from '../components/ui/Modal';
import { Search, Filter, Calendar, AlertCircle, BookOpen, ChevronRight, Layers } from 'lucide-react';

const CourseListPage = () => {
  const { courses, enrollments, loading, getCurrentPeriod, enrollInCourse, refreshData } = useCourse();
  const navigate = useNavigate();
  const [filter, setFilter] = React.useState('all');
  const [cycleFilter, setCycleFilter] = React.useState('all');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [enrollingCycle, setEnrollingCycle] = React.useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = React.useState(false);
  const [cycleToEnroll, setCycleToEnroll] = React.useState(null);
  const [coursesToEnrollList, setCoursesToEnrollList] = React.useState([]);

  const currentPeriod = getCurrentPeriod();

  const isEnrolled = (courseId) => {
    return enrollments.some(e => e.id_curso === courseId && e.id_periodo === currentPeriod?.id_periodo);
  };

  const handleEnrollCycleClick = (cycle, courses) => {
    setCycleToEnroll(cycle);
    setCoursesToEnrollList(courses);
    setConfirmModalOpen(true);
  };

  const executeEnrollCycle = async () => {
    if (!currentPeriod || !cycleToEnroll) return;
    setEnrollingCycle(cycleToEnroll);
    try {
      const promises = coursesToEnrollList.map(course => 
        enrollInCourse(course.id_curso, currentPeriod.id_periodo)
      );
      await Promise.all(promises);
      await refreshData();
      setConfirmModalOpen(false);
    } catch (err) {
      alert("Ocurrió un error al procesar la inscripción del ciclo.");
    } finally {
      setEnrollingCycle(null);
    }
  };

  // Filtrar cursos
  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.nombre_curso.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.codigo_curso.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesArea = true;
    if (filter === 'sistemas') matchesArea = course.escuela?.toLowerCase().includes('sistemas');
    if (filter === 'estudios_generales') matchesArea = course.codigo_curso.startsWith('EG');
    if (filter === 'estudios_especificos') matchesArea = course.codigo_curso.startsWith('EP');
    if (filter === 'electivos') matchesArea = course.codigo_curso.startsWith('EL');
    if (filter === 'investigacion') matchesArea = course.codigo_curso.startsWith('EI');

    const matchesCycle = cycleFilter === 'all' || course.ciclo_referencial === cycleFilter;

    return matchesSearch && matchesArea && matchesCycle;
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10" data-tour="student-course-catalog">
      <div className="mb-8 md:flex md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Catálogo de Cursos</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Explora e inscríbete en los cursos disponibles para este periodo.</p>
        </div>
        
        <div className="mt-4 md:mt-0">
          {currentPeriod ? (
            <div className="inline-flex flex-col items-end">
              <span className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 rounded-lg text-sm font-semibold border border-indigo-100 dark:border-indigo-900/30">
                <Calendar className="w-4 h-4" /> Periodo Activo: {currentPeriod.nombre}
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 font-medium">
                {new Date(currentPeriod.fecha_inicio).toLocaleDateString()} - {new Date(currentPeriod.fecha_fin).toLocaleDateString()}
              </span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 px-3 py-1.5 rounded-lg border border-amber-100/50 dark:border-amber-900/30">
              <AlertCircle className="w-4 h-4" /> No hay periodo académico activo.
            </div>
          )}
        </div>
      </div>

      {/* Toolbar: Filtros y búsqueda */}
      <div className="mb-8 bg-white dark:bg-[#131A2C] p-4 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between transition-colors duration-200">
        <div className="w-full md:w-1/2 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400 dark:text-slate-500" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre o código del curso..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-850 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors text-sm font-medium"
          />
        </div>
        
        <div className="w-full md:w-auto flex flex-col md:flex-row items-center gap-4">
          <div className="relative w-full md:w-48">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Layers className="h-4 w-4 text-slate-400 dark:text-slate-500" />
            </div>
            <select
              value={cycleFilter}
              onChange={(e) => setCycleFilter(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:bg-white dark:focus:bg-slate-850 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors text-sm appearance-none font-medium"
            >
              <option value="all">Todos los ciclos</option>
              {cycleOrder.filter(c => c !== 'Sin ciclo').map(c => (
                <option key={c} value={c}>Ciclo {c}</option>
              ))}
            </select>
          </div>

          <div className="relative w-full md:w-56">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter className="h-4 w-4 text-slate-400 dark:text-slate-500" />
            </div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:bg-white dark:focus:bg-slate-850 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors text-sm appearance-none font-medium"
            >
              <option value="all">Todas las áreas</option>
              <option value="sistemas">Ingeniería de Sistemas</option>
              <option value="estudios_generales">Estudios Generales (EG)</option>
              <option value="estudios_especificos">Estudios Específicos (EP)</option>
              <option value="electivos">Electivos (EL)</option>
              <option value="investigacion">Investigación (EI)</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner fullScreen />
      ) : (
        <div className="space-y-8">
          {cycleOrder.map(cycle => {
            const cycleCourses = coursesByCycle[cycle];
            if (!cycleCourses || cycleCourses.length === 0) return null;

            return (
              <div key={cycle} className="scroll-mt-8 bg-white dark:bg-[#131A2C] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden transition-colors duration-200">
                {/* Cabecera del Ciclo */}
                <div className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex justify-between items-center flex-wrap gap-3">
                  <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> 
                    Ciclo {cycle}
                  </h2>
                  <div className="flex items-center gap-3">
                    {cycle !== 'Sin ciclo' && cycleCourses.some(c => !isEnrolled(c.id_curso)) && (
                      <Button
                        size="sm"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm text-xs px-3.5 py-1.5 rounded-lg"
                        onClick={() => handleEnrollCycleClick(cycle, cycleCourses.filter(c => !isEnrolled(c.id_curso)))}
                        disabled={enrollingCycle === cycle}
                      >
                        {enrollingCycle === cycle ? 'Matriculando...' : 'Matricular todo el ciclo'}
                      </Button>
                    )}
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-white dark:bg-slate-900 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-800">
                      {cycleCourses.length} cursos
                    </span>
                  </div>
                </div>
                
                {/* Data Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-[#131A2C]">
                        <th className="py-3 px-6 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider w-32">Código</th>
                        <th className="py-3 px-6 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Asignatura</th>
                        <th className="py-3 px-6 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider hidden sm:table-cell">Área / Escuela</th>
                        <th className="py-3 px-6 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-center w-24">Créditos</th>
                        <th className="py-3 px-6 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-right w-36">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                      {cycleCourses.map(course => (
                        <tr key={course.id_curso} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors group">
                          <td className="py-4 px-6 align-middle">
                            <span className="font-mono text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 px-2 py-1 rounded-md">
                              {course.codigo_curso}
                            </span>
                          </td>
                          <td className="py-4 px-6 align-middle">
                            <p className="font-bold text-slate-800 dark:text-slate-200 leading-tight group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors">
                              {course.nombre_curso}
                            </p>
                          </td>
                          <td className="py-4 px-6 align-middle hidden sm:table-cell">
                            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                              {course.escuela || 'Ingeniería de Sistemas'}
                            </span>
                          </td>
                          <td className="py-4 px-6 align-middle text-center">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 text-sm font-bold border border-indigo-100 dark:border-indigo-900/30">
                              {course.creditos}
                            </span>
                          </td>
                          <td className="py-4 px-6 align-middle text-right">
                            {isEnrolled(course.id_curso) ? (
                              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-450 bg-emerald-50 dark:bg-emerald-955/20 px-2.5 py-1.5 rounded-md border border-emerald-100 dark:border-emerald-900/30">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                Inscrito
                              </span>
                            ) : (
                              <Button 
                                size="sm"
                                className="w-full sm:w-auto shadow-sm"
                                onClick={() => navigate('/inscripcion', { state: { courseId: course.id_curso } })}
                              >
                                Inscribirse
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}

          {filteredCourses.length === 0 && (
            <div className="text-center py-16 bg-white dark:bg-[#131A2C] border border-slate-200 dark:border-slate-800 border-dashed rounded-2xl">
              <Search className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">No hay resultados</h3>
              <p className="text-slate-505 dark:text-slate-400">
                No se encontraron cursos que coincidan con tu criterio de búsqueda en la tabla.
              </p>
            </div>
          )}
        </div>
      )}
      <Modal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        title="Confirmar Matrícula"
        actions={
          <>
            <Button variant="outline" onClick={() => setConfirmModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={executeEnrollCycle}
              disabled={enrollingCycle !== null}
            >
              {enrollingCycle !== null ? 'Matriculando...' : 'Confirmar Matrícula'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            ¿Estás seguro de que deseas matricularte en todos los cursos del <strong className="text-indigo-600 dark:text-indigo-400">Ciclo {cycleToEnroll}</strong>?
          </p>
          <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-105 dark:border-slate-800">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Cursos a inscribir:</p>
            <ul className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {coursesToEnrollList.map(c => (
                <li key={c.id_curso} className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex justify-between items-center">
                  <span>{c.nombre_curso}</span>
                  <span className="text-xs font-mono bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800 text-slate-500">{c.codigo_curso}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CourseListPage;
