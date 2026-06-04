import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-white border-t border-slate-100 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Sylia AI Logo" className="h-4 w-auto object-contain" />
            <span className="text-xs font-bold text-slate-600 tracking-tight">Sylia AI</span>
            <span className="text-xs text-slate-400 hidden sm:inline">— Asistente Académico Inteligente</span>
          </div>
          <p className="text-[11px] font-semibold text-slate-400">
            UNT • Ingeniería de Sistemas &copy; {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;