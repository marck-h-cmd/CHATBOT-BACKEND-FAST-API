import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

const NotFoundPage = () => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <Card className="max-w-md text-center dark:bg-[#131A2C] dark:border-slate-800 transition-colors duration-200">
        <div className="text-6xl mb-4">🔍</div>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">404</h1>
        <p className="text-gray-600 dark:text-slate-400 mb-6">Página no encontrada</p>
        <Link to="/">
          <Button>Volver al inicio</Button>
        </Link>
      </Card>
    </div>
  );
};

export default NotFoundPage;