import React, { useState } from 'react';
import { useSyllabus } from '../../contexts/SyllabusContext';
import Card from '../ui/Card';
import Button from '../ui/Button';

const SyllabusSummary = () => {
  const { preloadedSyllabus, selectedSyllabusId, userSyllabi } = useSyllabus();
  const [expanded, setExpanded] = useState(false);

  // Obtener el sílabo seleccionado (oficial o subido)
  const selectedSyllabus = 
    preloadedSyllabus?.id === selectedSyllabusId 
      ? preloadedSyllabus 
      : userSyllabi.find(s => s.id === selectedSyllabusId);

  if (!selectedSyllabus) {
    return (
      <Card title="Resumen del sílabo">
        <p className="text-gray-500 dark:text-slate-400 text-sm">Selecciona un sílabo para ver su resumen.</p>
      </Card>
    );
  }

  // Extraer reglas (desde preloadedSyllabus o desde metadata del subido)
  const reglas = selectedSyllabus.reglas_evaluacion || [];
  const tutorInfo = selectedSyllabus.tutor_info || {
    dia: 'Jueves',
    horario: '12:00 - 13:00',
    email: 'amendozad@unitru.edu.pe',
    canales: 'Email, WhatsApp, Google Meet, Zoom, Cubículo docente',
  };

  return (
    <Card title={`Resumen: ${selectedSyllabus.curso?.nombre || 'Sílabo'}`}>
      <div className="space-y-3">
        {/* Evidencias y pesos */}
        <div>
          <h4 className="font-semibold text-gray-800 dark:text-slate-200 text-sm">Evidencias de evaluación</h4>
          <div className="grid grid-cols-3 gap-2 mt-1 text-xs">
            <div className="bg-blue-50 dark:bg-blue-950/20 p-2 rounded text-slate-800 dark:text-slate-350"><span className="font-medium">PFD</span><br />Examen unidad + Foros</div>
            <div className="bg-green-50 dark:bg-emerald-950/20 p-2 rounded text-slate-800 dark:text-slate-350"><span className="font-medium">TAD</span><br />Trabajo aplicación digital</div>
            <div className="bg-yellow-50 dark:bg-amber-950/20 p-2 rounded text-slate-800 dark:text-slate-350"><span className="font-medium">ELD</span><br />Examen laboratorio digital</div>
          </div>
        </div>

        {/* Fórmulas */}
        <div>
          <h4 className="font-semibold text-gray-800 dark:text-slate-200 mb-1 text-sm">Fórmulas de cálculo</h4>
          <ul className="text-sm text-gray-700 dark:text-slate-350 space-y-1">
            {reglas.length > 0 ? (
              reglas.map(reg => (
                <li key={reg.id}><span className="font-mono">{reg.unidad}:</span> {reg.formula}</li>
              ))
            ) : (
              <>
                <li><span className="font-mono">PU1:</span> (PFD + TAD + ELD*2)/4</li>
                <li><span className="font-mono">PU2:</span> (PFD + TAD*2 + ELD)/4</li>
                <li><span className="font-mono">PU3:</span> (PFD + TAD*2 + ELD)/4</li>
                <li><span className="font-mono">PP:</span> (PU1+PU2+PU3)/3</li>
              </>
            )}
          </ul>
          <p className="text-xs text-gray-600 dark:text-slate-400 mt-1">Nota aprobatoria: <span className="font-bold text-slate-800 dark:text-slate-200">14</span> (medio punto favorece al estudiante)</p>
        </div>

        {/* Tutoría (colapsable) */}
        <div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium"
          >
            {expanded ? '▼' : '▶'} Información de tutoría
          </button>
          {expanded && (
            <div className="mt-2 p-3 bg-gray-50 dark:bg-slate-900/60 border dark:border-slate-800 rounded text-sm text-slate-700 dark:text-slate-350">
              <p><span className="font-medium">Día:</span> {tutorInfo.dia}</p>
              <p><span className="font-medium">Horario:</span> {tutorInfo.horario}</p>
              <p><span className="font-medium">Email:</span> <a href={`mailto:${tutorInfo.email}`} className="text-blue-600 dark:text-blue-400 hover:underline">{tutorInfo.email}</a></p>
              <p><span className="font-medium">Canales:</span> {tutorInfo.canales}</p>
            </div>
          )}
        </div>

        {/* Aviso de fiabilidad si es subido no oficial */}
        {!selectedSyllabus.es_oficial && selectedSyllabus.aviso_fiabilidad && (
          <div className="mt-2 p-2 bg-yellow-50 dark:bg-amber-950/15 border border-yellow-200 dark:border-amber-900/50 rounded text-xs text-yellow-800 dark:text-amber-400">
            ⚠️ {selectedSyllabus.aviso_fiabilidad}
          </div>
        )}
      </div>
    </Card>
  );
};

export default SyllabusSummary;