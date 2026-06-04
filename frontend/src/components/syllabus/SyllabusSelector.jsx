import React, { useState, useMemo } from 'react';
import { useSyllabus } from '../../contexts/SyllabusContext';
import { useAuth } from '../../contexts/AuthContext';
import { useCourse } from '../../contexts/CourseContext';
import SearchableSelect from '../ui/SearchableSelect';

const SyllabusSelector = () => {
  const { preloadedSyllabus, userSyllabi, selectedSyllabusId, selectSyllabus, loading } = useSyllabus();
  const { isAuthenticated } = useAuth();
  const { courses } = useCourse();

  const [selectedCiclo, setSelectedCiclo] = useState('');
  const ciclos = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

  // Construir lista de opciones
  const allOptions = useMemo(() => {
    const list = [];
    
    if (preloadedSyllabus) {
      const courseId = preloadedSyllabus.id_curso || preloadedSyllabus.curso?.id_curso;
      const course = courses?.find(c => String(c.id_curso) === String(courseId));
      list.push({
        id: preloadedSyllabus.id,
        name: `📘 ${preloadedSyllabus.curso?.nombre || 'Gestión de Servicios TIC'} (Oficial)`,
        isOfficial: true,
        id_curso: courseId,
        ciclo: course?.ciclo_referencial || '',
      });
    }

    if (userSyllabi.length > 0) {
      userSyllabi.forEach(s => {
        const courseId = s.id_curso || s.curso?.id_curso;
        const course = courses?.find(c => String(c.id_curso) === String(courseId));
        list.push({
          id: s.id,
          name: `📄 ${s.nombre_archivo} (Subido)`,
          isOfficial: false,
          id_curso: courseId,
          ciclo: course?.ciclo_referencial || '',
        });
      });
    }
    
    return list;
  }, [preloadedSyllabus, userSyllabi, courses]);

  // Filtrar las opciones por el ciclo seleccionado
  const filteredOptions = useMemo(() => {
    if (!selectedCiclo) return allOptions;
    return allOptions.filter(opt => 
      opt.ciclo === selectedCiclo || 
      opt.ciclo?.toUpperCase() === selectedCiclo.toUpperCase()
    );
  }, [allOptions, selectedCiclo]);

  // Formatear opciones para el componente SearchableSelect
  const searchableOptions = useMemo(() => {
    return filteredOptions.map(opt => ({
      value: opt.id,
      label: opt.name,
    }));
  }, [filteredOptions]);

  const handleCicloChange = (val) => {
    setSelectedCiclo(val);
  };

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
    <div className="w-full space-y-4 text-left">
      {/* Filtro por ciclo */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
          Filtrar por ciclo
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleCicloChange('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              !selectedCiclo
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            }`}
          >
            Todos
          </button>
          {ciclos.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => handleCicloChange(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                selectedCiclo === c
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Selector buscable */}
      <SearchableSelect
        label="Sílabo activo *"
        placeholder="Seleccionar sílabo..."
        searchPlaceholder="Buscar sílabo..."
        value={selectedSyllabusId || ''}
        onChange={(val) => selectSyllabus(val ? parseInt(val) : null)}
        options={searchableOptions}
      />
      
      <p className="text-xs text-gray-500 mt-1">
        El sílabo seleccionado se usará para responder tus preguntas.
      </p>
    </div>
  );
};

export default SyllabusSelector;