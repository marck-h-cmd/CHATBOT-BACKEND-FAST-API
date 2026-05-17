import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import * as sugerenciasAPI from '../api/sugerencias';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, CheckCircle, Clock, XCircle, AlertCircle, Calendar } from 'lucide-react';
import { handleApiError } from '../utils/errorHandler';

const SugerenciasPage = () => {
  const { isAuthenticated } = useAuth();
  const [sugerencias, setSugerencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSugId, setSelectedSugId] = useState(null);
  const [diasAntes, setDiasAntes] = useState(1);

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

  const handleUpdateEstado = async (id, nuevoEstado, dias = 1) => {
    try {
      await sugerenciasAPI.updateSugerenciaEstado(id, nuevoEstado, dias);
      // Actualizar localmente
      setSugerencias(prev => prev.map(s => s.id_sugerencia === id ? { ...s, estado: nuevoEstado } : s));
      setModalOpen(false);
    } catch (err) {
      alert('Error al actualizar la sugerencia');
    }
  };

  const openAcceptModal = (id) => {
    setSelectedSugId(id);
    setDiasAntes(1);
    setModalOpen(true);
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[80vh] bg-slate-50">
        <div className="bg-white border border-slate-200 shadow-sm p-8 rounded-3xl max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-indigo-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Acceso Denegado</h2>
          <p className="text-slate-600">Inicia sesión para ver tus sugerencias de estudio.</p>
        </div>
      </div>
    );
  }

  const getPriorityColor = (prioridad) => {
    switch (prioridad) {
      case 1: return 'text-red-500 bg-red-50 border-red-100';
      case 2: return 'text-amber-500 bg-amber-50 border-amber-100';
      default: return 'text-emerald-500 bg-emerald-50 border-emerald-100';
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
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-800 flex items-center gap-3">
            <div className="bg-indigo-600 p-2.5 rounded-xl shadow-sm">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            Mis Sugerencias de Estudio
          </h1>
          <p className="text-slate-500 mt-2">Recomendaciones personalizadas basadas en tus consultas al chatbot.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl">{error}</div>
        ) : sugerencias.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl shadow-sm border border-slate-200 text-center">
            <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-700 mb-2">Sin sugerencias</h3>
            <p className="text-slate-500">Pregúntale a Sylia sobre cuánto tiempo estudiar para tus evaluaciones para generar sugerencias.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {sugerencias.map((sugerencia) => (
              <motion.div
                key={sugerencia.id_sugerencia}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white p-6 rounded-2xl shadow-sm border ${
                  sugerencia.estado === 'ACEPTADA' ? 'border-emerald-200 bg-emerald-50/30' :
                  sugerencia.estado === 'IGNORADA' ? 'border-slate-200 opacity-60' : 'border-indigo-100'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${getPriorityColor(sugerencia.prioridad)}`}>
                        Prioridad {getPriorityLabel(sugerencia.prioridad)}
                      </span>
                      <span className="text-sm font-medium text-slate-500 flex items-center gap-1">
                        <Clock className="w-4 h-4" /> {sugerencia.horas_sugeridas} horas sugeridas
                      </span>
                    </div>
                    
                    <h3 className="text-lg font-bold text-slate-800 mb-2">
                      Estudio para: {sugerencia.tema_o_evidencia}
                    </h3>
                    
                    <div className="mb-4">
                      <p className="text-sm text-slate-600 mb-2"><strong>Justificación:</strong> {sugerencia.justificacion}</p>
                      
                      {sugerencia.distribucion_sugerida && Object.keys(sugerencia.distribucion_sugerida).length > 0 && (
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm flex gap-4">
                          {Object.entries(sugerencia.distribucion_sugerida).map(([tipo, horas]) => (
                            <span key={tipo} className="capitalize text-slate-600">
                              <span className="font-semibold text-indigo-600">{horas}h</span> {tipo}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="text-xs text-slate-400">
                      Generada el {new Date(sugerencia.fecha_generacion).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div className="flex gap-2 shrink-0">
                    {sugerencia.estado === 'PENDIENTE' ? (
                      <>
                        <button
                          onClick={() => openAcceptModal(sugerencia.id_sugerencia)}
                          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg font-medium text-sm transition-colors"
                        >
                          <CheckCircle className="w-4 h-4" /> Aceptar
                        </button>
                        <button
                          onClick={() => handleUpdateEstado(sugerencia.id_sugerencia, 'IGNORADA')}
                          className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg font-medium text-sm transition-colors"
                        >
                          <XCircle className="w-4 h-4" /> Ignorar
                        </button>
                      </>
                    ) : (
                      <div className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 ${
                        sugerencia.estado === 'ACEPTADA' ? 'text-emerald-600 bg-emerald-50' : 'text-slate-500 bg-slate-100'
                      }`}>
                        {sugerencia.estado === 'ACEPTADA' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        {sugerencia.estado}
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 relative overflow-hidden"
            >
              <h3 className="text-xl font-bold text-slate-800 mb-2">Programar Recordatorio</h3>
              <p className="text-slate-600 text-sm mb-6">
                Te enviaremos un correo para recordarte estudiar. ¿Cuántos días antes de la entrega deseas recibirlo?
              </p>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">Días antes del examen/entrega:</label>
                <input 
                  type="number" 
                  min="0" 
                  max="14" 
                  value={diasAntes} 
                  onChange={(e) => setDiasAntes(parseInt(e.target.value) || 0)}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <p className="text-xs text-slate-500 mt-2">Ej: 1 = un día antes. 0 = Hoy mismo.</p>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => handleUpdateEstado(selectedSugId, 'ACEPTADA', diasAntes)}
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

export default SugerenciasPage;
