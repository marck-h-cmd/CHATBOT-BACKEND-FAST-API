import React from 'react';

// Sugerencias predeterminadas relacionadas con el sílabo
const DEFAULT_SUGGESTIONS = [
  { text: "¿Cómo se calcula PU1?", intent: "calcular_promedio" },
  { text: "Simular notas: PFD=14, TAD=12, ELD=15", intent: "simular_notas" },
  { text: "¿Qué peso tiene TAD?", intent: "consultar_peso" },
  { text: "¿Necesito tutoría?", intent: "evaluar_riesgo" },
  { text: "Horarios de tutoría", intent: "consultar_tutoria" },
];

// Sugerencias dinámicas según la última intención (opcional)
const getSuggestionsByIntent = (lastIntent) => {
  if (lastIntent === 'calcular_promedio') {
    return [
      { text: "Simular PU1 con PFD=15, TAD=12, ELD=10" },
      { text: "¿Y el promedio promocional?" },
    ];
  }
  if (lastIntent === 'simular_notas') {
    return [
      { text: "¿Apruebo con esas notas?" },
      { text: "¿Qué nota necesito en PU3?" },
    ];
  }
  return DEFAULT_SUGGESTIONS;
};

const QuickReplies = ({ onSelect, lastIntent = null }) => {
  const suggestions = lastIntent ? getSuggestionsByIntent(lastIntent) : DEFAULT_SUGGESTIONS;

  const handleClick = (text) => {
    onSelect(text);
  };

  return (
    <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 overflow-x-auto">
      <div className="flex gap-2">
        {suggestions.map((sugg, idx) => (
          <button
            key={idx}
            onClick={() => handleClick(sugg.text)}
            className="px-3 py-1.5 bg-white border border-gray-300 rounded-full text-sm text-gray-700 hover:bg-blue-50 hover:border-blue-300 transition-colors whitespace-nowrap"
          >
            {sugg.text}
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickReplies;