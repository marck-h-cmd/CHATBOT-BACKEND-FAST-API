import React, { useEffect, useRef, useState } from 'react';
import { useChat } from '../contexts/ChatContext';
import { useCourse } from '../contexts/CourseContext';
import { useAuth } from '../contexts/AuthContext';
import ChatMessage from '../components/chat/ChatMessage';
import ChatInput from '../components/chat/ChatInput';
import TypingIndicator from '../components/chat/TypingIndicator';
import QuickReplies from '../components/chat/QuickReplies';
import Card from '../components/ui/Card';

const ChatPage = () => {
  const { messages, loading, sendMessage, currentResponse } = useChat();
  const { enrollments, getEnrollmentByCourse } = useCourse();
  const { isAuthenticated } = useAuth();
  const messagesEndRef = useRef(null);
  
  // Estado para el contexto seleccionado
  const [selectedContextId, setSelectedContextId] = useState(null);
  const [selectedContext, setSelectedContext] = useState(null);

  // Auto-scroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (text) => {
    if (!selectedContextId) {
      alert('Por favor selecciona un curso/periodo antes de preguntar.');
      return;
    }
    await sendMessage(text, selectedContextId);
  };

  const handleContextSelect = (contexto) => {
    setSelectedContextId(contexto.id_contexto);
    setSelectedContext(contexto);
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card>
          <p className="text-gray-600">Inicia sesión para usar el chat.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 overflow-hidden">
        <div className="flex h-full min-h-0 flex-col gap-6 lg:flex-row">
          {/* Columna izquierda: contexto académico */}
          <div className="w-full space-y-4 overflow-y-auto min-h-0 lg:w-1/3 lg:max-w-sm">
            <Card title="Mis Cursos">
              {enrollments.length === 0 ? (
                <p className="text-gray-500 text-sm">No estás inscrito en ningún curso.</p>
              ) : (
                <div className="space-y-2">
                  {enrollments.map((ctx) => (
                    <div
                      key={ctx.id_contexto}
                      onClick={() => handleContextSelect(ctx)}
                      className={`p-3 rounded-lg cursor-pointer border transition-colors ${
                        selectedContextId === ctx.id_contexto
                          ? 'bg-blue-50 border-blue-500'
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <p className="font-medium">{ctx.curso}</p>
                      <p className="text-xs text-gray-500">{ctx.periodo}</p>
                      {ctx.silabo_validado && (
                        <span className="inline-block mt-1 text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                          ✅ Sílabo validado
                        </span>
                      )}
                      {!ctx.silabo_validado && (
                        <span className="inline-block mt-1 text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                          ⏳ Pendiente
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
            
            {selectedContext && (
              <Card title="Información del Curso">
                <p className="font-medium">{selectedContext.curso}</p>
                <p className="text-sm text-gray-500 mt-1">{selectedContext.periodo}</p>
                {selectedContext.silabo_validado && (
                  <p className="text-sm text-green-600 mt-2">✅ Puedes hacer cálculos académicos</p>
                )}
                {!selectedContext.silabo_validado && (
                  <p className="text-sm text-yellow-600 mt-2">⚠️ Solo consultas generales (cálculos bloqueados)</p>
                )}
              </Card>
            )}
          </div>

          {/* Columna derecha: chat */}
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <Card className="flex-1 flex flex-col overflow-hidden" padding={false}>
              {/* Área de mensajes con scroll interno */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-400 mt-10">
                    <p>🤖 {selectedContext ? 'Haz una pregunta sobre el sílabo' : 'Selecciona un curso para comenzar'}</p>
                    {selectedContext && (
                      <p className="text-sm mt-2">Ej: ¿Cómo se calcula PU1? o Simular con PFD=14, TAD=12, ELD=15</p>
                    )}
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <ChatMessage key={idx} message={msg} />
                  ))
                )}
                {loading && <TypingIndicator />}
                <div ref={messagesEndRef} />
              </div>

              {/* Footer fijo con input y quick replies */}
              <div className="shrink-0 border-t border-gray-200 bg-white">
                <ChatInput onSend={handleSend} isLoading={loading} disabled={!selectedContextId} />
                <QuickReplies onSelect={handleSend} lastIntent={currentResponse?.intent} />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;