import React, { useState } from 'react';
import { useSyllabus } from '../../contexts/SyllabusContext';
import Card from '../ui/Card';

const SyllabusSummary = () => {
  const { preloadedSyllabus, selectedSyllabusId, userSyllabi, syllabusDetail, loading } = useSyllabus();
  const [expanded, setExpanded] = useState(false);

  // Obtener el sílabo seleccionado (oficial o subido)
  const selectedSyllabus = 
    preloadedSyllabus?.id === selectedSyllabusId 
      ? preloadedSyllabus 
      : userSyllabi.find(s => s.id === selectedSyllabusId);

  if (!selectedSyllabusId) {
    return (
      <Card title="Resumen del sílabo">
        <p className="text-gray-500 dark:text-slate-400 text-sm">Selecciona un sílabo para ver su resumen.</p>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card title="Resumen del sílabo">
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Card>
    );
  }

  // Si tenemos el detalle completo del backend para el ID seleccionado, lo usamos
  const detail = syllabusDetail && String(syllabusDetail.id_silabo) === String(selectedSyllabusId)
    ? syllabusDetail
    : null;

  // Extraer evidencias, formulas, tutoría
  let evidencias = [];
  let formulas = [];
  let tutorInfo = {
    dia: 'Jueves',
    horario: '12:00 - 13:00',
    email: 'amendozad@unitru.edu.pe',
    canales: 'Email, WhatsApp, Google Meet, Zoom, Cubículo docente',
  };
  let notaAprobatoria = 14;

  if (detail && detail.reglas_json) {
    const rJson = typeof detail.reglas_json === 'string' 
      ? JSON.parse(detail.reglas_json) 
      : detail.reglas_json;

    // Extraer evidencias
    const evs = rJson.evidencias || {};
    evidencias = Object.entries(evs).map(([key, val]) => ({
      codigo: key,
      nombre: val.nombre || key,
      peso: val.peso || 0
    }));

    // Extraer formulas
    const forms = rJson.formulas || {};
    formulas = Object.entries(forms).map(([key, val]) => ({
      unidad: key,
      formula: val
    }));

    // Extraer tutoría
    if (rJson.tutoria) {
      tutorInfo = {
        dia: rJson.tutoria.dia || tutorInfo.dia,
        horario: rJson.tutoria.horario || tutorInfo.horario,
        email: rJson.tutoria.email || tutorInfo.email,
        canales: rJson.tutoria.canales || tutorInfo.canales,
      };
    }

    if (rJson.nota_aprobatoria) {
      notaAprobatoria = rJson.nota_aprobatoria;
    }
  } else {
    // Fallback/Legacy
    const reglas = selectedSyllabus?.reglas_evaluacion || [];
    formulas = reglas.map(reg => ({
      unidad: reg.unidad,
      formula: reg.formula
    }));
  }

  const name = detail?.nombre_curso || selectedSyllabus?.nombre_curso || selectedSyllabus?.curso?.nombre || 'Sílabo';

  return (
    <Card title={`Resumen: ${name}`}>
      <div className="space-y-4">
        {/* Estado y Score de validación */}
        <div className="flex flex-wrap gap-2 items-center text-xs justify-between pb-2 border-b border-gray-100 dark:border-slate-800">
          <div className="flex gap-2">
            <span className={`px-2 py-0.5 rounded-full font-semibold ${
              detail?.estado_validacion === 'APROBADO' || detail?.estado_validacion === 'OFICIAL'
                ? 'bg-green-100 dark:bg-emerald-950/40 text-green-700 dark:text-green-400'
                : detail?.estado_validacion === 'RECHAZADO'
                ? 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400'
                : 'bg-yellow-100 dark:bg-amber-950/40 text-yellow-700 dark:text-amber-400'
            }`}>
              {detail?.estado_validacion || selectedSyllabus?.estado || 'Procesando'}
            </span>
            {detail?.score !== undefined && (
              <span className="text-gray-500 dark:text-slate-400">
                Confianza: <span className="font-semibold text-slate-800 dark:text-slate-200">{detail.score}%</span>
              </span>
            )}
          </div>
          {detail?.fecha_subida && (
            <span className="text-gray-400 dark:text-slate-500">
              Subido: {new Date(detail.fecha_subida).toLocaleDateString()}
            </span>
          )}
        </div>

        {/* Evidencias y pesos */}
        <div>
          <h4 className="font-semibold text-gray-800 dark:text-slate-200 text-sm mb-1.5">Sistema de Evaluación</h4>
          {evidencias.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {evidencias.map(ev => (
                <div key={ev.codigo} className="bg-blue-50 dark:bg-blue-950/20 p-2 rounded border border-blue-100 dark:border-blue-900/30 text-slate-800 dark:text-slate-350">
                  <span className="font-bold text-blue-700 dark:text-blue-400">{ev.codigo}</span> ({ev.peso}%)
                  <p className="text-[10px] text-gray-500 dark:text-slate-400 truncate" title={ev.nombre}>{ev.nombre}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-blue-50 dark:bg-blue-950/20 p-2 rounded text-slate-800 dark:text-slate-350"><span className="font-medium">PFD</span> (25%)<br />Examen unidad + Foros</div>
              <div className="bg-green-50 dark:bg-emerald-950/20 p-2 rounded text-slate-800 dark:text-slate-350"><span className="font-medium">TAD</span> (35%)<br />Trabajo aplicación digital</div>
              <div className="bg-yellow-50 dark:bg-amber-950/20 p-2 rounded text-slate-800 dark:text-slate-350"><span className="font-medium">ELD</span> (40%)<br />Examen laboratorio digital</div>
            </div>
          )}
        </div>

        {/* Fórmulas */}
        <div>
          <h4 className="font-semibold text-gray-800 dark:text-slate-200 mb-1 text-sm">Fórmulas de cálculo</h4>
          <ul className="text-sm text-gray-700 dark:text-slate-350 space-y-1 bg-gray-50 dark:bg-slate-900/40 p-2.5 rounded-lg border dark:border-slate-800/80 font-mono text-xs">
            {formulas.length > 0 ? (
              formulas.map(reg => (
                <li key={reg.unidad} className="flex justify-between">
                  <span className="font-bold text-slate-900 dark:text-slate-200">{reg.unidad}:</span> 
                  <span className="text-right truncate pl-4">{reg.formula}</span>
                </li>
              ))
            ) : (
              <>
                <li className="flex justify-between"><span className="font-bold">PU1:</span> <span>(PFD + TAD + ELD*2)/4</span></li>
                <li className="flex justify-between"><span className="font-bold">PU2:</span> <span>(PFD + TAD*2 + ELD)/4</span></li>
                <li className="flex justify-between"><span className="font-bold">PU3:</span> <span>(PFD + TAD*2 + ELD)/4</span></li>
                <li className="flex justify-between font-semibold border-t border-dashed mt-1 pt-1"><span className="font-bold">PP:</span> <span>(PU1+PU2+PU3)/3</span></li>
              </>
            )}
          </ul>
          <p className="text-xs text-gray-600 dark:text-slate-400 mt-1.5">
            Nota aprobatoria: <span className="font-bold text-slate-800 dark:text-slate-200">{notaAprobatoria}</span> (medio punto favorece al estudiante)
          </p>
        </div>

        {/* Tutoría */}
        <div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium focus:outline-none"
          >
            <span className="text-xs transition-transform duration-200" style={{ display: 'inline-block', transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
            Información de tutoría
          </button>
          {expanded && (
            <div className="mt-2 p-3 bg-gray-50 dark:bg-slate-900/60 border dark:border-slate-800 rounded text-xs text-slate-700 dark:text-slate-350 space-y-1 animate-fadeIn">
              <p><span className="font-semibold text-slate-850 dark:text-slate-300">Día:</span> {tutorInfo.dia}</p>
              <p><span className="font-semibold text-slate-850 dark:text-slate-300">Horario:</span> {tutorInfo.horario}</p>
              <p>
                <span className="font-semibold text-slate-850 dark:text-slate-300">Email:</span>{' '}
                {tutorInfo.email && tutorInfo.email !== 'No especificado' ? (
                  <a href={`mailto:${tutorInfo.email}`} className="text-blue-600 dark:text-blue-400 hover:underline">{tutorInfo.email}</a>
                ) : (
                  'No especificado'
                )}
              </p>
              <p><span className="font-semibold text-slate-850 dark:text-slate-300">Canales:</span> {tutorInfo.canales || 'No especificado'}</p>
            </div>
          )}
        </div>

        {/* Observaciones si existen */}
        {detail?.observaciones_validacion && (
          <div className="p-2.5 bg-yellow-50 dark:bg-amber-950/15 border border-yellow-200 dark:border-amber-900/30 rounded text-xs text-yellow-800 dark:text-amber-400">
            <span className="font-semibold">Observaciones:</span> {detail.observaciones_validacion}
          </div>
        )}
      </div>
    </Card>
  );
};

export default SyllabusSummary;