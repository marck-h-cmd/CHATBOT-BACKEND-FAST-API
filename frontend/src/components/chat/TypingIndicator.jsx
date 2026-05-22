import React from 'react';
import { motion } from 'framer-motion';

const TypingIndicator = () => {
  return (
    <div className="flex w-full justify-start mb-6">
      <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 mr-3 border border-slate-200 mt-1 bg-white shadow-sm flex items-center justify-center">
        <img src="/logo.png" alt="Sylia" className="w-6 h-6 object-contain" />
      </div>

      <div className="flex flex-col max-w-[85%] items-start">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1.5 text-[11px] text-slate-400 font-bold px-1 tracking-wide">
          <span className="text-slate-700">Sylia</span>
          <span className="text-blue-600 animate-pulse font-semibold">escribiendo...</span>
        </div>

        {/* Bubble */}
        <div className="px-5 py-4 shadow-sm bg-white border border-slate-200 rounded-3xl rounded-tl-sm flex items-center gap-1.5 h-[52px]">
          <motion.div
            animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: 0 }}
            className="w-2 h-2 bg-blue-600 rounded-full"
          />
          <motion.div
            animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }}
            className="w-2 h-2 bg-blue-600 rounded-full"
          />
          <motion.div
            animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }}
            className="w-2 h-2 bg-blue-600 rounded-full"
          />
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;