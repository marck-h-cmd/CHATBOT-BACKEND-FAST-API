import React from 'react';

const LoadingSpinner = ({ size = 'md', fullScreen = false }) => {
  const sizes = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
  };

  const spinner = (
    <div className="flex justify-center items-center">
      <div className={`${sizes[size]} border-4 border-blue-200 dark:border-blue-900/50 border-t-blue-600 dark:border-t-blue-500 rounded-full animate-spin`}></div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white/75 dark:bg-[#0B0F19]/75 z-50 transition-colors duration-200">
        {spinner}
      </div>
    );
  }

  return spinner;
};

export default LoadingSpinner;