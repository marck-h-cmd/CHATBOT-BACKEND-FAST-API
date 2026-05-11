import React from 'react';
import { useSyllabus } from '../../contexts/SyllabusContext';
import { useAuth } from '../../contexts/AuthContext';

const SyllabusSelector = () => {
  const { preloadedSyllabus, userSyllabi, selectedSyllabusId, selectSyllabus, loading } = useSyllabus();
  const { isAuthenticated } = useAuth();

  // Construir lista de opciones
  const options = [];

  if (preloadedSyllabus) {
    options.push({
      id: preloadedSyllabus.id,
      name: `📘 ${preloadedSyllabus.curso?.nombre || 'Gestión de Servicios TIC'} (Oficial)`,
      isOfficial: true,
    });
  }

  if (userSyllabi.length > 0) {
    userSyllabi.forEach(s => {
      options.push({
        id: s.id,
        name: `📄 ${s.nombre_archivo} (Subido)`,
        isOfficial: false,
      });
    });
  }

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="w-full p-3 bg-gray-100 rounded-lg animate-pulse">
        <div className="h-5 bg-gray-300 rounded w-1/2"></div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Sílabo activo
      </label>
      <select
        value={selectedSyllabusId || ''}
        onChange={(e) => selectSyllabus(parseInt(e.target.value))}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
      >
        {options.length === 0 && (
          <option value="" disabled>Cargando sílabos...</option>
        )}
        {options.map(opt => (
          <option key={opt.id} value={opt.id}>
            {opt.name}
          </option>
        ))}
      </select>
      <p className="text-xs text-gray-500 mt-1">
        El sílabo seleccionado se usará para responder tus preguntas.
      </p>
    </div>
  );
};

export default SyllabusSelector;