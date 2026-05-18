import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCourse } from '../contexts/CourseContext';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { BookOpen, Search, CheckCircle2, CircleDashed, ChevronRight, PlusCircle, LayoutGrid, MessageSquare, HelpCircle, Edit3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as contextAPI from '../api/context';

const MyCoursesPage = () => {
  const { enrollments, loading, refreshData } = useCourse();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedContextId, setSelectedContextId] = useState(null);
  const [notasForm, setNotasForm] = useState({ pu1: '', pu2: '', pu3: '', nota_final: '' });

  const handleOpenModal = (enrollment) => {
    setSelectedContextId(enrollment.id_contexto);
    setNotasForm({
      pu1: enrollment.notas?.pu1 ?? '',
      pu2: enrollment.notas?.pu2 ?? '',
      pu3: enrollment.notas?.pu3 ?? '',
      nota_final: enrollment.notas?.nota_final ?? ''
    });
    setModalOpen(true);
  };

  const handleSaveNotas = async () => {
    try {
      // Parsear a números, si está vacío enviar null
      const parseVal = (val) => val === '' ? null : parseFloat(val);
      const payload = {
        pu1: parseVal(notasForm.pu1),
        pu2: parseVal(notasForm.pu2),
        pu3: parseVal(notasForm.pu3),
        nota_final: parseVal(notasForm.nota_final)
      };
      
      await contextAPI.updateGrades(selectedContextId, payload);
      setModalOpen(false);
      refreshData();
    } catch (err) {
      alert("Error al actualizar las notas.");
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  const filteredEnrollments = enrollments.filter(enrollment => 
    enrollment.curso.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (enrollment.codigo_curso && enrollment.codigo_curso.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10" data-tour="student-mycourses">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Mis Cursos</h1>
          <p className="text-slate-500 mt-2">Gestiona tus matrículas y accede al asistente de cada curso.</p>
        </div>
        <div className="flex gap-3">
          <Link to="/cursos">
            <Button variant="outline" className="flex items-center gap-2">
              <LayoutGrid className="w-4 h-4" /> Catálogo
            </Button>
          </Link>
          <Link to="/inscripcion">
            <Button className="flex items-center gap-2">
              <PlusCircle className="w-4 h-4" /> Inscribir Curso
            </Button>
          </Link>
        </div>
      </div>

      {enrollments.length === 0 ? (
        <div className="border border-slate-200 rounded-2xl p-12 text-center bg-white shadow-sm">
          <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-indigo-300" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            No estás inscrito en ningún curso
          </h2>
          <p className="text-slate-500 max-w-md mx-auto mb-8">
            Inscríbete en cursos de tu periodo actual para poder usar el asistente inteligente con el contexto de tu sílabo.
          </p>
          <Link to="/cursos">
            <Button className="px-8 py-3">Explorar Catálogo de Cursos</Button>
          </Link>
        </div>
      ) : (
        <>
          {/* Barra de Filtros */}
          <div className="mb-6 relative max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar por nombre o código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
            />
          </div>

          {filteredEnrollments.length === 0 ? (
            <div className="text-center py-12 border border-slate-200 border-dashed rounded-xl bg-slate-50">
              <p className="text-slate-500">No se encontraron cursos que coincidan con tu búsqueda.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEnrollments.map((enrollment) => (
                <div key={enrollment.id_contexto} className="flex flex-col bg-white border border-slate-200 rounded-2xl hover:border-indigo-300 hover:shadow-md transition-all duration-200 overflow-hidden">
                  <div className="p-6 flex-1">
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-xs font-semibold tracking-wider text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                        {enrollment.codigo_curso || 'N/A'}
                      </span>
                      {/* Estado Sílabo Badge */}
                      {enrollment.silabo_validado ? (
                         <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100/50">
                           <CheckCircle2 className="w-3.5 h-3.5" /> Sílabo validado
                         </span>
                      ) : (
                         <span className="flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-100/50">
                           <CircleDashed className="w-3.5 h-3.5" /> Sílabo pendiente
                         </span>
                      )}
                    </div>
                    
                    <h3 className="text-lg font-bold text-slate-800 mb-2 leading-tight">
                      {enrollment.curso}
                    </h3>
                    <p className="text-sm text-slate-500 mb-4 font-medium">{enrollment.periodo}</p>
                    
                    {/* Estado Verificación Opcional */}
                    {enrollment.estado_verificacion && enrollment.estado_verificacion !== 'APROBADO' && enrollment.estado_verificacion !== 'OFICIAL' && (
                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <span className={`text-xs px-2.5 py-1 rounded-md font-medium border ${
                          enrollment.estado_verificacion === 'PENDIENTE_CONFIRMACION' 
                            ? 'bg-slate-50 text-slate-600 border-slate-200' 
                            : 'bg-red-50 text-red-700 border-red-100'
                        }`}>
                          Estado matrícula: {enrollment.estado_verificacion?.replace(/_/g, ' ') || 'Sin estado'}
                        </span>
                      </div>
                    )}
                    
                    {/* Visualización de notas */}
                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex gap-2 text-xs font-medium text-slate-600">
                        <span className="bg-slate-50 px-2 py-1 rounded border border-slate-100">PU1: {enrollment.notas?.pu1 ?? '-'}</span>
                        <span className="bg-slate-50 px-2 py-1 rounded border border-slate-100">PU2: {enrollment.notas?.pu2 ?? '-'}</span>
                        <span className="bg-slate-50 px-2 py-1 rounded border border-slate-100">PU3: {enrollment.notas?.pu3 ?? '-'}</span>
                      </div>
                      {enrollment.notas?.nota_final != null && (
                        <span className="bg-indigo-50 text-indigo-700 font-bold px-2 py-1 rounded border border-indigo-100 text-xs">
                          FINAL: {enrollment.notas.nota_final}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col gap-2">
                    <Link to={`/chat?contexto=${enrollment.id_contexto}`}>
                      <Button className="w-full flex items-center justify-center gap-2 py-2">
                        <MessageSquare className="w-4 h-4" /> Consultar Asistente
                      </Button>
                    </Link>
                    {enrollment.estado_verificacion === 'PENDIENTE_CONFIRMACION' && (
                      <Link to="/syllabus">
                        <Button variant="outline" className="w-full py-2">
                          Gestionar Sílabo
                        </Button>
                      </Link>
                    )}
                    <Button variant="outline" onClick={() => handleOpenModal(enrollment)} className="w-full py-2 flex items-center justify-center gap-2">
                      <Edit3 className="w-4 h-4" /> Ingresar Notas
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal para ingresar notas */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 relative overflow-hidden"
            >
              <h3 className="text-xl font-bold text-slate-800 mb-2">Ingresar Notas</h3>
              <p className="text-slate-600 text-sm mb-6">
                Ingresa tus notas (PU1, PU2, PU3 y Nota Final) para este curso. El asistente usará estos datos para simular promedios.
              </p>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">PU1</label>
                  <input 
                    type="number" step="0.1" min="0" max="20"
                    value={notasForm.pu1} 
                    onChange={(e) => setNotasForm({...notasForm, pu1: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">PU2</label>
                  <input 
                    type="number" step="0.1" min="0" max="20"
                    value={notasForm.pu2} 
                    onChange={(e) => setNotasForm({...notasForm, pu2: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">PU3</label>
                  <input 
                    type="number" step="0.1" min="0" max="20"
                    value={notasForm.pu3} 
                    onChange={(e) => setNotasForm({...notasForm, pu3: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nota Final</label>
                  <input 
                    type="number" step="0.1" min="0" max="20"
                    value={notasForm.nota_final} 
                    onChange={(e) => setNotasForm({...notasForm, nota_final: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={handleSaveNotas}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Guardar
                </button>
                <button 
                  onClick={() => setModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MyCoursesPage;
