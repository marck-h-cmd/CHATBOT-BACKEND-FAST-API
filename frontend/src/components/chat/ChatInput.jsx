import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowUp } from 'lucide-react';

const ChatInput = ({ onSend, isLoading, disabled = false, placeholder = "Envía un mensaje a Sylia..." }) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
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
    <form onSubmit={handleSubmit} className="relative group w-full">
      <div
        className={`flex items-end bg-slate-100 dark:bg-slate-900 border border-transparent dark:border-slate-800/80 rounded-3xl overflow-hidden transition-all duration-200 ${
          disabled
            ? 'opacity-60 cursor-not-allowed'
            : 'focus-within:bg-white dark:focus-within:bg-slate-950 focus-within:border-slate-300 dark:focus-within:border-slate-700 focus-within:shadow-sm hover:border-slate-200 dark:hover:border-slate-800'
        }`}
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? "Selecciona un curso en la barra lateral para empezar" : placeholder}
          disabled={isLoading || disabled}
          rows={1}
          className="flex-1 max-h-[150px] resize-none bg-transparent pl-5 pr-3 py-3.5 focus:outline-none text-[15px] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 disabled:cursor-not-allowed leading-relaxed no-scrollbar"
        />

        <div className="p-2 shrink-0 self-end mb-0.5 mr-0.5">
          <button
            type="submit"
            disabled={!input.trim() || isLoading || disabled}
            className={`flex items-center justify-center w-9 h-9 rounded-full transition-all duration-200 ${
              !input.trim() || isLoading || disabled
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-650 cursor-not-allowed'
                : 'bg-slate-900 dark:bg-indigo-650 text-white hover:bg-slate-800 dark:hover:bg-indigo-500 active:scale-95'
            }`}
          >
            {isLoading ? (
              <div className="w-4 h-4 border-[2px] border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <ArrowUp className="w-[18px] h-[18px] stroke-[2.5]" />
            )}
          </button>
        </div>
      </div>
    </form>
  );
};

export default ChatInput;