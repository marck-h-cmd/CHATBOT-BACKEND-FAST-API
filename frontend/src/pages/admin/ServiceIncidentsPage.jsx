import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Clock, FileText, RefreshCw, Search, ShieldAlert, User, Upload, X } from 'lucide-react';
import * as serviceDeskAPI from '../../api/service-desk';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const ServiceIncidentsPage = () => {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [resolveAction, setResolveAction] = useState('REEMPLAZAR_PDF'); // REEMPLAZAR_PDF o MANTENER
  const [newPdfFile, setNewPdfFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [fileError, setFileError] = useState('');

  useEffect(() => {
    loadIncidents();
  }, []);

  const loadIncidents = async () => {
    setLoading(true);
    try {
      const data = await serviceDeskAPI.getServiceIncidents();
      setIncidents(data);
    } catch (err) {
      console.error('Error al cargar incidentes de servicio:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (incident) => {
    setSelectedIncident(incident);
    setResolveAction('REEMPLAZAR_PDF');
    setNewPdfFile(null);
    setFileError('');
  };

  const handleCloseModal = () => {
    setSelectedIncident(null);
    setNewPdfFile(null);
    setFileError('');
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setFileError('Solo se permiten archivos en formato PDF.');
        setNewPdfFile(null);
      } else if (file.size > 20 * 1024 * 1024) {
        setFileError('El archivo excede el límite de 20MB.');
        setNewPdfFile(null);
      } else {
        setFileError('');
        setNewPdfFile(file);
      }
    }
  };

  const handleConfirmResolve = async (e) => {
    e.preventDefault();
    if (resolveAction === 'REEMPLAZAR_PDF' && !newPdfFile) {
      setFileError('Debe seleccionar un archivo PDF para reemplazar el sílabo con errores.');
      return;
    }

    setSubmitting(true);
    const formData = new FormData();
    formData.append('accion', resolveAction);
    if (resolveAction === 'REEMPLAZAR_PDF' && newPdfFile) {
      formData.append('archivo', newPdfFile);
    }

    try {
      await serviceDeskAPI.resolveServiceIncident(selectedIncident.id_incidente_servicio, formData);
      // Remover de la lista activa
      setIncidents(incidents.filter(inc => inc.id_incidente_servicio !== selectedIncident.id_incidente_servicio));
      handleCloseModal();
    } catch (err) {
      alert(err.response?.data?.detail || "Error al resolver el incidente de servicio.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredIncidents = incidents.filter(inc => 
    inc.nombre_curso.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inc.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inc.tipo_incidente.toLowerCase().includes(searchTerm.toLowerCase())
  );
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="p-2 bg-rose-100 dark:bg-rose-955/30 text-rose-707 dark:text-rose-400 rounded-xl">
              <ShieldAlert className="w-6 h-6" />
            </span>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Incidentes de Servicio</h1>
          </div>
          <p className="text-slate-505 dark:text-slate-400">
            Monitoreo y resolución de fallos documentales, fórmulas ambiguas o inconsistencias en sílabos subidos.
          </p>
        </div>
        <Button variant="outline" onClick={loadIncidents} className="flex items-center gap-2 self-start md:self-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar
        </Button>
      </div>

      {/* Barra de Filtros */}
      <div className="mb-6 relative max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-slate-400 dark:text-slate-500" />
        </div>
        <input
          type="text"
          placeholder="Buscar por curso, tipo o descripción..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl leading-5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
        />
      </div>

      {loading ? (
        <LoadingSpinner fullScreen />
      ) : filteredIncidents.length === 0 ? (
        <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center bg-white dark:bg-[#131A2C] shadow-card transition-colors duration-200">
          <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 dark:text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-808 dark:text-white mb-2">
            ¡Todo en orden!
          </h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            No hay incidentes de servicio activos. Todos los sílabos subidos cumplen con la validación de fórmulas y legibilidad.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {filteredIncidents.map((inc) => (
              <motion.div
                key={inc.id_incidente_servicio}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-[#131A2C] border border-rose-200 dark:border-rose-900/40 rounded-2xl p-6 flex flex-col justify-between hover:shadow-card-hover transition-all relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500" />
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-1 bg-rose-50 dark:bg-rose-955/20 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-900/35 rounded-lg text-xs font-bold tracking-wider uppercase">
                      {inc.tipo_incidente.replace(/_/g, ' ')}
                    </span>
                    <span className="flex items-center gap-1 text-slate-400 dark:text-slate-500 text-xs font-medium">
                      <Clock className="w-3.5 h-3.5" /> 
                      {inc.fecha_creacion ? new Date(inc.fecha_creacion).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1 leading-snug">
                    {inc.nombre_curso}
                  </h3>
                  <p className="text-xs font-medium text-slate-505 dark:text-slate-400 mb-4 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" /> Periodo: {inc.periodo}
                  </p>

                  <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-3 mb-6">
                    <p className="text-slate-700 dark:text-slate-300 text-sm font-medium leading-relaxed">
                      {inc.descripcion}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-805 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                    <User className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                    <span className="truncate">Subido por: {inc.usuario}</span>
                  </div>
                  <Button
                    onClick={() => handleOpenModal(inc)}
                    className="shrink-0 flex items-center gap-1.5 py-2 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Resolver
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
      {/* MODAL DE RESOLUCIÓN */}
      <AnimatePresence>
        {selectedIncident && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/60 backdrop-blur-sm overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#131A2C] rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-105 dark:border-slate-800 flex flex-col my-8"
            >
              {/* Encabezado Modal */}
              <div className="p-6 pb-4 border-b border-slate-105 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-rose-100 dark:bg-rose-955/30 text-rose-707 dark:text-rose-455 rounded-xl flex items-center justify-center">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-lg">Resolver Incidente de Servicio</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{selectedIncident.nombre_curso}</p>
                  </div>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Contenido Modal */}
              <form onSubmit={handleConfirmResolve} className="p-6 space-y-6 flex-1 overflow-y-auto">
                <div className="bg-rose-50/50 dark:bg-rose-955/10 border border-rose-100 dark:border-rose-900/30 rounded-2xl p-4 text-sm text-rose-800 dark:text-rose-300">
                  <p className="font-semibold mb-1">Detalle del Error Detectado:</p>
                  <p className="text-rose-700 dark:text-rose-400 leading-relaxed font-mono text-xs bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-rose-100 dark:border-rose-900/40 mt-2">
                    {selectedIncident.descripcion}
                  </p>
                </div>

                {/* Selección de Acción */}
                <div className="space-y-4">
                  <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                    Seleccione la acción correctiva:
                  </label>
                  
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className={`
                      flex flex-col p-4 rounded-2xl border cursor-pointer transition-all ${
                        resolveAction === 'REEMPLAZAR_PDF'
                          ? 'border-indigo-600 dark:border-indigo-550 bg-indigo-50/50 dark:bg-indigo-950/20 ring-2 ring-indigo-600/20 dark:ring-indigo-600/10'
                          : 'border-slate-202 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                      }
                    `}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm font-bold ${resolveAction === 'REEMPLAZAR_PDF' ? 'text-indigo-900 dark:text-indigo-300' : 'text-slate-800 dark:text-slate-200'}`}>
                          Subir PDF Corregido
                        </span>
                        <input
                          type="radio"
                          name="accion"
                          value="REEMPLAZAR_PDF"
                          checked={resolveAction === 'REEMPLAZAR_PDF'}
                          onChange={() => setResolveAction('REEMPLAZAR_PDF')}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-405 font-medium leading-relaxed">
                        Reemplaza el archivo actual con una versión oficial corregida.
                      </p>
                    </label>

                    <label className={`
                      flex flex-col p-4 rounded-2xl border cursor-pointer transition-all ${
                        resolveAction === 'MANTENER'
                          ? 'border-indigo-600 dark:border-indigo-550 bg-indigo-50/50 dark:bg-indigo-950/20 ring-2 ring-indigo-600/20 dark:ring-indigo-600/10'
                          : 'border-slate-202 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                      }
                    `}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm font-bold ${resolveAction === 'MANTENER' ? 'text-indigo-900 dark:text-indigo-300' : 'text-slate-800 dark:text-slate-200'}`}>
                          Forzar Aprobación
                        </span>
                        <input
                          type="radio"
                          name="accion"
                          value="MANTENER"
                          checked={resolveAction === 'MANTENER'}
                          onChange={() => setResolveAction('MANTENER')}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-405 font-medium leading-relaxed">
                        Mantiene el PDF actual y aprueba el sílabo ignorando la advertencia.
                      </p>
                    </label>
                  </div>
                </div>

                {/* Input de Archivo (Solo si es REEMPLAZAR_PDF) */}
                {resolveAction === 'REEMPLAZAR_PDF' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2 pt-2"
                  >
                    <label className="block text-sm font-bold text-slate-808 dark:text-slate-208">
                      Archivo PDF Corregido <span className="text-rose-500">*</span>
                    </label>
                    <div className="border-2 border-dashed border-slate-200 dark:border-slate-750 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-2xl p-6 text-center cursor-pointer bg-slate-50/50 dark:bg-slate-900/50 transition-colors relative">
                      <input
                        type="file"
                        onChange={handleFileChange}
                        accept=".pdf"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <div className="flex flex-col items-center justify-center">
                        <Upload className="w-8 h-8 text-indigo-505 dark:text-indigo-455 mb-2" />
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                          {newPdfFile ? newPdfFile.name : 'Haz clic o arrastra el nuevo PDF aquí'}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {newPdfFile ? `${(newPdfFile.size / 1024 / 1024).toFixed(2)} MB` : 'Máximo 20MB • Solo PDF'}
                        </p>
                      </div>
                    </div>
                    {fileError && <p className="text-xs text-rose-600 dark:text-rose-455 font-medium mt-1">{fileError}</p>}
                  </motion.div>
                )}

                {/* Pie del Modal */}
                <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseModal}
                    disabled={submitting}
                    className="px-5 py-2.5 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-705 dark:text-slate-300 rounded-xl font-semibold text-sm transition-colors"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting || (resolveAction === 'REEMPLAZAR_PDF' && !newPdfFile)}
                    className="px-6 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-md dark:shadow-none shadow-indigo-500/20 flex items-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Procesando...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" /> Confirmar Resolución
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ServiceIncidentsPage;
