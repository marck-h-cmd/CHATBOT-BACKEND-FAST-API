import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Filter, CheckCircle2, User, Clock, FileText, Check, X, RefreshCw, MessageSquare, ShieldAlert } from 'lucide-react';
import * as servicesAPI from '../../api/service-desk';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Pagination from '../../components/ui/Pagination';

const IncidentsManagementPage = () => {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal State
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [recomendacion, setRecomendacion] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  useEffect(() => {
    loadIncidents();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  const loadIncidents = async () => {
    setLoading(true);
    try {
      const data = await servicesAPI.getIncidents?.();
      setIncidents(data || []);
    } catch (error) {
      console.error('Error al cargar incidentes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (incident) => {
    setSelectedIncident(incident);
    setRecomendacion(incident.recomendacion || '');
    setModalError('');
  };

  const handleCloseModal = () => {
    setSelectedIncident(null);
    setRecomendacion('');
    setModalError('');
  };

  const handleSubmitResolution = async (e) => {
    e.preventDefault();
    if (!recomendacion.trim()) {
      setModalError('Debe ingresar una recomendación o plan de acción para el estudiante.');
      return;
    }

    setSubmitting(true);
    setModalError('');

    try {
      const updatedIncident = await servicesAPI.updateIncident(selectedIncident.id, {
        recomendacion: recomendacion.trim(),
        resuelto: true,
        fecha_resolucion: new Date().toISOString()
      });

      setIncidents(prevIncidents => 
        prevIncidents.map(inc => inc.id === selectedIncident.id ? updatedIncident : inc)
      );
      handleCloseModal();
    } catch (err) {
      console.error('Error al actualizar incidente:', err);
      setModalError(err.response?.data?.detail || 'Ocurrió un error al intentar solucionar el incidente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner fullScreen />;

  const filteredIncidents = filter === 'all' 
    ? incidents 
    : incidents.filter(i => {
        const isResuelto = i.estado === 'RESUELTO';
        if(filter === 'abierto') return !isResuelto;
        if(filter === 'resuelto') return isResuelto;
        return true;
      });

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedIncidents = filteredIncidents.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="p-2 bg-amber-100 text-amber-700 rounded-xl shadow-inner">
              <AlertTriangle className="w-6 h-6" />
            </span>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Prevención de Riesgo Académico</h1>
          </div>
          <p className="text-slate-500">
            Monitoreo y gestión de incidentes de rendimiento estudiantil detectados por el sistema de evaluación.
          </p>
        </div>
        <button
          onClick={loadIncidents}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold shadow-sm transition-colors self-start md:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-wrap gap-2 items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-semibold text-slate-600 mr-2">Filtros:</span>
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-all ${filter === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              Todos ({incidents.length})
            </button>
            <button
              onClick={() => setFilter('abierto')}
              className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-all ${filter === 'abierto' ? 'bg-red-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              Abiertos
            </button>
            <button
              onClick={() => setFilter('resuelto')}
              className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-all ${filter === 'resuelto' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              Resueltos
            </button>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider font-semibold text-slate-500">
                <th className="px-6 py-4 whitespace-nowrap">ID Incidente</th>
                <th className="px-6 py-4 whitespace-nowrap">Estudiante Afectado</th>
                <th className="px-6 py-4 whitespace-nowrap">Nivel de Riesgo</th>
                <th className="px-6 py-4 whitespace-nowrap">Estado</th>
                <th className="px-6 py-4 whitespace-nowrap">Fecha de Detección</th>
                <th className="px-6 py-4 whitespace-nowrap text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredIncidents.length > 0 ? (
                paginatedIncidents.map(incident => {
                  const isResuelto = incident.estado === 'RESUELTO';
                  return (
                    <tr key={incident.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono text-xs font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200">
                          INC-{String(incident.id).padStart(4, '0')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold text-sm border border-indigo-100 shrink-0">
                            <User className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 leading-snug">{incident.usuario_nombre}</p>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">Cód: {incident.codigo_universitario}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-bold rounded-lg border ${
                          incident.severidad === 'ALTA' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {incident.severidad === 'ALTA' ? 'Riesgo Crítico' : 'Riesgo Moderado'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isResuelto ? (
                          <span className="px-2.5 py-1 inline-flex items-center gap-1 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5"/> Intervenido
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 inline-flex items-center gap-1 text-xs font-bold rounded-lg bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                            <AlertTriangle className="w-3.5 h-3.5"/> Pendiente
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-slate-600 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {incident.fecha_creacion ? new Date(incident.cache_creacion || incident.fecha_creacion).toLocaleDateString('es-ES', { dateStyle: 'medium' }) : 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => handleOpenModal(incident)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 ml-auto transition-all shadow-sm ${
                            isResuelto 
                              ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20'
                          }`}
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          {isResuelto ? 'Ver Intervención' : 'Solucionar'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-16 text-center text-slate-500">
                    <AlertTriangle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="font-medium text-slate-600">No se encontraron incidentes académicos con los filtros actuales.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {filteredIncidents.length > 0 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/50">
            <Pagination
              currentPage={currentPage}
              totalItems={filteredIncidents.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* MODAL DE SOLUCIÓN Y RECOMENDACIÓN */}
      <AnimatePresence>
        {selectedIncident && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 flex flex-col my-8"
            >
              {/* Encabezado Modal */}
              <div className="p-6 pb-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-xl flex items-center justify-center font-bold">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">Intervención de Riesgo Académico</h3>
                    <p className="text-xs text-slate-500 font-medium">INC-{String(selectedIncident.id).padStart(4, '0')}</p>
                  </div>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Contenido Modal */}
              <form onSubmit={handleSubmitResolution} className="p-6 space-y-6 flex-1 overflow-y-auto">
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Estudiante Afectado</span>
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-100">
                      Cód: {selectedIncident.codigo_universitario}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{selectedIncident.usuario_nombre}</p>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      <span className="font-semibold text-slate-600">Detalle del riesgo:</span> {selectedIncident.recomendacion || 'Rendimiento por debajo del umbral aprobatorio proyectado.'}
                    </p>
                  </div>
                  {selectedIncident.promedio_actual !== null && (
                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-600">Promedio Proyectado:</span>
                      <span className="text-xs font-bold bg-rose-50 text-rose-700 px-2 py-0.5 rounded border border-rose-200 font-mono">
                        {selectedIncident.promedio_actual} / 20.0
                      </span>
                    </div>
                  )}
                </div>

                {/* Textarea de Recomendación */}
                <div className="space-y-2">
                  <label htmlFor="recomendacion" className="block text-sm font-bold text-slate-800">
                    Plan de Acción / Recomendación de Tutoría <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    id="recomendacion"
                    rows={4}
                    value={recomendacion}
                    onChange={(e) => setRecomendacion(e.target.value)}
                    placeholder="Escriba las recomendaciones, tutorías asignadas o compromisos acordados con el estudiante para mejorar su rendimiento académico..."
                    className="block w-full p-4 border border-slate-200 rounded-2xl text-sm leading-relaxed bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors shadow-sm"
                  />
                  <p className="text-xs text-slate-500">
                    Al guardar, el incidente se marcará automáticamente como <span className="font-bold text-emerald-600">Intervenido / Resuelto</span>.
                  </p>
                </div>

                {modalError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <p>{modalError}</p>
                  </div>
                )}

                {/* Pie del Modal */}
                <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    disabled={submitting}
                    className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold text-sm transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !recomendacion.trim()}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm shadow-md shadow-indigo-500/20 flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Guardando...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" /> Guardar Solución
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default IncidentsManagementPage;
