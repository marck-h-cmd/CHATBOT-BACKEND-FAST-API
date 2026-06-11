import React from 'react';
import Card from '../ui/Card';

const SyllabusPdfViewer = ({ pdfPath, title }) => {
  if (!pdfPath) return null;

  // Construir la URL completa para el PDF
  const pdfUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${pdfPath}`;

  return (
    <Card title={`Documento Original: ${title || 'Sílabo'}`}>
      <div className="space-y-4">
        {/* Contenedor del Iframe con altura y ancho responsivo */}
        <div className="w-full h-[550px] border border-gray-200 dark:border-slate-800 rounded-lg overflow-hidden bg-gray-50 dark:bg-slate-900/60 shadow-inner">
          <iframe
            src={`${pdfUrl}#toolbar=0`}
            title={`Vista previa de ${title || 'Sílabo'}`}
            className="w-full h-full border-0"
          />
        </div>

        {/* Acciones de accesibilidad y descarga */}
        <div className="flex flex-wrap gap-3 justify-between items-center bg-gray-50 dark:bg-slate-900/40 p-3 rounded-lg border dark:border-slate-800 text-xs">
          <div className="text-gray-500 dark:text-slate-400">
            ¿No puedes visualizar el documento? Ábrelo directamente.
          </div>
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Abrir en nueva pestaña
          </a>
        </div>
      </div>
    </Card>
  );
};

export default SyllabusPdfViewer;
