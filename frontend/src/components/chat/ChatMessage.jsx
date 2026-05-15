import React from 'react';
import { formatDateTime, formatGrade } from '../../utils/formatters';
import { motion } from 'framer-motion';
import { User, Bot, AlertTriangle, BookOpen, ChevronDown } from 'lucide-react';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const ChatMessage = ({ message }) => {
  const isUser = message.role === 'user';
  const isError = message.isError;
  const riesgo = message.riesgo;
  const fragmentos = message.fragmentos;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} mb-6 w-full`}
    >
      {/* Avatar */}
      <div className="shrink-0 flex flex-col items-center">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm ${
          isUser 
            ? 'bg-indigo-600 text-white' 
            : isError 
              ? 'bg-red-100 text-red-500' 
              : 'bg-slate-900 text-white'
        }`}>
          {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
        </div>
      </div>

      {/* Message Bubble */}
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[85%] sm:max-w-[75%]`}>
        <div className="flex items-center gap-2 mb-1.5 px-1">
          <span className="text-xs font-semibold text-gray-600">
            {isUser ? 'Tú' : 'Sylia'}
          </span>
          <span className="text-[10px] text-gray-400">
            {formatDateTime(message.timestamp)}
          </span>
        </div>

        <div
          className={`
            relative px-5 py-3.5 shadow-sm text-[15px] leading-relaxed
            ${isUser 
              ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-sm' 
              : isError 
                ? 'bg-red-50 text-red-800 border border-red-100 rounded-2xl rounded-tl-sm'
                : 'bg-white border border-gray-100 text-gray-800 rounded-2xl rounded-tl-sm'
            }
          `}
        >
          {/* Contenido del mensaje con Markdown */}
          <div className={`font-medium markdown-body ${isUser ? 'text-white' : 'text-gray-800'}`}>
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-2 space-y-1" {...props} />,
                ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-2 space-y-1" {...props} />,
                li: ({node, ...props}) => <li className="" {...props} />,
                strong: ({node, ...props}) => <strong className={`font-bold ${!isUser && 'text-indigo-700 bg-indigo-50 px-1 rounded'}`} {...props} />,
                code: ({node, inline, ...props}) => 
                  inline 
                    ? <code className="bg-gray-100 text-pink-600 px-1.5 py-0.5 rounded text-sm font-mono" {...props} />
                    : <pre className="bg-slate-900 text-gray-100 p-3 rounded-lg overflow-x-auto text-sm my-3"><code {...props} /></pre>
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>

          {/* Alerta de riesgo académico */}
          {!isUser && riesgo && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-3 p-3 bg-amber-50 border border-amber-200/60 rounded-xl text-sm flex gap-2 items-start"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
              <div>
                <span className="font-semibold text-amber-800">Alerta de Rendimiento:</span>{' '}
                <span className="text-amber-700">
                  {riesgo === 'MUY_ALTO' && 'Riesgo muy alto de desaprobación. Es urgente consultar con tutoría.'}
                  {riesgo === 'ALTO' && 'Riesgo alto de desaprobación. Recomendamos buscar asesoría académica pronto.'}
                  {riesgo === 'MEDIO' && 'Riesgo medio. Mantente enfocado para mejorar en las siguientes unidades.'}
                </span>
              </div>
            </motion.div>
          )}

          {/* Fragmentos citados (fuentes del RAG) */}
          {Array.isArray(fragmentos) && fragmentos.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <details className="group">
                <summary className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-indigo-500 hover:text-indigo-600 list-none transition-colors">
                  <BookOpen className="w-3.5 h-3.5" />
                  Ver fuentes utilizadas ({fragmentos.length})
                  <ChevronDown className="w-3 h-3 transition-transform group-open:rotate-180 ml-auto" />
                </summary>
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-2 space-y-2"
                >
                  {fragmentos.map((f, idx) => (
                    <div key={idx} className="bg-gray-50/80 border border-gray-100 p-2.5 rounded-lg text-xs text-gray-600 italic">
                      "{f.substring(0, 150)}..."
                    </div>
                  ))}
                </motion.div>
              </details>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ChatMessage;