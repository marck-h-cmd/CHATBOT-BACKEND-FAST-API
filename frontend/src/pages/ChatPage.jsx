import React, { useEffect, useRef } from 'react';
import { useChat } from '../contexts/ChatContext';
import { useSyllabus } from '../contexts/SyllabusContext';
import { useAuth } from '../contexts/AuthContext';
import SyllabusSelector from '../components/syllabus/SyllabusSelector';
import SyllabusSummary from '../components/syllabus/SyllabusSummary';
import ChatMessage from '../components/chat/ChatMessage';
import ChatInput from '../components/chat/ChatInput';
import TypingIndicator from '../components/chat/TypingIndicator';
import QuickReplies from '../components/chat/QuickReplies';
import Card from '../components/ui/Card';

const ChatPage = () => {
  const { messages, loading, sendMessage, currentResponse } = useChat();
  const { selectedSyllabusId } = useSyllabus();
  const { isAuthenticated } = useAuth();
  const messagesEndRef = useRef(null);

  // Auto-scroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (text) => {
    if (!selectedSyllabusId) {
      alert('Por favor selecciona un sílabo antes de preguntar.');
      return;
    }
    await sendMessage(text, selectedSyllabusId);
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
          {/* Columna izquierda: sílabo */}
          <div className="w-full space-y-4 overflow-y-auto min-h-0 lg:w-1/3 lg:max-w-sm">
            <SyllabusSelector />
            <SyllabusSummary />
          </div>

          {/* Columna derecha: chat */}
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <Card className="flex-1 flex flex-col overflow-hidden" padding={false}>
              {/* Área de mensajes con scroll interno */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-400 mt-10">
                    <p>🤖 Haz una pregunta sobre el sílabo</p>
                    <p className="text-sm mt-2">Ej: ¿Cómo se calcula PU1? o Simular con PFD=14, TAD=12, ELD=15</p>
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
                <ChatInput onSend={handleSend} isLoading={loading} />
                <QuickReplies onSelect={handleSend} lastIntent={currentResponse?.intencion} />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;