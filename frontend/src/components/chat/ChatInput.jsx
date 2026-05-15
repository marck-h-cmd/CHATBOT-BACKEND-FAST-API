import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, CornerDownLeft } from 'lucide-react';

const ChatInput = ({ onSend, isLoading, disabled = false, placeholder = "Haz una pregunta..." }) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef(null);

  // Ajustar altura automática del textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && !isLoading && !disabled) {
      onSend(input.trim());
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div 
        className={`flex items-end bg-white border rounded-2xl overflow-hidden transition-all duration-200 shadow-sm ${
          disabled 
            ? 'border-slate-200 bg-slate-50 opacity-70' 
            : 'border-slate-300 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 focus-within:shadow-md'
        }`}
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? "Selecciona un curso primero..." : placeholder}
          disabled={isLoading || disabled}
          rows={1}
          className="flex-1 max-h-[120px] resize-none bg-transparent px-4 py-3.5 focus:outline-none text-slate-700 placeholder-slate-400 disabled:cursor-not-allowed leading-relaxed no-scrollbar"
        />
        
        <div className="p-2 shrink-0">
          <motion.button
            whileHover={!disabled && !isLoading ? { scale: 1.05 } : {}}
            whileTap={!disabled && !isLoading ? { scale: 0.95 } : {}}
            type="submit"
            disabled={!input.trim() || isLoading || disabled}
            className={`flex items-center justify-center w-10 h-10 rounded-xl transition-colors ${
              !input.trim() || isLoading || disabled
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
            }`}
          >
            {isLoading ? (
              <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <Send className="w-4 h-4 ml-0.5" />
            )}
          </motion.button>
        </div>
      </div>
      
      <div className="absolute -bottom-6 right-1 flex items-center gap-1.5 text-[10px] font-medium text-slate-400 opacity-80 pointer-events-none">
        <span className="flex items-center gap-0.5 bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">
          <CornerDownLeft className="w-3 h-3" /> Enter
        </span>
        para enviar
      </div>
    </form>
  );
};

export default ChatInput;