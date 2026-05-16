import React, { useEffect, useRef, useState } from 'react';
import { useChat } from '../contexts/ChatContext';
import { useCourse } from '../contexts/CourseContext';
import { useAuth } from '../contexts/AuthContext';
import ChatMessage from '../components/chat/ChatMessage';
import ChatInput from '../components/chat/ChatInput';
import TypingIndicator from '../components/chat/TypingIndicator';
import QuickReplies from '../components/chat/QuickReplies';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, CheckCircle, Clock, Info, ShieldAlert, Sparkles, Menu, X, Search } from 'lucide-react';

const ChatPage = () => {
  const { messages, loading, sendMessage, currentResponse, loadHistory } = useChat();
  const { enrollments } = useCourse();
  const { isAuthenticated } = useAuth();
  const messagesEndRef = useRef(null);
  
  const [selectedContextId, setSelectedContextId] = useState(null);
  const [selectedContext, setSelectedContext] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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
    loadHistory(contexto.id_contexto); // Cargar historial al seleccionar
    
    if (window.innerWidth < 1024) {
      setSidebarOpen(false); // Cierra drawer en móviles al seleccionar
    }
  };


  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[80vh] bg-slate-50">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-slate-200 shadow-sm p-8 rounded-3xl max-w-md w-full text-center"
        >
          <ShieldAlert className="w-16 h-16 text-indigo-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Acceso Denegado</h2>
          <p className="text-slate-600">Inicia sesión para usar el asistente de inteligencia artificial.</p>
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
    <div className="h-full w-full flex bg-white overflow-hidden relative">
      
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/20 z-40 lg:hidden transition-opacity backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar (Desktop & Mobile Drawer) */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-[280px] bg-[#f9fafb] border-r border-slate-200 transform transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0 shrink-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Mobile close button inside drawer */}
        <div className="absolute top-3 right-3 lg:hidden z-10">
          <button onClick={() => setSidebarOpen(false)} className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex flex-col h-full bg-[#F9FAFB]">
          <div className="p-5 border-b border-slate-200 shrink-0 bg-white">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5 text-slate-800">
                <div className="bg-indigo-600 p-1.5 rounded-lg shadow-sm shadow-indigo-100">
                  <BookOpen className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-bold text-lg tracking-tight">Mis Cursos</h3>
              </div>
            </div>
            
            {/* Buscador de cursos */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              </div>
              <input
                type="text"
                placeholder="Buscar curso o periodo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-6 no-scrollbar custom-scrollbar">
            {enrollments.length === 0 ? (
              <div className="text-center py-12 px-4">
                <div className="bg-slate-100 w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-200">
                  <Info className="w-5 h-5 text-slate-400" />
                </div>
                <p className="text-slate-500 text-sm font-medium">Aún no estás inscrito en ningún curso.</p>
              </div>
            ) : sortedPeriods.length === 0 ? (
              <div className="text-center py-12 px-4">
                <p className="text-slate-400 text-sm italic">No se encontraron cursos con "{searchTerm}"</p>
              </div>
            ) : (
              sortedPeriods.map(periodo => (
                <div key={periodo} className="space-y-2">
                  <div className="flex items-center gap-2 px-2 py-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">{periodo}</span>
                    <div className="h-px flex-1 bg-slate-100"></div>
                  </div>
                  
                  <div className="space-y-1.5">
                    {groupedEnrollments[periodo].map((ctx) => {
                      const isSelected = selectedContextId === ctx.id_contexto;
                      return (
                        <motion.div
                          whileHover={{ x: 2 }}
                          whileTap={{ scale: 0.98 }}
                          key={ctx.id_contexto}
                          onClick={() => handleContextSelect(ctx)}
                          className={`group p-3 rounded-xl cursor-pointer transition-all duration-200 border-2 flex items-center gap-3 ${
                            isSelected
                              ? 'bg-white border-indigo-500 shadow-sm shadow-indigo-100'
                              : 'bg-transparent border-transparent hover:bg-slate-200/50'
                          }`}
                        >
                          <div className={`w-1.5 h-8 rounded-full shrink-0 transition-all ${
                            isSelected ? 'bg-indigo-500' : 'bg-transparent group-hover:bg-slate-300'
                          }`} />
                          
                          <div className="flex-1 min-w-0">
                            <p className={`font-bold truncate text-[13px] mb-0.5 ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>
                              {ctx.curso}
                            </p>
                            <div className="flex items-center gap-2">
                               <span className={`flex items-center gap-1 text-[10px] font-bold ${
                                 ctx.silabo_validado ? 'text-emerald-500' : 'text-amber-500'
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
            <div className="shrink-0 p-4 border-t border-slate-200 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
              <div className="flex items-center gap-2 mb-2 px-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Estado del Asistente</h4>
              </div>
              <div className={`p-3 rounded-xl text-[11px] flex items-center gap-3 border ${
                selectedContext.silabo_validado 
                  ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                  : 'bg-amber-50 border-amber-100 text-amber-800'
              }`}>
                <div className={`shrink-0 w-6 h-6 rounded-lg flex items-center justify-center ${
                  selectedContext.silabo_validado ? 'bg-emerald-500/10' : 'bg-amber-500/10'
                }`}>
                  {selectedContext.silabo_validado ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                </div>
                <p className="font-semibold leading-snug">
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
      <div className="flex-1 flex flex-col h-full min-w-0 bg-white">
        
        {/* Mobile Header (Only visible on mobile/tablet) */}
        <div className="lg:hidden shrink-0 h-14 border-b border-slate-200 flex items-center px-4 gap-3 bg-white/80 backdrop-blur-md sticky top-0 z-30">
          <button 
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full overflow-hidden shadow-sm">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <span className="font-bold text-slate-800 text-sm">Sylia</span>
          </div>
        </div>

        {/* Mensajes */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 py-6 scroll-smooth">
          <div className="max-w-3xl mx-auto w-full flex flex-col">
            <div className="flex flex-col space-y-6">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center opacity-90">
                  <div className="w-16 h-16 bg-white border border-slate-200 rounded-full flex items-center justify-center mb-6 shadow-sm overflow-hidden p-3">
                    <img src="/logo.png" alt="Sylia" className="w-full h-full object-contain" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 mb-3 tracking-tight">
                    {selectedContext ? `Estás en ${selectedContext.curso}` : 'Bienvenido a Sylia'}
                  </h3>
                  <p className="text-slate-500 max-w-sm leading-relaxed text-sm">
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
        <div className="shrink-0 bg-white px-4 pb-6 pt-2">
          <div className="max-w-3xl mx-auto w-full">
            <QuickReplies onSelect={handleSend} lastIntent={currentResponse?.intent} />
            <div className="mt-3">
              <ChatInput onSend={handleSend} isLoading={loading} disabled={!selectedContextId} />
            </div>
            <div className="text-center mt-3">
              <span className="text-[11px] text-slate-400 font-medium">Sylia puede cometer errores. Por favor, verifica la información con tu docente.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;