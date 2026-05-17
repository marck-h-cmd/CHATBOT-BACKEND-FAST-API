import React from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, Calculator, HelpCircle } from 'lucide-react';

const SUGGESTIONS = {
  general: [
    { text: '¿Cuánto tiempo debería estudiar para el ELD?', icon: <Lightbulb className="w-3.5 h-3.5" /> },
    { text: 'Simular promedio con 14 en todo', icon: <Calculator className="w-3.5 h-3.5" /> }
  ],
  simulation: [
    { text: '¿Qué nota necesito en la siguiente unidad?', icon: <Calculator className="w-3.5 h-3.5" /> },
    { text: '¿Cómo distribuyo mi tiempo para aprobar?', icon: <Lightbulb className="w-3.5 h-3.5" /> }
  ]
};

const QuickReplies = ({ onSelect, lastIntent }) => {
  const replies = lastIntent === 'simulation' ? SUGGESTIONS.simulation : SUGGESTIONS.general;

  return (
    <div className="flex flex-wrap gap-2">
      {replies.map((reply, idx) => (
        <motion.button
          key={idx}
          initial={{ opacity: 0, y: 10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.3, delay: idx * 0.1 }}
          whileHover={{ scale: 1.03, backgroundColor: '#f1f5f9' }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onSelect(reply.text)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-medium rounded-full shadow-sm hover:text-indigo-600 hover:border-indigo-200 transition-colors"
        >
          {reply.icon}
          {reply.text}
        </motion.button>
      ))}
    </div>
  );
};

export default QuickReplies;