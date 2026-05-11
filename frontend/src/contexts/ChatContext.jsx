import React, { createContext, useState, useContext, useCallback } from 'react';
import * as chatAPI from '../api/chat';
import { handleApiError } from '../utils/errorHandler';

const ChatContext = createContext();

export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentResponse, setCurrentResponse] = useState(null);

  const sendMessage = async (pregunta, idSilabo, onChunk = null) => {
    // Añadir mensaje del usuario
    const userMessage = { role: 'user', content: pregunta, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);

    try {
      const response = await chatAPI.sendQuestion(pregunta, idSilabo);
      const botMessage = {
        role: 'assistant',
        content: response.respuesta,
        intent: response.intencion,
        riesgo: response.riesgo,
        fragmentos: response.fragmentos_usados,
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