import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import * as sugerenciasAPI from '../api/sugerencias';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, CheckCircle, Clock, XCircle, AlertCircle, Calendar } from 'lucide-react';
import { handleApiError } from '../utils/errorHandler';

const renderDistribucion = (distribucion) => {
  if (!distribucion) return null;

  let parsedDist = distribucion;
  if (typeof distribucion === 'string') {
    try {
      parsedDist = JSON.parse(distribucion);
    } catch (e) {
      return null;
    }
  }

  if (Array.isArray(parsedDist)) {
    return (
      <div className="mt-3 space-y-2 w-full">
        <p className="font-bold text-slate-700 dark:text-slate-350 text-[11px] uppercase tracking-wider">
          Plan de Estudio por Semanas
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {parsedDist.map((item, idx) => {
            const priorityVal = item.prioridad;
            const isUrgent = priorityVal === 1 || String(priorityVal).toLowerCase() === 'alta';
            const isMedium = priorityVal === 2 || String(priorityVal).toLowerCase() === 'media';
            const prioColor = isUrgent
              ? 'text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-950/20 border-red-150 dark:border-red-900/30'
              : isMedium
                ? 'text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20 border-amber-150 dark:border-amber-900/30'
                : 'text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-150 dark:border-emerald-900/30';
            const prioLabel = isUrgent ? 'Alta' : isMedium ? 'Media' : 'Baja';
            const semanaLabel = /^\d+$/.test(String(item.semana)) ? `Semana ${item.semana}` : item.semana;
            
            return (
              <div key={idx} className="p-3.5 rounded-xl border border-slate-105 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/40 text-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {semanaLabel}
                    </span>
                    <div className="flex items-center gap-1">
                      <span className={`px-1.5 py-0.5 rounded border text-[9px] font-extrabold uppercase ${prioColor}`}>
                        Prio: {prioLabel}
                      </span>
                      <span className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-350 rounded font-extrabold text-[9px]">
                        {item.horas}h
                      </span>
                    </div>
                  </div>
                  {item.tema && (
                    <p className="text-slate-750 dark:text-slate-300 font-semibold text-[12.5px] mb-1 leading-snug">
                      {item.tema}
                    </p>
                  )}
                </div>
                {item.enfoque && (
                  <p className="text-slate-500 dark:text-slate-450 text-[10.5px] italic leading-relaxed mt-1.5 border-t border-slate-150 dark:border-slate-800/30 pt-1.5">
                    {item.enfoque}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (typeof parsedDist === 'object' && Object.keys(parsedDist).length > 0) {
    return (
      <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-lg border border-slate-100 dark:border-slate-800 text-sm flex gap-4">
        {Object.entries(parsedDist).map(([tipo, horas]) => (
          <span key={tipo} className="capitalize text-slate-600 dark:text-slate-400">
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">{horas}h</span> {tipo}
          </span>
        ))}
      </div>
    );
  }

  return null;
};

const SugerenciasPage = () => {
  const { isAuthenticated } = useAuth();
  const [sugerencias, setSugerencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSugId, setSelectedSugId] = useState(null);
  const [fechaProgramada, setFechaProgramada] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('TODAS');

  useEffect(() => {
    if (isAuthenticated) {
      loadSugerencias();
    }
  }, [isAuthenticated]);

  const loadSugerencias = async () => {
    setLoading(true);
    try {
      const data = await sugerenciasAPI.getSugerencias();
      setSugerencias(data);
      setError(null);
    } catch (err) {
      setError('Error al cargar las sugerencias.');
      handleApiError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEstado = async (id, nuevoEstado, fechaProg = null) => {
    try {
      let isoDate = null;
      if (nuevoEstado === 'ACEPTADA') {
        if (!fechaProg) {
          alert("Por favor selecciona una fecha y hora para el recordatorio.");
          return;
        }
        isoDate = new Date(fechaProg).toISOString();
      }
      
      await sugerenciasAPI.updateSugerenciaEstado(id, nuevoEstado, isoDate);
      // Actualizar localmente
      setSugerencias(prev => prev.map(s => s.id_sugerencia === id ? { ...s, estado: nuevoEstado } : s));
      setModalOpen(false);
    } catch (err) {
      alert('Error al actualizar la sugerencia');
    }
  };

  const openAcceptModal = (id) => {
    setSelectedSugId(id);
    setFechaProgramada('');
    setModalOpen(true);
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[80vh] bg-slate-50 dark:bg-[#0B0F19]">
        <div className="bg-white dark:bg-[#131A2C] border border-slate-200 dark:border-slate-800 shadow-sm p-8 rounded-3xl max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-indigo-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Acceso Denegado</h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm">Inicia sesión para ver tus sugerencias de estudio.</p>
        </div>
      </div>
    );
  }

  const getPriorityColor = (prioridad) => {
    switch (prioridad) {
      case 1: return 'text-red-600 bg-red-50 dark:bg-red-950/20 border-red-150 dark:border-red-900/30';
      case 2: return 'text-amber-600 bg-amber-50 dark:bg-amber-950/20 border-amber-150 dark:border-amber-900/30';
      default: return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-150 dark:border-emerald-900/30';
    }
  };

  const getPriorityLabel = (prioridad) => {
    switch (prioridad) {
      case 1: return 'Alta';
      case 2: return 'Media';
      default: return 'Baja';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F19] p-6 lg:p-8 transition-colors duration-200">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
            <div className="bg-indigo-600 p-2.5 rounded-xl shadow-sm">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            Mis Sugerencias de Estudio
          </h1>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
            <p className="text-slate-500 dark:text-slate-400">Recomendaciones personalizadas basadas en tus consultas al chatbot.</p>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Filtro:</span>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700 dark:text-slate-200 outline-none"
              >
                <option value="TODAS">Todas</option>
                <option value="PENDIENTE">Sin visualizar</option>
                <option value="ACEPTADA">Aceptadas</option>
                <option value="CANCELADA">Canceladas</option>
                <option value="IGNORADA">Ignoradas</option>
                <option value="EXPIRADA">Expiradas</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-950/20 text-red-650 dark:text-red-400 p-4 rounded-xl">{error}</div>
        ) : sugerencias.length === 0 ? (
          <div className="bg-white dark:bg-[#131A2C] p-12 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 text-center">
            <Calendar className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">Sin sugerencias</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Pregúntale a Sylia sobre cuánto tiempo estudiar para tus evaluaciones para generar sugerencias.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {sugerencias.filter(s => filtroEstado === 'TODAS' || s.estado === filtroEstado).map((sugerencia) => (
              <motion.div
                key={sugerencia.id_sugerencia}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white dark:bg-[#131A2C] p-6 rounded-2xl shadow-sm border transition-shadow hover:shadow-md ${
                  sugerencia.estado === 'ACEPTADA' ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/10 dark:bg-emerald-950/5' :
                  sugerencia.estado === 'IGNORADA' ? 'border-slate-200 dark:border-slate-800 opacity-60' :
                  sugerencia.estado === 'EXPIRADA' ? 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30 opacity-75' :
                  sugerencia.estado === 'CANCELADA' ? 'border-rose-100 dark:border-rose-900/40 bg-rose-50/30 dark:bg-rose-950/10 opacity-80' :
                  'border-indigo-150 dark:border-indigo-900/50'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${getPriorityColor(sugerencia.prioridad)}`}>
                        Prioridad {getPriorityLabel(sugerencia.prioridad)}
                      </span>
                      <span className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Clock className="w-4 h-4" /> {sugerencia.horas_sugeridas} horas sugeridas
                      </span>
                    </div>
                    
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">
                      Estudio para: {sugerencia.tema_o_evidencia}
                    </h3>
                    
                    <div className="mb-4">
                      <p className="text-sm text-slate-600 dark:text-slate-300 mb-2"> {sugerencia.justificacion}</p>
                      
                      {renderDistribucion(sugerencia.distribucion_sugerida)}
                    </div>
                    
                    <div className="text-xs text-slate-400 dark:text-slate-500">
                      Generada el {new Date(sugerencia.fecha_generacion).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div className="flex gap-2 shrink-0">
                    {sugerencia.estado === 'PENDIENTE' ? (
                      <>
                        <button
                          onClick={() => openAcceptModal(sugerencia.id_sugerencia)}
                          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 rounded-lg font-bold text-sm transition-colors shadow-sm"
                        >
                          <CheckCircle className="w-4 h-4" /> Aceptar
                        </button>
                        <button
                          onClick={() => handleUpdateEstado(sugerencia.id_sugerencia, 'IGNORADA')}
                          className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg font-bold text-sm transition-colors shadow-sm"
                        >
                          <XCircle className="w-4 h-4" /> Ignorar
                        </button>
                      </>
                    ) : sugerencia.estado === 'ACEPTADA' ? (
                      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                        <div className="px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 text-emerald-700 dark:text-emerald-400 bg-emerald-100/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40">
                          <CheckCircle className="w-4 h-4" /> ACEPTADA
                        </div>
                        <button
                          onClick={() => openAcceptModal(sugerencia.id_sugerencia)}
                          className="flex items-center gap-1 px-3 py-2 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-lg font-semibold text-sm transition-colors"
                          title="Reprogramar"
                        >
                          <Calendar className="w-4 h-4" /> Reprogramar
                        </button>
                        <button
                          onClick={() => handleUpdateEstado(sugerencia.id_sugerencia, 'CANCELADA')}
                          className="flex items-center gap-1 px-3 py-2 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-lg font-semibold text-sm transition-colors"
                          title="Cancelar Programación"
                        >
                          <XCircle className="w-4 h-4" /> Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 ${
                        sugerencia.estado === 'CANCELADA' ? 'text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30' :
                        sugerencia.estado === 'EXPIRADA' ? 'text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800' : 
                        'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800'
                      }`}>
                        <XCircle className="w-4 h-4" /> {sugerencia.estado}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Modal para Días Antes */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 dark:bg-slate-950/60 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#131A2C] border dark:border-slate-800 rounded-2xl shadow-xl max-w-sm w-full p-6 relative overflow-hidden"
            >
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Programar Recordatorio</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">
                Te enviaremos un correo para recordarte estudiar. ¿En qué fecha y hora deseas recibirlo?
              </p>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Fecha y hora del recordatorio:</label>
                <input 
                  type="datetime-local" 
                  min={new Date().toISOString().slice(0, 16)}
                  value={fechaProgramada} 
                  onChange={(e) => setFechaProgramada(e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-800 rounded-lg px-4 py-2 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-500/40 focus:border-indigo-500"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Selecciona un momento a partir de hoy.</p>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => handleUpdateEstado(selectedSugId, 'ACEPTADA', fechaProgramada)}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Guardar
                </button>
                <button 
                  onClick={() => setModalOpen(false)}
                  className="flex-1 bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-medium py-2 px-4 rounded-lg transition-colors"
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

export default SugerenciasPage;
