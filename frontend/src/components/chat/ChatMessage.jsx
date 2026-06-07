import React, { useState } from 'react';
import { formatDateTime } from '../../utils/formatters';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Clock, CheckCircle, BookOpen, XCircle } from 'lucide-react';
import * as sugerenciasAPI from '../../api/sugerencias';

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
        <div className="grid grid-cols-1 gap-2">
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
              <div key={idx} className="p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-900/30 text-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {semanaLabel}
                    </span>
                    <div className="flex items-center gap-1">
                      <span className={`px-1.5 py-0.5 rounded border text-[9px] font-extrabold uppercase ${prioColor}`}>
                        Prio: {prioLabel}
                      </span>
                      <span className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-extrabold text-[9px]">
                        {item.horas}h
                      </span>
                    </div>
                  </div>
                  {item.tema && (
                    <p className="text-slate-750 dark:text-slate-300 font-semibold text-[12px] mb-1 leading-snug">
                      {item.tema}
                    </p>
                  )}
                </div>
                {item.enfoque && (
                  <p className="text-slate-550 dark:text-slate-400 text-[10.5px] italic leading-relaxed mt-1 border-t border-slate-100/50 dark:border-slate-800/30 pt-1">
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
      <div className="flex flex-wrap gap-1.5 mt-2">
        {Object.entries(parsedDist).map(([tipo, hs]) => (
          <span key={tipo} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-semibold text-slate-650 dark:text-slate-400 capitalize text-[10.5px]">
            {tipo}: {hs}h
          </span>
        ))}
      </div>
    );
  }

  return null;
};

