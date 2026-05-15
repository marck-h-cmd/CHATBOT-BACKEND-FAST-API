import React, { useEffect, useRef, useState } from 'react';
import { useChat } from '../contexts/ChatContext';
import { useCourse } from '../contexts/CourseContext';
import { useAuth } from '../contexts/AuthContext';
import ChatMessage from '../components/chat/ChatMessage';
import ChatInput from '../components/chat/ChatInput';
import TypingIndicator from '../components/chat/TypingIndicator';
import QuickReplies from '../components/chat/QuickReplies';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, CheckCircle, Clock, Bot, Info, ShieldAlert, Sparkles, MessageSquare } from 'lucide-react';

const ChatPage = () => {
  const { messages, loading, sendMessage, currentResponse } = useChat();
  const { enrollments } = useCourse();
  const { isAuthenticated } = useAuth();
  const messagesEndRef = useRef(null);
  
  const [selectedContextId, setSelectedContextId] = useState(null);
  const [selectedContext, setSelectedContext] = useState(null);

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
      <div className="flex items-center justify-center min-h-[80vh] bg-slate-50">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-slate-200 shadow-xl p-8 rounded-2xl max-w-md w-full text-center"
        >
          <ShieldAlert className="w-16 h-16 text-indigo-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Acceso Denegado</h2>
          <p className="text-gray-600">Inicia sesión para usar el asistente de inteligencia artificial.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden bg-slate-50">
      <div className="flex-1 min-h-0 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 overflow-hidden">
        <div className="flex h-full min-h-0 flex-col gap-6 lg:flex-row">
          
          {/* Sidebar Izquierdo: Cursos */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full space-y-6 overflow-y-auto no-scrollbar min-h-0 lg:w-80 shrink-0"
          >
            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 flex flex-col gap-4">
              <div className="flex items-center gap-2 text-indigo-600 mb-2">
                <BookOpen className="w-5 h-5" />
                <h3 className="font-semibold text-lg">Mis Cursos</h3>
              </div>
              
              {enrollments.length === 0 ? (
                <div className="text-center py-8">
                  <div className="bg-indigo-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Info className="w-6 h-6 text-indigo-400" />
                  </div>
                  <p className="text-gray-500 text-sm">No estás inscrito en ningún curso.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {enrollments.map((ctx) => {
                    const isSelected = selectedContextId === ctx.id_contexto;
                    return (
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        key={ctx.id_contexto}
                        onClick={() => handleContextSelect(ctx)}
                        className={`p-4 rounded-xl cursor-pointer transition-all duration-300 ${
                          isSelected
                            ? 'bg-slate-900 text-white shadow-md'
                            : 'bg-slate-50 hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        <p className={`font-semibold line-clamp-2 ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                          {ctx.curso}
                        </p>
                        <p className={`text-xs mt-1 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                          {ctx.periodo}
                        </p>
                        
                        <div className="mt-3 flex items-center gap-1.5">
                          {ctx.silabo_validado ? (
                            <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold px-2 py-1 rounded-full ${isSelected ? 'bg-slate-700 text-slate-100' : 'bg-emerald-100 text-emerald-700'}`}>
                              <CheckCircle className="w-3 h-3" /> Validado
                            </span>
                          ) : (
                            <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold px-2 py-1 rounded-full ${isSelected ? 'bg-slate-700 text-slate-100' : 'bg-amber-100 text-amber-700'}`}>
                              <Clock className="w-3 h-3" /> Pendiente
                            </span>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            <AnimatePresence>
              {selectedContext && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5"
                >
                  <div className="flex items-center gap-2 text-indigo-600 mb-3">
                    <Info className="w-5 h-5" />
                    <h3 className="font-semibold text-lg">Contexto Activo</h3>
                  </div>
                  <p className="font-medium text-gray-800">{selectedContext.curso}</p>
                  <p className="text-sm text-gray-500 mt-1">{selectedContext.periodo}</p>
                  
                  <div className={`mt-4 p-3 rounded-xl text-sm flex gap-3 items-start ${selectedContext.silabo_validado ? 'bg-indigo-50 text-indigo-800' : 'bg-amber-50 text-amber-800'}`}>
                    {selectedContext.silabo_validado ? (
                      <>
                        <Sparkles className="w-5 h-5 shrink-0 text-indigo-500" />
                        <p>Modo avanzado activado. Puedes realizar consultas complejas y simulaciones de notas.</p>
                      </>
                    ) : (
                      <>
                        <ShieldAlert className="w-5 h-5 shrink-0 text-amber-500" />
                        <p>Sílabo en revisión. Solo están disponibles consultas teóricas generales.</p>
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Columna Derecha: Chat Area */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex-1 min-h-0 flex flex-col overflow-hidden bg-white border border-slate-200 rounded-3xl shadow-lg"
          >
            {/* Header del Chat */}
            <div className="px-6 py-4 border-b border-slate-100 bg-white flex justify-between items-center z-10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center shadow-sm shrink-0">
                  <img src="/logo.png" alt="Sylia Logo" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-800">Sylia</h2>
                  <p className="text-xs text-slate-500 font-medium">{selectedContext ? `Conectada a ${selectedContext.curso}` : 'Lista para ayudarte'}</p>
                </div>
              </div>
            </div>

            {/* Área de mensajes con scroll interno */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0 no-scrollbar scroll-smooth">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-70">
                  <div className="w-20 h-20 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-6">
                    <MessageSquare className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 mb-2">
                    {selectedContext ? '¡Hola! ¿En qué puedo ayudarte?' : 'Comencemos'}
                  </h3>
                  <p className="text-slate-500 max-w-xs">
                    {selectedContext 
                      ? 'Pregúntame sobre evaluaciones, fechas, fórmulas o reglas del curso.' 
                      : 'Selecciona un curso en el panel izquierdo para inicializar mi contexto.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {messages.map((msg, idx) => (
                    <ChatMessage key={idx} message={msg} />
                  ))}
                  {loading && <TypingIndicator />}
                </div>
              )}
              <div ref={messagesEndRef} className="h-4" />
            </div>

            {/* Footer fijo con input y quick replies */}
            <div className="shrink-0 bg-white border-t border-slate-100 p-4 relative z-10">
              <div className="max-w-4xl mx-auto">
                <QuickReplies onSelect={handleSend} lastIntent={currentResponse?.intent} />
                <div className="mt-3">
                  <ChatInput onSend={handleSend} isLoading={loading} disabled={!selectedContextId} />
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
};

export default ChatPage;