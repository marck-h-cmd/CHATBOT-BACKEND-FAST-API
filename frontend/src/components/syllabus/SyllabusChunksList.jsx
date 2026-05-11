import React, { useState, useEffect } from 'react';
import { useSyllabus } from '../../contexts/SyllabusContext';
import { getSyllabusChunks } from '../../api/syllabus';
import Card from '../ui/Card';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';

const SyllabusChunksList = () => {
  const { selectedSyllabusId, preloadedSyllabus, userSyllabi } = useSyllabus();
  const [chunks, setChunks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);

  const selected = selectedSyllabusId 
    ? (preloadedSyllabus?.id === selectedSyllabusId ? preloadedSyllabus : userSyllabi.find(s => s.id === selectedSyllabusId))
    : null;

  useEffect(() => {
    if (visible && selectedSyllabusId && !chunks.length) {
      const fetchChunks = async () => {
        setLoading(true);
        try {
          const data = await getSyllabusChunks(selectedSyllabusId);
          setChunks(data.chunks || []);
        } catch (error) {
          console.error('Error cargando chunks:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchChunks();
    }
  }, [visible, selectedSyllabusId]);

  if (!selected) return null;

  return (
    <div className="mt-6">
      <Button variant="outline" onClick={() => setVisible(!visible)}>
        {visible ? 'Ocultar' : 'Mostrar'} chunks del sílabo (debug)
      </Button>
      {visible && (
        <Card title={`Chunks del sílabo (${chunks.length})`} className="mt-3">
          {loading ? (
            <LoadingSpinner />
          ) : chunks.length === 0 ? (
            <p className="text-gray-500">No hay chunks generados para este sílabo.</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {chunks.map((chunk, idx) => (
                <div key={chunk.id || idx} className="border-l-4 border-blue-300 pl-3 text-sm">
                  <div className="text-xs text-gray-500 mb-1">
                    <span className="font-medium">Sección:</span> {chunk.tipo_seccion || 'general'} |
                    <span className="font-medium ml-2">Unidad:</span> {chunk.unidad || '-'}
                  </div>
                  <p className="text-gray-700">{chunk.chunk_texto.substring(0, 300)}...</p>
                  <div className="text-xs text-gray-400 mt-1">
                    Embedding dimension: {chunk.embedding?.length || 0}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default SyllabusChunksList;