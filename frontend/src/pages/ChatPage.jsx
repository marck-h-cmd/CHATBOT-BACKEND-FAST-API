import React, { useEffect, useRef, useState } from 'react';
import { useChat } from '../contexts/ChatContext';
import { useCourse } from '../contexts/CourseContext';
import { useAuth } from '../contexts/AuthContext';
import { useOnboarding } from '../contexts/OnboardingContext';
import ChatMessage from '../components/chat/ChatMessage';
import ChatInput from '../components/chat/ChatInput';
import TypingIndicator from '../components/chat/TypingIndicator';
import QuickReplies from '../components/chat/QuickReplies';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, CheckCircle, Clock, Info, ShieldAlert, Zap, Menu, X, Search } from 'lucide-react';

const ChatPage = () => {
  const { messages, loading, sendMessage, currentResponse, loadHistory } = useChat();
  const { enrollments } = useCourse();
  const { isAuthenticated } = useAuth();
  const { running, currentStep } = useOnboarding();
  const messagesEndRef = useRef(null);
  
  const [selectedContextId, setSelectedContextId] = useState(null);
  const [selectedContext, setSelectedContext] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!running || !currentStep?.id || window.innerWidth >= 1024) {
      return;
    }

    let resizeTimer;

    if (currentStep.id === 'chat-context') {
      setSidebarOpen(true);
      // Force spotlight recalculation after drawer transition.
      resizeTimer = setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 350);
    }

    if (currentStep.id === 'chat-input') {
      setSidebarOpen(false);
      resizeTimer = setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 350);
    }

    return () => {
      if (resizeTimer) clearTimeout(resizeTimer);
    };
  }, [running, currentStep?.id]);

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
    loadHistory(contexto.id_contexto); // Cargar historial al seleccionar
    
    if (window.innerWidth < 1024) {
      setSidebarOpen(false); // Cierra drawer en móviles al seleccionar
    }
  };


  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[80vh] bg-[#FAF9F6]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-slate-200 shadow-sm p-10 rounded-3xl max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <ShieldAlert className="w-8 h-8 text-slate-400" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2 tracking-tight">Acceso Denegado</h2>
          <p className="text-slate-500 text-sm font-medium">Inicia sesión para usar el asistente de inteligencia artificial.</p>
        </motion.div>
      </div>
    );
  }

  const filteredEnrollments = enrollments.filter(ctx => 
    ctx.curso.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ctx.periodo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Agrupar por periodo
  const groupedEnrollments = filteredEnrollments.reduce((acc, ctx) => {
    const periodo = ctx.periodo || 'Otros';
    if (!acc[periodo]) acc[periodo] = [];
    acc[periodo].push(ctx);
    return acc;
  }, {});

  // Ordenar periodos (más reciente primero)
  const sortedPeriods = Object.keys(groupedEnrollments).sort((a, b) => b.localeCompare(a));

  return (
    <div className="h-full w-full flex bg-[#FAF9F6] overflow-hidden relative font-['Plus_Jakarta_Sans',sans-serif]">

      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/30 z-40 lg:hidden transition-opacity backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        data-tour="student-chat-sidebar"
        className={`
        fixed inset-y-0 left-0 z-50 w-[300px] bg-white border-r border-slate-100 transform transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0 shrink-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
      >
        {/* Mobile close */}
        <div className="absolute top-3 right-3 lg:hidden z-10">
          <button onClick={() => setSidebarOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col h-full">
          <div className="p-5 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-2.5 text-slate-900 mb-4">
              <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center shadow-sm">
                <BookOpen className="w-4 h-4 text-white" />
              </div>
              <h3 className="font-extrabold text-base tracking-tight">Mis Cursos</h3>
            </div>

            {/* Buscador */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-slate-400 group-focus-within:text-slate-600 transition-colors" />
              </div>
              <input
                type="text"
                placeholder="Buscar curso o periodo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-2xl py-2.5 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300 transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-6 no-scrollbar">
            {enrollments.length === 0 ? (
              <div className="text-center py-12 px-4">
                <div className="bg-slate-50 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                  <Info className="w-5 h-5 text-slate-400" />
                </div>
                <p className="text-slate-500 text-sm font-semibold">Aún no estás inscrito en ningún curso.</p>
              </div>
            ) : sortedPeriods.length === 0 ? (
              <div className="text-center py-12 px-4">
                <p className="text-slate-400 text-sm font-medium">No se encontraron cursos con "{searchTerm}"</p>
              </div>
            ) : (
              sortedPeriods.map(periodo => (
                <div key={periodo} className="space-y-2">
                  <div className="flex items-center gap-2 px-2 py-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{periodo}</span>
                    <div className="h-px flex-1 bg-slate-100"></div>
                  </div>

                  <div className="space-y-1">
                    {groupedEnrollments[periodo].map((ctx) => {
                      const isSelected = selectedContextId === ctx.id_contexto;
                      return (
                        <motion.div
                          whileHover={{ x: 2 }}
                          whileTap={{ scale: 0.98 }}
                          key={ctx.id_contexto}
                          onClick={() => handleContextSelect(ctx)}
                          className={`group p-3 rounded-2xl cursor-pointer transition-all duration-200 border-2 flex items-center gap-3 ${
                            isSelected
                              ? 'bg-slate-50 border-slate-900 shadow-sm'
                              : 'bg-transparent border-transparent hover:bg-slate-50 hover:border-slate-100'
                          }`}
                        >
                          <div className={`w-1.5 h-8 rounded-full shrink-0 transition-all ${
                            isSelected ? 'bg-slate-900' : 'bg-transparent group-hover:bg-slate-300'
                          }`} />

                          <div className="flex-1 min-w-0">
                            <p className={`font-bold truncate text-[13px] mb-0.5 ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>
                              {ctx.curso}
                            </p>
                            <div className="flex items-center gap-2">
                               <span className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${
                                 ctx.silabo_validado ? 'text-emerald-600' : 'text-amber-600'
                               }`}>
                                 <div className={`w-1.5 h-1.5 rounded-full ${ctx.silabo_validado ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                                 {ctx.silabo_validado ? 'OFICIAL' : 'PENDIENTE'}
                               </span>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {selectedContext && (
            <div className="shrink-0 p-4 border-t border-slate-100 bg-white">
              <div className="flex items-center gap-2 mb-2 px-1">
                <Zap className="w-3.5 h-3.5 text-blue-600" />
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estado del Asistente</h4>
              </div>
              <div className={`p-3.5 rounded-2xl text-xs flex items-center gap-3 border ${
                selectedContext.silabo_validado
                  ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                  : 'bg-amber-50 border-amber-100 text-amber-800'
              }`}>
                <div className={`shrink-0 w-7 h-7 rounded-xl flex items-center justify-center ${
                  selectedContext.silabo_validado ? 'bg-emerald-100' : 'bg-amber-100'
                }`}>
                  {selectedContext.silabo_validado ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                </div>
                <p className="font-semibold leading-snug text-[11px]">
                  {selectedContext.silabo_validado
                    ? 'Base de conocimiento completa y validada.'
                    : 'Sílabo en validación. Algunas funciones están limitadas.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-[#FAF9F6]">

        {/* Mobile Header */}
        <div className="lg:hidden shrink-0 h-14 border-b border-slate-100 flex items-center px-4 gap-3 bg-white/80 backdrop-blur-md sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center shadow-sm">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900 text-sm tracking-tight">Sylia</span>
          </div>
        </div>

        {/* Mensajes */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 py-6 scroll-smooth">
          <div className="max-w-3xl mx-auto w-full flex flex-col">
            <div className="flex flex-col space-y-6">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.4 }}
                    className="w-20 h-20 bg-white border border-slate-200 rounded-3xl flex items-center justify-center mb-6 shadow-sm overflow-hidden p-4"
                  >
                    <img src="/logo.png" alt="Sylia" className="w-full h-full object-contain" />
                  </motion.div>
                  <h3 className="text-2xl font-extrabold text-slate-900 mb-2 tracking-tight">
                    {selectedContext ? selectedContext.curso : 'Bienvenido a Sylia'}
                  </h3>
                  <p className="text-slate-500 max-w-sm leading-relaxed text-sm font-medium">
                    {selectedContext
                      ? 'Hazme cualquier pregunta sobre fórmulas de calificación, reglas de evaluación o temas del curso.'
                      : 'Selecciona un curso en el menú izquierdo para inicializar mi base de conocimiento y comenzar.'}
                  </p>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <ChatMessage key={idx} message={msg} />
                ))
              )}
              {loading && <TypingIndicator />}
            </div>
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>

        {/* Input Footer */}
        <div className="shrink-0 bg-white border-t border-slate-100 px-4 pb-5 pt-3" data-tour="student-chat-input">
          <div className="max-w-3xl mx-auto w-full">
            <QuickReplies onSelect={handleSend} lastIntent={currentResponse?.intent}  disabled={!selectedContextId} />
            <div className="mt-3">
              <ChatInput onSend={handleSend} isLoading={loading} disabled={!selectedContextId} />
            </div>
            <div className="text-center mt-2">
              <span className="text-[10px] text-slate-400 font-semibold">Sylia puede cometer errores. Verifica la información con tu docente.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;