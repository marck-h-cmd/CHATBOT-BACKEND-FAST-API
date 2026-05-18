import React, { useState, useEffect } from 'react';
import { useCourse } from '../contexts/CourseContext';
import { useNavigate, useLocation } from 'react-router-dom';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { Calendar, Search, Filter, BookOpen, ChevronLeft, Check, AlertCircle } from 'lucide-react';

const EnrollmentPage = () => {
  const { courses, periods, enrollInCourse, getCurrentPeriod, loading } = useCourse();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCycle, setSelectedCycle] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState(null);

  const currentPeriod = getCurrentPeriod();
  const [selectedPeriodId, setSelectedPeriodId] = useState(null);
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
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
          <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-slate-800 mb-3">Períodos No Disponibles</h2>
          <p className="text-slate-500 mb-8 max-w-md mx-auto">
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
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">Matrícula</h1>
          <p className="text-slate-500">Selecciona el curso al que deseas inscribirte en el periodo seleccionado.</p>
        </div>
        <div className="mt-4 md:mt-0">
          <div className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-50 rounded-xl border border-indigo-100 shadow-sm transition-colors hover:bg-indigo-100/70">
            <Calendar className="w-4 h-4 text-indigo-700" />
            <select 
              value={selectedPeriodId || ''}
              onChange={(e) => setSelectedPeriodId(Number(e.target.value))}
              className="bg-transparent text-indigo-700 text-sm font-semibold focus:outline-none cursor-pointer appearance-none pr-5 py-0.5"
              style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%234338ca' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0 center', backgroundRepeat: 'no-repeat', backgroundSize: '1.2em 1.2em' }}
            >
              {periods.map(p => (
                <option key={p.id_periodo} value={p.id_periodo}>
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
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Search className="w-5 h-5 text-slate-400" /> Buscar Curso
            </h2>
            <div className="relative mb-6">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nombre o código..."
                className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm transition-colors bg-slate-50 focus:bg-white"
              />
            </div>

            <h2 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Filter className="w-5 h-5 text-slate-400" /> Filtrar por Ciclo
            </h2>
            <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              <button
                onClick={() => setSelectedCycle(null)}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl transition-all text-sm font-medium ${
                  !selectedCycle
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-200'
                }`}
              >
                Todos los ciclos
              </button>
              {availableCycles.map(cycle => (
                <button
                  key={cycle}
                  onClick={() => setSelectedCycle(cycle)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl transition-all text-sm font-medium ${
                    selectedCycle === cycle
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      : 'bg-white text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-200'
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
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[500px]">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                Cursos Disponibles
              </h2>
              <span className="text-xs font-semibold bg-white border border-slate-200 px-2.5 py-1 rounded-md text-slate-500">
                {filteredCourses.length} Resultados
              </span>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-3 custom-scrollbar">
              {filteredCourses.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3">
                  <Search className="w-10 h-10 opacity-50" />
                  <p>No se encontraron cursos con esos criterios.</p>
                </div>
              ) : (
                filteredCourses.map(course => (
                  <div
                    key={course.id_curso}
                    onClick={() => setSelectedCourse(course.id_curso)}
                    className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      selectedCourse === course.id_curso
                        ? 'border-indigo-500 bg-indigo-50/50 shadow-sm'
                        : 'border-slate-100 bg-white hover:border-indigo-300'
                    }`}
                  >
                    <div className="flex justify-between items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-xs font-semibold tracking-wider text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                            {course.codigo_curso}
                          </span>
                          <span className="text-xs font-medium text-slate-500">
                            Ciclo {course.ciclo_referencial}
                          </span>
                        </div>
                        <p className="font-bold text-slate-800">{course.nombre_curso}</p>
                        <p className="text-sm text-slate-500 mt-0.5">{course.escuela}</p>
                      </div>
                      
                      <div className="shrink-0 flex flex-col items-end gap-2">
                        <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
                          {course.creditos} crd.
                        </span>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-colors ${
                          selectedCourse === course.id_curso ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white'
                        }`}>
                          {selectedCourse === course.id_curso && <Check className="w-3.5 h-3.5 text-white" />}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Confirmación */}
          {selectedCourseData ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-emerald-900 mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" /> Curso Seleccionado para Matrícula
              </h3>
              
              <div className="bg-white rounded-xl p-4 mb-5 border border-emerald-100 shadow-sm">
                <p className="font-bold text-slate-800 text-lg mb-1">{selectedCourseData.nombre_curso}</p>
                <div className="flex flex-wrap gap-2 text-sm text-slate-600">
                  <span className="bg-slate-50 px-2 py-1 rounded border border-slate-100">{selectedCourseData.codigo_curso}</span>
                  <span className="bg-slate-50 px-2 py-1 rounded border border-slate-100">{selectedCourseData.creditos} créditos</span>
                  <span className="bg-slate-50 px-2 py-1 rounded border border-slate-100">{selectedCourseData.escuela}</span>
                </div>
              </div>

              {error && (
                <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm font-medium text-red-700 flex gap-2 items-center">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="outline" onClick={() => navigate('/cursos')} className="flex-1 bg-white flex justify-center items-center gap-2">
                  <ChevronLeft className="w-4 h-4" /> Cancelar
                </Button>
                <Button onClick={handleEnroll} disabled={enrolling} loading={enrolling} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white border-transparent">
                  {enrolling ? 'Procesando Matrícula...' : 'Confirmar Matrícula'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 border-dashed rounded-2xl p-8 text-center text-slate-500 flex flex-col items-center gap-2">
              <BookOpen className="w-8 h-8 text-slate-300" />
              <p>Selecciona un curso de la lista para continuar con la inscripción.</p>
            </div>
          )}
        </div>

      </div>
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
