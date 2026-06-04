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
        <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 mr-3 border border-slate-200 dark:border-slate-850 mt-1 bg-white dark:bg-slate-900 shadow-sm flex items-center justify-center">
          <img src="/logo.png" alt="Sylia" className="w-6 h-6 object-contain" />
        </div>
      )}

      <div className={`flex flex-col max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Header */}
        <div className="flex items-center gap-2 mb-1.5 text-[11px] text-slate-400 dark:text-slate-500 font-bold px-1 tracking-wide">
          <span className="text-slate-700 dark:text-slate-300">{isUser ? 'Tú' : 'Sylia'}</span>
          <span className="font-medium">{formatDateTime(message.timestamp)}</span>
        </div>

        {/* Bubble */}
        <div
          className={`
            px-5 py-4 shadow-sm
            ${isUser
              ? 'bg-slate-900 dark:bg-indigo-650 text-white rounded-3xl rounded-tr-sm'
              : isError
                ? 'bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/55 text-red-800 dark:text-red-300 rounded-3xl rounded-tl-sm'
                : 'bg-white dark:bg-[#131A2C] border border-slate-200 dark:border-slate-800/80 text-slate-800 dark:text-slate-100 rounded-3xl rounded-tl-sm'
            }
          `}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed font-medium">{message.content}</p>
          ) : (
            <div className="text-[15px] leading-relaxed markdown-body
              [&_pre]:my-4 [&_pre]:p-4 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-slate-900 dark:[&_pre]:bg-slate-950 [&_pre]:text-slate-50 [&_pre]:shadow-sm
              [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-inherit [&_pre_code]:font-mono [&_pre_code]:text-[14px] [&_pre_code]:border-none
              [&_code:not(pre_code)]:px-1.5 [&_code:not(pre_code)]:py-0.5 [&_code:not(pre_code)]:mx-0.5 [&_code:not(pre_code)]:rounded-md [&_code:not(pre_code)]:bg-slate-100 dark:[&_code:not(pre_code)]:bg-slate-800/80 [&_code:not(pre_code)]:text-slate-700 dark:[&_code:not(pre_code)]:text-slate-200 [&_code:not(pre_code)]:font-mono [&_code:not(pre_code)]:text-[13.5px] [&_code:not(pre_code)]:font-bold [&_code:not(pre_code)]:border [&_code:not(pre_code)]:border-slate-200 dark:[&_code:not(pre_code)]:border-slate-700
            ">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({node, ...props}) => <p className="mb-3 last:mb-0" {...props} />,
                  ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-4 space-y-2 marker:text-slate-400" {...props} />,
                  ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-4 space-y-2 marker:text-slate-500 marker:font-bold" {...props} />,
                  li: ({node, ...props}) => <li className="pl-1" {...props} />,
                  h1: ({node, ...props}) => <h1 className="text-xl font-extrabold text-slate-900 dark:text-white mb-3 mt-5 tracking-tight" {...props} />,
                  h2: ({node, ...props}) => <h2 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 mb-2 mt-4 tracking-tight" {...props} />,
                  h3: ({node, ...props}) => <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 mb-2 mt-3 tracking-tight" {...props} />,
                  strong: ({node, ...props}) => <strong className="font-bold text-slate-900 dark:text-white" {...props} />,
                  blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-slate-300 dark:border-slate-700 pl-4 py-1 my-3 bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 italic rounded-r-lg" {...props} />,
                  a: ({node, ...props}) => <a className="text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 hover:underline font-bold transition-colors" target="_blank" rel="noopener noreferrer" {...props} />
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}

          {/* Alerta de riesgo académico */}
          {!isUser && riesgo && (
            <div className="mt-4 p-3.5 bg-amber-50 dark:bg-amber-950/15 border border-amber-200 dark:border-amber-900/50 rounded-2xl text-sm flex gap-3">
              <span className="text-amber-600 shrink-0 text-base">⚠️</span>
              <div>
                <span className="font-bold text-amber-900 dark:text-amber-300 text-xs uppercase tracking-wider">Alerta académica</span>
                <p className="text-amber-800 dark:text-amber-400 mt-0.5 text-xs leading-relaxed font-medium">
                  {riesgo === 'MUY_ALTO' && 'Riesgo muy alto de desaprobación. ¡Consulta con tutoría de inmediato!'}
                  {riesgo === 'ALTO' && 'Riesgo alto de desaprobación. Te recomendamos buscar asesoría académica.'}
                  {riesgo === 'MEDIO' && 'Riesgo medio. Mejora tu desempeño en las próximas evaluaciones.'}
                </p>
              </div>
            </div>
          )}

          {/* Fragmentos citados */}
          {!isUser && Array.isArray(fragmentos) && fragmentos.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs">
              <details className="group">
                <summary className="cursor-pointer text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-bold transition-colors flex items-center gap-1.5 select-none outline-none text-[11px]">
                  <svg className="w-3.5 h-3.5 transition-transform duration-200 group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                  Ver fuentes ({fragmentos.length})
                </summary>
                <div className="mt-3 space-y-2 pl-5">
                   {fragmentos.map((f, idx) => (
                    <div key={idx} className="p-3 bg-[#FAF9F6] dark:bg-slate-900/55 border border-slate-100 dark:border-slate-800/50 rounded-xl text-slate-600 dark:text-slate-400 italic leading-relaxed text-[11px]">
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