const ChatMessage = ({ message }) => {
  const isUser = message.role === 'user';
  const isError = message.isError;
  const riesgo = message.riesgo;
  const fragmentos = message.fragmentos;
  const sugerencia = message.sugerencia;

  const [sugEstado, setSugEstado] = useState(sugerencia?.estado || 'PENDIENTE');
  const [loadingSug, setLoadingSug] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [fechaProgramada, setFechaProgramada] = useState('');

  const handleUpdateSugerencia = async (nuevoEstado) => {
    if (!sugerencia?.id_sugerencia) return;
    setLoadingSug(true);
    try {
      await sugerenciasAPI.updateSugerenciaEstado(sugerencia.id_sugerencia, nuevoEstado, null);
      setSugEstado(nuevoEstado);
    } catch (err) {
      console.error("Error al actualizar estado de sugerencia desde chat:", err);
      alert("No se pudo actualizar la sugerencia.");
    } finally {
      setLoadingSug(false);
    }
  };

  const confirmAcceptPlan = async () => {
    if (!sugerencia?.id_sugerencia) return;
    if (!fechaProgramada) {
      alert("Por favor selecciona una fecha y hora para el recordatorio.");
      return;
    }
    setLoadingSug(true);
    try {
      const isoDate = new Date(fechaProgramada).toISOString();
      await sugerenciasAPI.updateSugerenciaEstado(sugerencia.id_sugerencia, 'ACEPTADA', isoDate);
      setSugEstado('ACEPTADA');
      setModalOpen(false);
    } catch (err) {
      console.error("Error al aceptar sugerencia desde chat:", err);
      alert("No se pudo aceptar la sugerencia.");
    } finally {
      setLoadingSug(false);
    }
  };

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-6`}>
      {!isUser && (
        <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 mr-3 border border-slate-200 dark:border-slate-850 mt-1 bg-white dark:bg-slate-900 shadow-sm flex items-center justify-center">
          <img src="/logo.png" alt="Sylia" className="w-6 h-6 object-contain" />
        </div>
      )}

      <div className={`flex flex-col max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Header */}
        <div className="flex items-center gap-2 mb-1.5 text-[11px] text-slate-400 dark:text-slate-500 font-bold px-1 tracking-wide">
          <span className="text-slate-700 dark:text-slate-300">{isUser ? 'Tú' : 'Sylia'}</span>
          <span className="font-medium">{formatDateTime(message.timestamp)}</span>
        </div>

        {/* Bubble */}
        <div
          className={`
            px-5 py-4 shadow-sm
            ${isUser
              ? 'bg-slate-900 dark:bg-indigo-650 text-white rounded-3xl rounded-tr-sm'
              : isError
                ? 'bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/55 text-red-800 dark:text-red-300 rounded-3xl rounded-tl-sm'
                : 'bg-white dark:bg-[#131A2C] border border-slate-200 dark:border-slate-800/80 text-slate-800 dark:text-slate-100 rounded-3xl rounded-tl-sm'
            }
          `}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed font-medium">{message.content}</p>
          ) : (
            <div className="text-[15px] leading-relaxed markdown-body
              [&_pre]:my-4 [&_pre]:p-4 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-slate-900 dark:[&_pre]:bg-slate-950 [&_pre]:text-slate-50 [&_pre]:shadow-sm
              [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-inherit [&_pre_code]:font-mono [&_pre_code]:text-[14px] [&_pre_code]:border-none
              [&_code:not(pre_code)]:px-1.5 [&_code:not(pre_code)]:py-0.5 [&_code:not(pre_code)]:mx-0.5 [&_code:not(pre_code)]:rounded-md [&_code:not(pre_code)]:bg-slate-100 dark:[&_code:not(pre_code)]:bg-slate-800/80 [&_code:not(pre_code)]:text-slate-700 dark:[&_code:not(pre_code)]:text-slate-200 [&_code:not(pre_code)]:font-mono [&_code:not(pre_code)]:text-[13.5px] [&_code:not(pre_code)]:font-bold [&_code:not(pre_code)]:border [&_code:not(pre_code)]:border-slate-200 dark:[&_code:not(pre_code)]:border-slate-700
            ">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({node, ...props}) => <p className="mb-3 last:mb-0" {...props} />,
                  ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-4 space-y-2 marker:text-slate-400" {...props} />,
                  ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-4 space-y-2 marker:text-slate-500 marker:font-bold" {...props} />,
                  li: ({node, ...props}) => <li className="pl-1" {...props} />,
                  h1: ({node, ...props}) => <h1 className="text-xl font-extrabold text-slate-900 dark:text-white mb-3 mt-5 tracking-tight" {...props} />,
                  h2: ({node, ...props}) => <h2 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 mb-2 mt-4 tracking-tight" {...props} />,
                  h3: ({node, ...props}) => <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 mb-2 mt-3 tracking-tight" {...props} />,
                  strong: ({node, ...props}) => <strong className="font-bold text-slate-900 dark:text-white" {...props} />,
                  blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-slate-300 dark:border-slate-700 pl-4 py-1 my-3 bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 italic rounded-r-lg" {...props} />,
                  a: ({node, ...props}) => <a className="text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 hover:underline font-bold transition-colors" target="_blank" rel="noopener noreferrer" {...props} />
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}

          {/* Alerta de riesgo académico */}
          {!isUser && riesgo && (
            <div className="mt-4 p-3.5 bg-amber-50 dark:bg-amber-950/15 border border-amber-200 dark:border-amber-900/50 rounded-2xl text-sm flex gap-3">
              <span className="text-amber-600 shrink-0 text-base">⚠️</span>
              <div>
                <span className="font-bold text-amber-900 dark:text-amber-300 text-xs uppercase tracking-wider">Alerta académica</span>
                <p className="text-amber-800 dark:text-amber-400 mt-0.5 text-xs leading-relaxed font-medium">
                  {['MUY ALTO', 'MUY_ALTO', 'DESAPRUEBA'].includes(riesgo) && 'Riesgo muy alto de desaprobación. ¡Consulta con tutoría de inmediato!'}
                  {['ALTO'].includes(riesgo) && 'Riesgo alto de desaprobación. Te recomendamos buscar asesoría académica.'}
                  {['MEDIO'].includes(riesgo) && 'Riesgo medio. Mejora tu desempeño en las próximas evaluaciones.'}
                  {!['MUY ALTO', 'MUY_ALTO', 'DESAPRUEBA', 'ALTO', 'MEDIO'].includes(riesgo) && `Riesgo detectado: ${riesgo}.`}
                </p>
              </div>
            </div>
          )}

          {/* Tarjeta interactiva de sugerencia automática */}
          {!isUser && sugerencia && (
            <div className={`mt-4 p-4 border rounded-2xl text-xs flex flex-col gap-3 transition-all duration-200 ${
              sugEstado === 'ACEPTADA'
                ? 'border-emerald-250 dark:border-emerald-900/50 bg-emerald-50/20 dark:bg-emerald-950/5 text-emerald-800 dark:text-emerald-300'
                : sugEstado === 'IGNORADA'
                  ? 'border-slate-200 dark:border-slate-800 opacity-60'
                  : 'border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/10 dark:bg-indigo-950/5 text-slate-800 dark:text-slate-250'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-200">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                  <span>Plan de Estudio Recomendado</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  sugerencia.prioridad === 1 ? 'bg-red-50 text-red-600 dark:bg-red-950/35 dark:text-red-400 border border-red-200 dark:border-red-900/40' :
                  sugerencia.prioridad === 2 ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/35 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40' :
                  'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/35 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40'
                }`}>
                  Prioridad {sugerencia.prioridad === 1 ? 'Alta' : sugerencia.prioridad === 2 ? 'Media' : 'Baja'}
                </span>
              </div>

              <div>
                <p className="font-bold text-slate-700 dark:text-slate-350 text-[13px] mb-1">
                  Estudio para: {sugerencia.tema_o_evidencia}
                </p>
                <p className="text-slate-600 dark:text-slate-400 italic mb-2">
                  "{sugerencia.justificacion}"
                </p>
                
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-450 mb-1.5 font-medium">
                  <Clock className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-slate-555" />
                  <span>{sugerencia.horas_sugeridas} horas sugeridas</span>
                </div>

                {renderDistribucion(sugerencia.distribucion_sugerida)}
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 mt-2 pt-2.5 border-t border-slate-100 dark:border-slate-800/80">
                {sugEstado === 'PENDIENTE' ? (
                  <>
                    <button
                      onClick={() => handleUpdateSugerencia('IGNORADA')}
                      disabled={loadingSug}
                      className="px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-450 font-bold rounded-xl transition-colors disabled:opacity-50"
                    >
                      Ignorar
                    </button>
                    <button
                      onClick={() => setModalOpen(true)}
                      disabled={loadingSug}
                      className="px-3.5 py-1.5 bg-indigo-650 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white font-extrabold rounded-xl shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      Aceptar Plan
                    </button>
                  </>
                ) : sugEstado === 'ACEPTADA' ? (
                  <>
                    <span className="flex items-center gap-1 font-bold text-emerald-650 dark:text-emerald-400 mr-auto pl-1">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Programado
                    </span>
                    <button
                      onClick={() => setModalOpen(true)}
                      disabled={loadingSug}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-bold text-[11px] rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                      <Clock className="w-3 h-3" /> Reprogramar
                    </button>
                    <button
                      onClick={() => handleUpdateSugerencia('CANCELADA')}
                      disabled={loadingSug}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 font-bold text-[11px] rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                      <XCircle className="w-3 h-3" /> Cancelar
                    </button>
                  </>
                ) : (
                  <span className={`flex items-center gap-1 font-bold ${
                    sugEstado === 'CANCELADA' ? 'text-rose-500 dark:text-rose-400' : 'text-slate-400 dark:text-slate-500'
                  }`}>
                    <XCircle className="w-3.5 h-3.5" />
                    {sugEstado === 'CANCELADA' ? 'Cancelada' : sugEstado}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Fragmentos citados */}
          {!isUser && Array.isArray(fragmentos) && fragmentos.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs">
              <details className="group">
                <summary className="cursor-pointer text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-bold transition-colors flex items-center gap-1.5 select-none outline-none text-[11px]">
                  <svg className="w-3.5 h-3.5 transition-transform duration-200 group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                  Ver fuentes ({fragmentos.length})
                </summary>
                <div className="mt-3 space-y-2 pl-5">
                   {fragmentos.map((f, idx) => (
                    <div key={idx} className="p-3 bg-[#FAF9F6] dark:bg-slate-900/55 border border-slate-100 dark:border-slate-800/50 rounded-xl text-slate-600 dark:text-slate-400 italic leading-relaxed text-[11px]">
                      "{f.substring(0, 200)}{f.length > 200 ? '...' : ''}"
                    </div>
                  ))}
                </div>
              </details>
            </div>
          )}
        </div>
      </div>

      {/* Modal para Días Antes */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 dark:bg-slate-950/60 p-4">
          <div className="bg-white dark:bg-[#131A2C] border dark:border-slate-800 rounded-2xl shadow-xl max-w-sm w-full p-6 relative overflow-hidden">
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
                onClick={() => confirmAcceptPlan()}
                disabled={loadingSug}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
              >
                {loadingSug ? 'Guardando...' : 'Guardar'}
              </button>
              <button 
                onClick={() => setModalOpen(false)}
                disabled={loadingSug}
                className="flex-1 bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatMessage;