import React, { useState } from 'react';
import Button from '../ui/Button';

const EscalationAlert = ({ escalations = [], onDismiss, onViewDetails }) => {
  const [dismissed, setDismissed] = useState(false);

  if (!escalations || escalations.length === 0 || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    if (onDismiss) onDismiss();
  };

  return (
    <div className="bg-orange-50 dark:bg-orange-950/20 border-l-4 border-orange-500 dark:border-orange-600 rounded-r-lg p-4 mb-4 shadow-sm transition-colors duration-200">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">⚠️</span>
          <div>
            <h4 className="font-semibold text-orange-800 dark:text-orange-200">Escalamiento a tutoría</h4>
            <p className="text-sm text-orange-700 dark:text-orange-300">
              {escalations.length} incidente{escalations.length !== 1 ? 's' : ''} ha{escalations.length === 1 ? '' : 'n'} sido escalado{escalations.length === 1 ? '' : 's'} a nivel 2.
              {escalations.length > 0 && ` Revisa el más reciente: ${escalations[0].recomendacion || 'Se requiere atención docente'}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {onViewDetails && (
            <Button size="sm" variant="outline" onClick={onViewDetails}>
              Ver detalles
            </Button>
          )}
          <button
            onClick={handleDismiss}
            className="text-orange-500 hover:text-orange-700"
            aria-label="Cerrar alerta"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};

export default EscalationAlert;