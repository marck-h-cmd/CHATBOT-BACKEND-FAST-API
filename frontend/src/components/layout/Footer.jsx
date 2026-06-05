import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800/80 mt-auto transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Sylia AI Logo" className="h-4 w-auto object-contain" />
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 tracking-tight">Sylia AI</span>
            <span className="text-xs text-slate-400 dark:text-slate-500 hidden sm:inline">— Asistente Académico Inteligente</span>
          </div>
          <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
            UNT • Ingeniería de Sistemas &copy; {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;