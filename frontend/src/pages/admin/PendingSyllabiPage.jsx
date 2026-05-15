import React, { useState, useEffect } from 'react';
import * as syllabusAPI from '../../api/syllabus';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import { Search, RefreshCw, CheckCircle2, XCircle, AlertCircle, FileText, Calendar, Clock } from 'lucide-react';

const PendingSyllabiPage = () => {
  const [syllabi, setSyllabi] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSyllabus, setSelectedSyllabus] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [comentario, setComentario] = useState('');
  const [action, setAction] = useState(null);

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
      await syllabusAPI.approveSyllabus(selectedSyllabus.id_silabo, comentario);
      setIsModalOpen(false);
      setComentario('');
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
    setIsModalOpen(true);
  };

  const openRejectionModal = (syllabus) => {
    setSelectedSyllabus(syllabus);
    setAction('reject');
    setComentario('');
    setIsModalOpen(true);
  };

  const getScoreColor = (score) => {
    if (score >= 70) return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    if (score >= 40) return 'text-amber-600 bg-amber-50 border-amber-100';
    return 'text-red-600 bg-red-50 border-red-100';
  };

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Search className="w-6 h-6 text-indigo-600" /> Validación de Sílabos
          </h1>
          <p className="text-slate-500 mt-1">Revisa y aprueba los sílabos subidos por estudiantes que la IA no pudo validar automáticamente.</p>
        </div>
        <Button onClick={loadPendingSyllabi} variant="outline" className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Recargar
        </Button>
      </div>

      {syllabi.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-12 text-center">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Bandeja Limpia</h2>
          <p className="text-slate-500 max-w-md mx-auto">
            No hay sílabos pendientes de validación. La IA está procesando eficientemente las subidas automáticas o no hay nueva actividad.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {syllabi.map((syllabus) => (
            <div key={syllabus.id_silabo} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:border-indigo-200 transition-colors flex flex-col md:flex-row md:items-start justify-between gap-6">
              <div className="flex-1 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-semibold bg-slate-100 text-slate-700 px-2 py-1 rounded border border-slate-200 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> {syllabus.codigo_curso || 'N/A'}
                  </span>
                  <span className="font-mono text-xs font-semibold bg-slate-100 text-slate-700 px-2 py-1 rounded border border-slate-200 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> {syllabus.codigo_periodo || 'N/A'}
                  </span>
                  <span className={`px-2.5 py-1 text-xs font-bold rounded border ${getScoreColor(syllabus.puntaje_confianza || 0)}`}>
                    Confianza IA: {syllabus.puntaje_confianza || 0}%
                  </span>
                </div>
                
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1">
                    {syllabus.nombre_curso || 'Curso sin nombre'}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <p>Subido por: <span className="font-medium text-slate-700">{syllabus.usuario_nombre || 'Usuario'}</span> ({syllabus.codigo_universitario || 'N/A'})</p>
                    <p className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {syllabus.fecha_subida ? new Date(syllabus.fecha_subida).toLocaleString() : 'N/A'}</p>
                  </div>
                </div>

                {/* Alertas */}
                {(syllabus.fiabilidad || (syllabus.advertencias && syllabus.advertencias.length > 0)) && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-2">
                    {syllabus.fiabilidad && (
                      <p className="text-sm text-amber-800 font-medium mb-2 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" /> {syllabus.fiabilidad}
                      </p>
                    )}
                    {syllabus.advertencias && syllabus.advertencias.length > 0 && (
                      <ul className="list-disc list-inside text-xs text-amber-700 space-y-1">
                        {syllabus.advertencias.map((adv, idx) => (
                          <li key={idx}>{adv}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-row md:flex-col gap-3 shrink-0">
                <Button
                  onClick={() => openApprovalModal(syllabus)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1 md:flex-none justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" /> Aprobar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => openRejectionModal(syllabus)}
                  className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 flex-1 md:flex-none justify-center gap-2"
                >
                  <XCircle className="w-4 h-4" /> Rechazar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={action === 'approve' ? 'Aprobar Sílabo y Sincronizar' : 'Rechazar Sílabo'}
      >
        {selectedSyllabus && (
          <div className="space-y-6">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <p className="font-bold text-slate-800 mb-1">{selectedSyllabus.nombre_curso || 'Curso sin nombre'}</p>
              <p className="text-sm text-slate-500 font-medium">Confianza IA al extraer fórmulas: <span className={selectedSyllabus.puntaje_confianza >= 70 ? 'text-emerald-600' : 'text-amber-600'}>{selectedSyllabus.puntaje_confianza || 0}%</span></p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Comentarios {action === 'reject' ? '(Opcional)' : ''}
              </label>
              <textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
                rows={3}
                placeholder={action === 'reject' ? 'Motivo por el cual este sílabo no es válido...' : 'Notas para el registro interno (opcional)...'}
              />
              {action === 'approve' && (
                <p className="text-xs text-slate-500 mt-2">
                  Al aprobar, este sílabo pasará a estado oficial para este estudiante y para cualquier otro estudiante en el mismo curso.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={action === 'approve' ? handleApprove : handleReject}
                className={action === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}
              >
                {action === 'approve' ? 'Confirmar Aprobación' : 'Rechazar Definitivamente'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PendingSyllabiPage;
