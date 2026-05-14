import React, { useState, useRef, useEffect } from 'react';
import Button from '../ui/Button';

const ChatInput = ({ onSend, isLoading, disabled = false, placeholder = "Escribe tu pregunta aquí..." }) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef(null);

  // Ajustar altura automática del textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSend(input.trim());
      setInput('');
      // resetear altura
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isLoading || disabled}
          rows={1}
          className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
        />
        <Button
          type="submit"
          disabled={!input.trim() || isLoading}
          loading={isLoading}
          size="md"
        >
          Enviar
        </Button>
      </div>
      <div className="text-xs text-gray-400 mt-1 text-right">
        Shift+Enter para nueva línea | Enter para enviar
      </div>
    </form>
  );
};

export default ChatInput;