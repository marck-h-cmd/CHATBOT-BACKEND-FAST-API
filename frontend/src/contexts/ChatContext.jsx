import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import * as chatAPI from '../api/chat';
import { handleApiError } from '../utils/errorHandler';
import { useAuth } from './AuthContext';

const ChatContext = createContext();

export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentResponse, setCurrentResponse] = useState(null);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  
  const { user } = useAuth();

  const clearMessages = () => {
    setMessages([]);
    setCurrentResponse(null);
    setCurrentSessionId(null);
  };
  
  // Limpiar estado de chat cuando cambia el usuario (logout/login)
  useEffect(() => {
    clearMessages();
  }, [user?.id]);

  const loadHistory = useCallback(async (idContexto) => {
    setLoading(true);
    try {
      // 1. Obtener sesiones para este contexto
      const sessions = await chatAPI.getSessions(idContexto);
      if (sessions && sessions.length > 0) {
        const lastSession = sessions[0]; // La más reciente
        setCurrentSessionId(lastSession.id_sesion);
        
        // 2. Cargar mensajes de esa sesión
        const history = await chatAPI.getHistory(lastSession.id_sesion);
        setMessages(history);
      } else {
        setMessages([]);
        setCurrentSessionId(null);
      }
    } catch (error) {
      console.error("Error cargando historial:", error);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const sendMessage = async (pregunta, idContexto, onChunk = null) => {
    // Preparar historial actual para mandarlo al backend (limitado para optimizar)
    const historial = messages.slice(-6).map(msg => ({ role: msg.role, content: msg.content }));

    // Añadir mensaje del usuario a la vista inmediatamente
    const userMessage = { role: 'user', content: pregunta, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);

    try {
      const response = await chatAPI.sendQuestion(pregunta, idContexto, historial, currentSessionId);
      
      // Actualizar sesión si es nueva o cambió
      if (response.id_sesion && response.id_sesion !== currentSessionId) {
        setCurrentSessionId(response.id_sesion);
      }

      const botMessage = {
        role: 'assistant',
        content: response.respuesta,
        intent: response.intent,
        riesgo: response.riesgo,
        sugerencia: response.sugerencia,
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

  const value = {
    messages,
    loading,
    currentResponse,
    currentSessionId,
    sendMessage,
    loadHistory,
    clearMessages,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
