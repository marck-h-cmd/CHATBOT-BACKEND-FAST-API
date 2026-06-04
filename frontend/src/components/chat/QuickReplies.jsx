import React from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, Calculator, HelpCircle } from 'lucide-react';

const SUGGESTIONS = {
  general: [
    { text: '¿Cuánto tiempo debería estudiar?', icon: <Lightbulb className="w-3.5 h-3.5" /> },
    { text: 'Simular promedio con 14 en todo', icon: <Calculator className="w-3.5 h-3.5" /> },
    { text: '¿Cuál es mi riesgo académico?', icon: <HelpCircle className="w-3.5 h-3.5" /> }
  ],
  simulation: [
    { text: '¿Qué nota necesito en la siguiente unidad?', icon: <Calculator className="w-3.5 h-3.5" /> },
    { text: '¿Cómo distribuyo mi tiempo para aprobar?', icon: <Lightbulb className="w-3.5 h-3.5" /> }
  ]
};

const QuickReplies = ({ onSelect, lastIntent, disabled = false }) => {
  const replies = lastIntent === 'simulation' ? SUGGESTIONS.simulation : SUGGESTIONS.general;

  return (
    <div className={`flex flex-wrap gap-2 ${disabled ? 'pointer-events-none opacity-50' : ''}`}>
      {replies.map((reply, idx) => (
        <motion.button
          key={idx}
          initial={{ opacity: 0, y: 8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.25, delay: idx * 0.08 }}
          whileHover={{ scale: 1.02 }}
          disabled={disabled}
          whileTap={{ scale: 0.97 }}
          onClick={() => onSelect(reply.text)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-[#131A2C] border border-slate-200 dark:border-slate-800/80 text-slate-600 dark:text-slate-350 text-xs font-bold rounded-2xl shadow-sm hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
        >
          {reply.icon}
          {reply.text}
        </motion.button>
      ))}
    </div>
  );
};

export default QuickReplies;