import React, { useState } from 'react';
import { formatDateTime, formatGrade } from '../../utils/formatters';
import Card from '../ui/Card';
import Button from '../ui/Button';

const IncidentList = ({ incidents, onRefresh, loading = false }) => {
  const [filter, setFilter] = useState('all'); // all, active, resolved

  if (!incidents || incidents.length === 0) {
    return (
      <Card title="Incidentes académicos">
        <p className="text-slate-500 dark:text-slate-400 text-center py-4">No hay incidentes registrados.</p>
      </Card>
    );
  }

  const filteredIncidents = incidents.filter(inc => {
    if (filter === 'active') return !inc.resuelto;
    if (filter === 'resolved') return inc.resuelto;
    return true;
  });

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'MUY_ALTO': return 'bg-red-100 dark:bg-red-950/20 text-red-800 dark:text-red-300 border-red-200 dark:border-red-900/50';
      case 'ALTO': return 'bg-orange-100 dark:bg-orange-950/20 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-900/50';
      case 'MEDIO': return 'bg-yellow-100 dark:bg-yellow-950/20 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-900/50';
      default: return 'bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-200 border-gray-200 dark:border-slate-700';
    }
  };

  const getSeverityText = (severity) => {
    switch (severity) {
      case 'MUY_ALTO': return 'Muy alto';
      case 'ALTO': return 'Alto';
      case 'MEDIO': return 'Medio';
      default: return severity || 'No especificado';
    }
  };

  return (
    <Card title="Incidentes académicos">
      <div className="flex gap-2 mb-4">
        <Button 
          variant={filter === 'all' ? 'primary' : 'outline'} 
          size="sm"
          onClick={() => setFilter('all')}
        >
          Todos
        </Button>
        <Button 
          variant={filter === 'active' ? 'primary' : 'outline'} 
          size="sm"
          onClick={() => setFilter('active')}
        >
          Activos
        </Button>
        <Button 
          variant={filter === 'resolved' ? 'primary' : 'outline'} 
          size="sm"
          onClick={() => setFilter('resolved')}
        >
          Resueltos
        </Button>
        {onRefresh && (
          <Button variant="outline" size="sm" onClick={onRefresh} loading={loading}>
            ↻
          </Button>
        )}
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {filteredIncidents.map((inc) => (
          <div
            key={inc.id}
            className={`border rounded-lg p-3 ${getSeverityColor(inc.severidad)}`}
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="font-medium">Estudiante:</span> {inc.usuario?.nombres || `ID ${inc.usuario?.id}`}
              </div>
              <span className="text-xs opacity-70">
                {formatDateTime(inc.fecha_creacion)}
              </span>
            </div>
            <div className="mt-1 text-sm">
              <span className="font-medium">Promedio actual:</span> {formatGrade(inc.promedio_actual)}<br />
              <span className="font-medium">Nota necesaria:</span> {inc.nota_necesaria ? formatGrade(inc.nota_necesaria) : '—'}<br />
              <span className="font-medium">Recomendación:</span> {inc.recomendacion || 'Consultar con tutoría'}
            </div>
            <div className="mt-2 flex justify-between items-center">
              <span className="text-xs px-2 py-0.5 bg-white dark:bg-slate-900/60 bg-opacity-50 dark:bg-opacity-100 rounded-full border border-black/5 dark:border-white/5">
                Severidad: {getSeverityText(inc.severidad)}
              </span>
              {inc.resuelto ? (
                <span className="text-xs text-green-700 dark:text-green-400 font-semibold">✓ Resuelto</span>
              ) : (
                <span className="text-xs text-red-700 dark:text-red-400 font-semibold">⚠️ Activo</span>
              )}
            </div>
          </div>
        ))}
        {filteredIncidents.length === 0 && (
          <p className="text-slate-500 dark:text-slate-400 text-center py-4">No hay incidentes con este filtro.</p>
        )}
      </div>
    </Card>
  );
};

export default IncidentList;