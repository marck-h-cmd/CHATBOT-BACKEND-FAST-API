import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-white border-t border-gray-200 py-4 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center text-sm text-gray-500">
          <p>
            Chatbot Académico ITIL 4 - Universidad Nacional de Trujillo
          </p>
          <p className="mt-1">
            &copy; {new Date().getFullYear()} - Todos los derechos reservados
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;