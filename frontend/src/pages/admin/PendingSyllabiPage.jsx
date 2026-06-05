import React, { useState, useEffect } from 'react';
import * as syllabusAPI from '../../api/syllabus';
import { useCourse } from '../../contexts/CourseContext';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import Pagination from '../../components/ui/Pagination';
import { Search, RefreshCw, CheckCircle2, XCircle, AlertCircle, FileText, Calendar, Clock, ChevronRight, ExternalLink } from 'lucide-react';

const PendingSyllabiPage = () => {
  const [syllabi, setSyllabi] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSyllabus, setSelectedSyllabus] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [comentario, setComentario] = useState('');
  const [action, setAction] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [newPeriodId, setNewPeriodId] = useState('');
  const [viewingSyllabus, setViewingSyllabus] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const itemsPerPage = 10;

  const { periods } = useCourse();

  const loadPendingSyllabi = async () => {
    setLoading(true);
    try {
      const data = await syllabusAPI.getPendingSyllabi();
      setSyllabi(data);
    } catch (error) {
      console.error('Error al cargar sílabos pendientes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPendingSyllabi();
  }, []);

  const handleApprove = async () => {
    try {
      await syllabusAPI.approveSyllabus(
        selectedSyllabus.id_silabo, 
        comentario, 
        newPeriodId ? parseInt(newPeriodId) : null
      );
      setIsModalOpen(false);
      setComentario('');
      setNewPeriodId('');
      setSelectedSyllabus(null);
      setAction(null);
      loadPendingSyllabi();
    } catch (error) {
      alert('Error al aprobar sílabo: ' + error.message);
    }
  };

  const handleReject = async () => {
    try {
      await syllabusAPI.rejectSyllabus(selectedSyllabus.id_silabo, comentario);
      setIsModalOpen(false);
      setComentario('');
      setSelectedSyllabus(null);
      setAction(null);
      loadPendingSyllabi();
    } catch (error) {
      alert('Error al rechazar sílabo: ' + error.message);
    }
  };

  const openApprovalModal = (syllabus) => {
    setSelectedSyllabus(syllabus);
    setAction('approve');
    setComentario('');
    setNewPeriodId(''); // Por defecto no corregir
    setIsModalOpen(true);
  };

  const openRejectionModal = (syllabus) => {
    setSelectedSyllabus(syllabus);
    setAction('reject');
    setComentario('');
    setIsModalOpen(true);
  };

  const openDetailModal = async (idSilabo) => {
    setLoading(true);
    try {
      const detail = await syllabusAPI.getSyllabusFullDetail(idSilabo);
      setViewingSyllabus(detail);
      setIsDetailModalOpen(true);
    } catch (error) {
      alert('Error al cargar detalle: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 70) return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30';
    if (score >= 40) return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30';
    return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/30';
  };

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedSyllabi = syllabi.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Search className="w-6 h-6 text-indigo-650 dark:text-indigo-400" /> Validación de Sílabos
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Revisa y aprueba los sílabos subidos por estudiantes que requieren validación manual.</p>
        </div>
        <Button onClick={loadPendingSyllabi} variant="outline" className="flex items-center gap-2 shadow-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
          <RefreshCw className="w-4 h-4" /> Recargar
        </Button>
      </div>

      {syllabi.length === 0 ? (
        <div className="bg-white dark:bg-[#131A2C] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-card p-16 text-center transition-colors duration-200">
          <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-950/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 dark:text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Bandeja de Entrada Limpia</h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            No hay sílabos pendientes de validación en este momento.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {paginatedSyllabi.map((syllabus) => (
            <div key={syllabus.id_silabo} className="bg-white dark:bg-[#131A2C] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-card hover:shadow-card-hover transition-all flex flex-col md:flex-row md:items-start justify-between gap-6 group">
              <div className="flex-1 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-[10px] uppercase tracking-wider bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-800 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> {syllabus.codigo_curso || 'N/A'}
                  </span>
                  <span className="font-bold text-[10px] uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded-md border border-indigo-100 dark:border-indigo-900/30 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> {syllabus.codigo_periodo || 'N/A'}
                  </span>
                  <span className={`px-2 py-1 text-[10px] uppercase tracking-wider font-bold rounded-md border ${getScoreColor(syllabus.puntaje_confianza || 0)}`}>
                    Confianza IA: {syllabus.puntaje_confianza || 0}%
                  </span>
                </div>
                
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1 group-hover:text-indigo-650 dark:group-hover:text-indigo-400 transition-colors">
                      {syllabus.nombre_curso || 'Curso sin nombre'}
                    </h3>
                    <div className="flex flex-wrap items-center gap-y-2 gap-x-5 text-xs text-slate-500 dark:text-slate-405">
                      <p className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-400 dark:text-slate-500">SUBIDO POR:</span> 
                        <span className="font-bold text-slate-700 dark:text-slate-300">{syllabus.usuario_nombre}</span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" /> 
                        {syllabus.fecha_subida ? new Date(syllabus.fecha_subida).toLocaleString('es-PE') : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      onClick={() => openDetailModal(syllabus.id_silabo)}
                      className="rounded-xl border-slate-200 dark:border-slate-800 text-indigo-650 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-955/20 px-3 py-1 text-xs flex items-center gap-2 shadow-sm bg-white dark:bg-slate-900"
                    >
                      <Search className="w-3.5 h-3.5" /> Inspeccionar Texto
                    </Button>
                    
                    {syllabus.ruta_pdf && (
                      <a 
                        href={syllabus.ruta_pdf} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-1 text-xs font-bold text-emerald-650 dark:text-emerald-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-955/20 transition-colors shadow-sm"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Ver PDF Original
                      </a>
                    )}
                  </div>
                </div>

                {/* Alertas dinámicas del backend */}
                {syllabus.advertencias && syllabus.advertencias.length > 0 && (
                  <div className="bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200 dark:border-amber-900/30 rounded-2xl p-4 mt-2">
                    <p className="text-xs text-amber-800 dark:text-amber-400 font-bold mb-2 flex items-center gap-2 uppercase tracking-wide">
                      <AlertCircle className="w-4 h-4 shrink-0" /> Hallazgos del análisis
                    </p>
                    <ul className="space-y-1.5">
                      {syllabus.advertencias.map((adv, idx) => (
                        <li key={idx} className="text-xs text-amber-700 dark:text-amber-305 flex items-start gap-2">
                          <ChevronRight className="w-3 h-3 mt-0.5 shrink-0" /> {adv}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="flex flex-row md:flex-col gap-3 shrink-0">
                <Button
                  onClick={() => openApprovalModal(syllabus)}
                  className="bg-slate-900 hover:bg-black dark:bg-slate-800 dark:hover:bg-slate-700 text-white px-6 py-2.5 rounded-2xl flex-1 md:flex-none justify-center gap-2 shadow-sm transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" /> Aprobar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => openRejectionModal(syllabus)}
                  className="border-slate-200 dark:border-slate-800 text-slate-655 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl flex-1 md:flex-none justify-center gap-2 transition-all bg-white dark:bg-slate-900"
                >
                  <XCircle className="w-4 h-4" /> Rechazar
                </Button>
              </div>
            </div>
          ))}
          {syllabi.length > itemsPerPage && (
            <div className="mt-6">
              <Pagination
                currentPage={currentPage}
                totalItems={syllabi.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      )}

      {/* Modal de Inspección Detallada */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="Inspección de Contenido Extraído"
        maxWidth="max-w-4xl"
      >
        {viewingSyllabus && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Curso Extraído</p>
                <p className="font-bold text-slate-805 dark:text-slate-205">{viewingSyllabus.nombre_curso}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Periodo Detectado</p>
                <p className="font-bold text-slate-805 dark:text-slate-205">{viewingSyllabus.periodo}</p>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-500" /> Texto del Documento (Primeras 15,000 caracteres)
              </p>
              <div className="bg-slate-900 text-slate-300 p-6 rounded-2xl text-[13px] font-mono leading-relaxed h-[400px] overflow-y-auto shadow-inner border border-slate-805">
                {viewingSyllabus.texto_extraido ? (
                   <pre className="whitespace-pre-wrap">{viewingSyllabus.texto_extraido}</pre>
                ) : (
                  <p className="text-slate-500 italic">No hay texto extraído disponible.</p>
                )}
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-3 italic text-center">
                Este es el texto tal cual lo leyó la IA. Verifica aquí el año y ciclo si tienes dudas.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <Button 
                onClick={() => setIsDetailModalOpen(false)}
                className="bg-slate-900 hover:bg-black dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl px-8"
              >
                Cerrar Inspección
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal de Acción */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={action === 'approve' ? 'Validación y Aprobación' : 'Rechazo de Documento'}
      >
        {selectedSyllabus && (
          <div className="space-y-6">
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-805 rounded-2xl p-5">
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">CURSO SELECCIONADO</p>
              <p className="font-bold text-slate-800 dark:text-white text-lg leading-tight">{selectedSyllabus.nombre_curso}</p>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs font-bold px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-600 dark:text-slate-300">
                   {selectedSyllabus.codigo_periodo}
                </span>
                <span className="text-xs font-bold px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-600 dark:text-slate-300">
                   {selectedSyllabus.codigo_curso}
                </span>
              </div>
            </div>

            {action === 'approve' && (
              <div className="space-y-4">
                <div className="p-4 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl">
                  <label className="block text-xs font-bold text-indigo-750 dark:text-indigo-400 uppercase tracking-wider mb-2">
                    ¿Corregir Periodo Académico?
                  </label>
                  <select
                    value={newPeriodId}
                    onChange={(e) => setNewPeriodId(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/40 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none text-slate-800 dark:text-slate-100"
                  >
                    <option value="">Mantener original ({selectedSyllabus.codigo_periodo})</option>
                    {periods.map(p => (
                      <option key={p.id_periodo} value={p.id_periodo}>
                        Cambiar a: {p.nombre}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-2 font-medium">
                    Si el PDF dice "2025-II", selecciona 2025-II aquí. El sistema actualizará automáticamente la matrícula del alumno.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {action === 'reject' ? 'Motivo del Rechazo' : 'Comentarios Adicionales (Opcional)'}
              </label>
              <textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm min-h-[100px] resize-none"
                placeholder={action === 'reject' ? 'Indica por qué el sílabo no es válido para que el alumno lo corrija...' : 'Notas sobre la validación manual...'}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button 
                variant="outline" 
                onClick={() => setIsModalOpen(false)}
                className="flex-1 rounded-2xl border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold bg-white dark:bg-slate-900"
              >
                Cancelar
              </Button>
              <Button
                onClick={action === 'approve' ? handleApprove : handleReject}
                className={`flex-1 rounded-2xl text-white font-bold ${action === 'approve' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-md dark:shadow-none shadow-indigo-200' : 'bg-red-600 hover:bg-red-700 shadow-md dark:shadow-none shadow-red-200'}`}
              >
                {action === 'approve' ? 'Aprobar y Sincronizar' : 'Confirmar Rechazo'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PendingSyllabiPage;
