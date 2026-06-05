import React from 'react';

const Card = ({ children, title, className = '', padding = true }) => {
  return (
    <div className={`bg-white dark:bg-[#131A2C] rounded-lg shadow-md border border-gray-200 dark:border-slate-800/80 ${className}`}>
      {title && (
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-800/80">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-100">{title}</h3>
        </div>
      )}
      <div className={padding ? 'p-6' : 'flex-1 min-h-0 flex flex-col'}>{children}</div>
    </div>
  );
};

export default Card;