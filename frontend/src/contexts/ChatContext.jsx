import React, { createContext, useState, useContext, useCallback } from 'react';
import * as chatAPI from '../api/chat';
import { handleApiError } from '../utils/errorHandler';

const ChatContext = createContext();

export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentResponse, setCurrentResponse] = useState(null);

  const sendMessage = async (pregunta, idContexto, onChunk = null) => {
    // Preparar historial actual (sin el nuevo mensaje de usuario) para mandarlo al backend
    const historial = messages.map(msg => ({ role: msg.role, content: msg.content }));

    // Añadir mensaje del usuario a la vista
    const userMessage = { role: 'user', content: pregunta, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);

    try {
      const response = await chatAPI.sendQuestion(pregunta, idContexto, historial);
      const botMessage = {
        role: 'assistant',
        content: response.respuesta,
        intent: response.intent,
        riesgo: response.riesgo,
        fragmentos: response.fragmentos_usados,
        escalado: response.escalado,
        tiempoMs: response.tiempo_ms,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, botMessage]);
      setCurrentResponse(response);
      return response;
    } catch (error) {
      const errorInfo = handleApiError(error);
      const errorMessage = {
        role: 'assistant',
        content: `❌ Error: ${errorInfo.message}`,
        isError: true,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const clearMessages = () => {
    setMessages([]);
    setCurrentResponse(null);
  };

  const value = {
    messages,
    loading,
    currentResponse,
    sendMessage,
    clearMessages,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};