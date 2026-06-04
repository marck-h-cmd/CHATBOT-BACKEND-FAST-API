import React from 'react';

const KPICard = ({ title, value, icon, color = 'blue', subtitle = null }) => {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50 text-blue-700 dark:text-blue-300',
    green: 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/50 text-green-700 dark:text-green-300',
    yellow: 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900/50 text-yellow-700 dark:text-yellow-300',
    red: 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300',
    purple: 'bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900/50 text-purple-700 dark:text-purple-300',
  };

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color]} transition-all hover:shadow-md`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium opacity-80">{title}</p>
          <p className="text-2xl font-bold mt-1">{value !== undefined ? value : '—'}</p>
          {subtitle && <p className="text-xs mt-1 opacity-70">{subtitle}</p>}
        </div>
        {icon && <div className="text-3xl opacity-80">{icon}</div>}
      </div>
    </div>
  );
};

export default KPICard;