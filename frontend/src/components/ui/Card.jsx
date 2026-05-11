import React from 'react';

const Card = ({ children, title, className = '', padding = true }) => {
  return (
    <div className={`bg-white rounded-lg shadow-md border border-gray-200 ${className}`}>
      {title && (
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        </div>
      )}
      <div className={padding ? 'p-6' : 'flex-1 min-h-0 flex flex-col'}>{children}</div>
    </div>
  );
};

export default Card;