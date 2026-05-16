import React from 'react';
import { formatDateTime } from '../../utils/formatters';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const ChatMessage = ({ message }) => {
  const isUser = message.role === 'user';
  const isError = message.isError;
  const riesgo = message.riesgo;
  const fragmentos = message.fragmentos;

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-6`}>
      {!isUser && (
        <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 mr-3 border border-slate-200 mt-1 bg-white shadow-sm flex items-center justify-center">
          <img src="/logo.png" alt="Sylia" className="w-6 h-6 object-contain" />
        </div>
      )}
      
      <div className={`flex flex-col max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Header */}
        <div className="flex items-center gap-2 mb-1.5 text-[11px] text-slate-500 font-semibold px-1 tracking-wide">
          <span className="text-slate-700">{isUser ? 'Tú' : 'Sylia'}</span>
          <span>{formatDateTime(message.timestamp)}</span>
        </div>

        {/* Bubble */}
        <div
          className={`
            px-5 py-4 shadow-sm
            ${isUser 
              ? 'bg-[#6366f1] text-white rounded-2xl rounded-tr-sm' 
              : isError 
                ? 'bg-red-50 border border-red-200 text-red-800 rounded-2xl rounded-tl-sm'
                : 'bg-white border border-slate-100 text-slate-800 rounded-2xl rounded-tl-sm'
            }
          `}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed font-medium">{message.content}</p>
          ) : (
            <div className="text-[15px] leading-relaxed markdown-body 
              [&_pre]:my-4 [&_pre]:p-4 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-[#0F172A] [&_pre]:text-slate-50 [&_pre]:shadow-md
              [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-inherit [&_pre_code]:font-mono [&_pre_code]:text-[14px] [&_pre_code]:border-none
              [&_code:not(pre_code)]:px-1.5 [&_code:not(pre_code)]:py-0.5 [&_code:not(pre_code)]:mx-0.5 [&_code:not(pre_code)]:rounded-md [&_code:not(pre_code)]:bg-[#EEF2FF] [&_code:not(pre_code)]:text-[#4338CA] [&_code:not(pre_code)]:font-mono [&_code:not(pre_code)]:text-[13.5px] [&_code:not(pre_code)]:font-bold [&_code:not(pre_code)]:border [&_code:not(pre_code)]:border-[#E0E7FF]
            ">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({node, ...props}) => <p className="mb-3 last:mb-0" {...props} />,
                  ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-4 space-y-2 marker:text-slate-400" {...props} />,
                  ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-4 space-y-2 marker:text-slate-500 marker:font-semibold" {...props} />,
                  li: ({node, ...props}) => <li className="pl-1" {...props} />,
                  h1: ({node, ...props}) => <h1 className="text-xl font-bold text-slate-900 mb-3 mt-5" {...props} />,
                  h2: ({node, ...props}) => <h2 className="text-lg font-bold text-slate-800 mb-2 mt-4" {...props} />,
                  h3: ({node, ...props}) => <h3 className="text-base font-bold text-slate-800 mb-2 mt-3" {...props} />,
                  strong: ({node, ...props}) => <strong className="font-semibold text-indigo-900" {...props} />,
                  blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-indigo-300 pl-4 py-1 my-3 bg-indigo-50/50 text-slate-700 italic rounded-r-lg" {...props} />,
                  a: ({node, ...props}) => <a className="text-[#4338CA] hover:text-indigo-800 hover:underline font-medium transition-colors" target="_blank" rel="noopener noreferrer" {...props} />
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}

          {/* Alerta de riesgo académico */}
          {!isUser && riesgo && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm flex gap-2">
              <span className="text-amber-600 shrink-0">⚠️</span>
              <div>
                <span className="font-semibold text-amber-800">Alerta académica: </span>
                <span className="text-amber-700">
                  {riesgo === 'MUY_ALTO' && 'Riesgo muy alto de desaprobación. ¡Consulta con tutoría de inmediato!'}
                  {riesgo === 'ALTO' && 'Riesgo alto de desaprobación. Te recomendamos buscar asesoría académica.'}
                  {riesgo === 'MEDIO' && 'Riesgo medio. Mejora tu desempeño en las próximas evaluaciones.'}
                </span>
              </div>
            </div>
          )}

          {/* Fragmentos citados */}
          {!isUser && Array.isArray(fragmentos) && fragmentos.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-100 text-xs">
              <details className="group">
                <summary className="cursor-pointer text-slate-500 hover:text-indigo-600 font-medium transition-colors flex items-center gap-1.5 select-none outline-none">
                  <svg className="w-4 h-4 transition-transform duration-200 group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                  Ver fuentes de información ({fragmentos.length})
                </summary>
                <div className="mt-3 space-y-2 pl-5">
                  {fragmentos.map((f, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-slate-600 italic leading-relaxed shadow-sm">
                      "{f.substring(0, 200)}{f.length > 200 ? '...' : ''}"
                    </div>
                  ))}
                </div>
              </details>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;