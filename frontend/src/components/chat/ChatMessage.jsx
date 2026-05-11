import React from 'react';
import { formatDateTime, formatGrade } from '../../utils/formatters';

const ChatMessage = ({ message }) => {
  const isUser = message.role === 'user';
  const isError = message.isError;
  const riesgo = message.riesgo;
  const fragmentos = message.fragmentos;

  // Función para resaltar números en el texto (notas, promedios)
  const formatContent = (content) => {
    if (!content) return '';
    // Resalta números que parecen notas (decimales)
    return content.replace(/(\d+(?:\.\d+)?)/g, (match) => {
      const num = parseFloat(match);
      if (!isNaN(num) && num >= 0 && num <= 20) {
        return `<span class="font-bold text-blue-600">${formatGrade(num)}</span>`;
      }
      return match;
    });
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`
          max-w-[80%] rounded-lg px-4 py-2
          ${isUser 
            ? 'bg-blue-600 text-white rounded-br-none' 
            : isError 
              ? 'bg-red-100 text-red-800 border border-red-200 rounded-bl-none'
              : 'bg-gray-100 text-gray-800 rounded-bl-none'
          }
        `}
      >
        {/* Cabecera del mensaje */}
        <div className="flex justify-between items-center mb-1 text-xs opacity-75">
          <span className="font-medium">
            {isUser ? 'Tú' : 'Chatbot Académico'}
          </span>
          <span className="ml-4">
            {formatDateTime(message.timestamp)}
          </span>
        </div>

        {/* Contenido del mensaje */}
        <div
          className="text-sm whitespace-pre-wrap"
          dangerouslySetInnerHTML={{ __html: formatContent(message.content) }}
        />

        {/* Alerta de riesgo académico (solo mensajes del bot) */}
        {!isUser && riesgo && (
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
            <span className="font-medium text-yellow-800">⚠️ Alerta académica:</span>{' '}
            {riesgo === 'MUY_ALTO' && 'Riesgo muy alto de desaprobación. ¡Consulta con tutoría!'}
            {riesgo === 'ALTO' && 'Riesgo alto de desaprobación. Recomendamos buscar asesoría.'}
            {riesgo === 'MEDIO' && 'Riesgo medio. Mejora tu desempeño en las siguientes unidades.'}
          </div>
        )}

        {/* Fragmentos citados (fuentes del RAG) */}
        {!isUser && fragmentos && fragmentos.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-200 text-xs">
            <details>
              <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                📚 Ver fuentes utilizadas ({fragmentos.length})
              </summary>
              <div className="mt-1 space-y-1">
                {fragmentos.map((f, idx) => (
                  <div key={idx} className="bg-white p-1 rounded text-gray-600">
                    {f.substring(0, 150)}...
                  </div>
                ))}
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;