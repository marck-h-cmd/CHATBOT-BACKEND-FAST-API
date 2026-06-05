import React, { useState, useEffect } from 'react';
import { useCourse } from '../contexts/CourseContext';
import { useNavigate, useLocation } from 'react-router-dom';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Modal from '../components/ui/Modal';
import { Calendar, Search, Filter, BookOpen, ChevronLeft, Check, AlertCircle } from 'lucide-react';

const EnrollmentPage = () => {
  const { courses, enrollments, periods, enrollInCourse, getCurrentPeriod, refreshData, loading } = useCourse();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCycle, setSelectedCycle] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollingCycle, setEnrollingCycle] = useState(null);
  const [error, setError] = useState(null);

  const currentPeriod = getCurrentPeriod();
  const [selectedPeriodId, setSelectedPeriodId] = useState(null);

  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [cycleToEnroll, setCycleToEnroll] = useState(null);
  const [coursesToEnrollList, setCoursesToEnrollList] = useState([]);

  const isEnrolled = (courseId) => {
    return enrollments.some(e => e.id_curso === courseId && e.id_periodo === selectedPeriodId);
  };

  const handleEnrollCycleClick = (cycle, courses) => {
    setCycleToEnroll(cycle);
    setCoursesToEnrollList(courses);
    setConfirmModalOpen(true);
  };

  const executeEnrollCycle = async () => {
    if (!selectedPeriodId || !cycleToEnroll) return;
    setEnrollingCycle(cycleToEnroll);
    try {
      const promises = coursesToEnrollList.map(course => 
        enrollInCourse(course.id_curso, selectedPeriodId)
      );
      await Promise.all(promises);
      await refreshData();
      setSelectedCourse(null);
      setConfirmModalOpen(false);
    } catch (err) {
      alert("Ocurrió un error al procesar la inscripción del ciclo.");
    } finally {
      setEnrollingCycle(null);
    }
  };
  const preSelectedCourseId = location.state?.courseId;

  useEffect(() => {
    if (!selectedPeriodId && periods && periods.length > 0) {
      if (currentPeriod) {
        setSelectedPeriodId(currentPeriod.id_periodo);
      } else {
        setSelectedPeriodId(periods[0].id_periodo);
      }
    }
  }, [periods, currentPeriod, selectedPeriodId]);

  const getAvailableCycles = () => {
    const cycleSet = new Set(
      courses
        .map(c => c.ciclo_referencial)
        .filter(Boolean)
    );
    return Array.from(cycleSet).sort((a, b) => (parseInt(a) || 0) - (parseInt(b) || 0));
  };

  const filteredCourses = courses.filter(course => {
    const matchesSearch = 
      course.nombre_curso.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.codigo_curso.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCycle = !selectedCycle || course.ciclo_referencial === selectedCycle;
    return matchesSearch && matchesCycle;
  });

  useEffect(() => {
    if (preSelectedCourseId) {
      setSelectedCourse(preSelectedCourseId);
      const course = courses.find(c => c.id_curso === preSelectedCourseId);
      if (course?.ciclo_referencial) {
        setSelectedCycle(course.ciclo_referencial);
      }
    }
  }, [preSelectedCourseId, courses]);

  const handleEnroll = async () => {
    if (!selectedCourse) {
      setError('Debes seleccionar un curso');
      return;
    }

    setEnrolling(true);
    setError(null);

    try {
      const result = await enrollInCourse(selectedCourse, selectedPeriodId);
      
      if (result.success) {
        navigate('/inscripcion-exitosa', {
          state: {
            enrollment: {
              id_curso: selectedCourse,
              id_periodo: selectedPeriodId,
              ...result.data
            }
          },
          replace: true
        });
      } else {
        setError(result.error?.message || 'Error al inscribirse');
      }
    } catch (err) {
      setError('Error al procesar la inscripción');
    } finally {
      setEnrolling(false);
    }
  };

  const selectedCourseData = courses.find(c => c.id_curso === selectedCourse);
  const availableCycles = getAvailableCycles();

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!periods || periods.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white dark:bg-[#131A2C] border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center shadow-sm transition-colors duration-200">
          <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-3">Períodos No Disponibles</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md mx-auto">
            No hay períodos académicos registrados en el sistema. Por favor, contacta a la administración.
          </p>
          <Button onClick={() => navigate('/cursos')}>Volver al Catálogo</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10" data-tour="student-enrollment">
      <div className="mb-8 md:flex md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">Matrícula</h1>
          <p className="text-slate-500 dark:text-slate-400">Selecciona el curso al que deseas inscribirte en el periodo seleccionado.</p>
        </div>
        <div className="mt-4 md:mt-0">
          <div className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-50 dark:bg-indigo-955/20 rounded-xl border border-indigo-100 dark:border-indigo-900/30 shadow-sm transition-colors hover:bg-indigo-100/70 dark:hover:bg-indigo-900/40">
            <Calendar className="w-4 h-4 text-indigo-700 dark:text-indigo-400" />
            <select 
              value={selectedPeriodId || ''}
              onChange={(e) => setSelectedPeriodId(Number(e.target.value))}
              className="bg-transparent text-indigo-700 dark:text-indigo-400 text-sm font-semibold focus:outline-none cursor-pointer appearance-none pr-5 py-0.5"
              style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%234338ca' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0 center', backgroundRepeat: 'no-repeat', backgroundSize: '1.2em 1.2em' }}
            >
              {periods.map(p => (
                <option key={p.id_periodo} value={p.id_periodo} className="dark:bg-slate-900 dark:text-slate-200">
                  {p.nombre} {p.es_actual ? '(Actual)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        
        {/* Columna Izquierda: Búsqueda y Filtros */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-[#131A2C] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm transition-colors duration-200">
            <h2 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <Search className="w-5 h-5 text-slate-400 dark:text-slate-500" /> Buscar Curso
            </h2>
            <div className="relative mb-6">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nombre o código..."
                className="w-full pl-9 pr-3 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm transition-colors bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-850"
              />
            </div>

            <h2 className="font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
              <Filter className="w-5 h-5 text-slate-400 dark:text-slate-500" /> Filtrar por Ciclo
            </h2>
            <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              <button
                onClick={() => setSelectedCycle(null)}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl transition-all text-sm font-medium border ${
                  !selectedCycle
                    ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/40'
                    : 'bg-white dark:bg-[#131A2C] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/50 border-transparent hover:border-slate-200 dark:hover:border-slate-800'
                }`}
              >
                Todos los ciclos
              </button>
              {availableCycles.map(cycle => (
                <button
                  key={cycle}
                  onClick={() => setSelectedCycle(cycle)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl transition-all text-sm font-medium border ${
                    selectedCycle === cycle
                      ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/40'
                      : 'bg-white dark:bg-[#131A2C] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/50 border-transparent hover:border-slate-200 dark:hover:border-slate-800'
                  }`}
                >
                  Ciclo {cycle}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Columna Derecha: Resultados y Confirmación */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white dark:bg-[#131A2C] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[500px] transition-colors duration-200">
            <div className="p-5 border-b border-slate-105 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex justify-between items-center shrink-0 flex-wrap gap-3">
              <h2 className="font-bold text-slate-808 dark:text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Cursos Disponibles {selectedCycle && `(Ciclo ${selectedCycle})`}
              </h2>
              <div className="flex items-center gap-2">
                {selectedCycle && filteredCourses.some(c => !isEnrolled(c.id_curso)) && (
                  <Button
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-1.5 shadow-sm text-xs px-3.5 py-1.5 rounded-lg"
                    onClick={() => handleEnrollCycleClick(selectedCycle, filteredCourses.filter(c => !isEnrolled(c.id_curso)))}
                    disabled={enrollingCycle === selectedCycle}
                  >
                    {enrollingCycle === selectedCycle ? 'Matriculando...' : `Matricular todo el Ciclo ${selectedCycle}`}
                  </Button>
                )}
                <span className="text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 rounded-md text-slate-500 dark:text-slate-400">
                  {filteredCourses.length} Resultados
                </span>
              </div>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-3 custom-scrollbar">
              {filteredCourses.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 space-y-3">
                  <Search className="w-10 h-10 opacity-50" />
                  <p>No se encontraron cursos con esos criterios.</p>
                </div>
              ) : (
                filteredCourses.map(course => {
                  const enrolled = isEnrolled(course.id_curso);
                  return (
                    <div
                      key={course.id_curso}
                      onClick={() => !enrolled && setSelectedCourse(course.id_curso)}
                      className={`p-4 border-2 rounded-xl transition-all ${
                        enrolled
                          ? 'border-slate-105 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/10 cursor-not-allowed opacity-70'
                          : selectedCourse === course.id_curso
                            ? 'border-indigo-500 dark:border-indigo-550 bg-indigo-50/50 dark:bg-indigo-955/20 shadow-sm cursor-pointer'
                            : 'border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900/40 hover:border-indigo-300 dark:hover:border-indigo-800 cursor-pointer'
                      }`}
                    >
                      <div className="flex justify-between items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-xs font-semibold tracking-wider text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded-md">
                              {course.codigo_curso}
                            </span>
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                              Ciclo {course.ciclo_referencial}
                            </span>
                          </div>
                          <p className="font-bold text-slate-800 dark:text-slate-200">{course.nombre_curso}</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{course.escuela}</p>
                        </div>
                        
                        <div className="shrink-0 flex flex-col items-end gap-2">
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 px-2.5 py-1 rounded-md border border-transparent dark:border-slate-800">
                            {course.creditos} crd.
                          </span>
                          {enrolled ? (
                            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-455 bg-emerald-50 dark:bg-emerald-955/20 px-2.5 py-1 rounded border border-emerald-100 dark:border-emerald-900/30">
                              Matriculado
                            </span>
                          ) : (
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-colors ${
                              selectedCourse === course.id_curso ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900'
                            }`}>
                              {selectedCourse === course.id_curso && <Check className="w-3.5 h-3.5 text-white" />}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Confirmación */}
          {selectedCourseData ? (
            <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 rounded-2xl p-6 shadow-sm transition-colors duration-200">
              <h3 className="font-bold text-emerald-900 dark:text-emerald-400 mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" /> Curso Seleccionado para Matrícula
              </h3>
              
              <div className="bg-white dark:bg-slate-900 rounded-xl p-4 mb-5 border border-emerald-100 dark:border-emerald-900/20 shadow-sm transition-colors duration-200">
                <p className="font-bold text-slate-800 dark:text-white text-lg mb-1">{selectedCourseData.nombre_curso}</p>
                <div className="flex flex-wrap gap-2 text-sm text-slate-650 dark:text-slate-400">
                  <span className="bg-slate-50 dark:bg-slate-950 px-2 py-1 rounded border border-slate-100 dark:border-slate-800">{selectedCourseData.codigo_curso}</span>
                  <span className="bg-slate-50 dark:bg-slate-950 px-2 py-1 rounded border border-slate-100 dark:border-slate-800">{selectedCourseData.creditos} créditos</span>
                  <span className="bg-slate-50 dark:bg-slate-950 px-2 py-1 rounded border border-slate-100 dark:border-slate-800">{selectedCourseData.escuela}</span>
                </div>
              </div>

              {error && (
                <div className="mb-5 p-3.5 bg-red-50 dark:bg-red-955/20 border border-red-200 dark:border-red-900/30 rounded-xl text-sm font-medium text-red-700 dark:text-red-400 flex gap-2 items-center">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="outline" onClick={() => navigate('/cursos')} className="flex-1 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-705 dark:text-slate-300 rounded-xl font-semibold text-sm transition-colors flex justify-center items-center gap-2">
                  <ChevronLeft className="w-4 h-4" /> Cancelar
                </Button>
                <Button onClick={handleEnroll} disabled={enrolling} loading={enrolling} className="flex-1 bg-emerald-600 dark:bg-emerald-650 hover:bg-emerald-700 dark:hover:bg-emerald-750 text-white border-transparent">
                  {enrolling ? 'Procesando Matrícula...' : 'Confirmar Matrícula'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-[#131A2C] border border-slate-200 dark:border-slate-800 border-dashed rounded-2xl p-8 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center gap-2 transition-colors duration-200">
              <BookOpen className="w-8 h-8 text-slate-300 dark:text-slate-655" />
              <p>Selecciona un curso de la lista para continuar con la inscripción.</p>
            </div>
          )}
        </div>

      </div>
      <Modal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        title="Confirmar Matrícula Masiva"
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

// Simple icon missing import
const CheckCircle = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

export default EnrollmentPage;
