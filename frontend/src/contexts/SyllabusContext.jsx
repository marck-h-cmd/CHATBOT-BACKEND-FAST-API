import React, { createContext, useState, useContext, useEffect } from 'react';
import * as syllabusAPI from '../api/syllabus';
import * as storage from '../utils/localstorage';
import { handleApiError } from '../utils/errorHandler';
import { useAuth } from './AuthContext';

const SyllabusContext = createContext();

export const useSyllabus = () => useContext(SyllabusContext);

export const SyllabusProvider = ({ children }) => {
  const [preloadedSyllabus, setPreloadedSyllabus] = useState(null);
  const [userSyllabi, setUserSyllabi] = useState([]); // sílabos subidos por el usuario
  const [selectedSyllabusId, setSelectedSyllabusId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadStatus, setUploadStatus] = useState(null); // { fiabilidad, mensaje }
  const { user } = useAuth();

  // Cargar sílabo oficial al inicio
  useEffect(() => {
    const loadPreloaded = async () => {
      try {
        const data = await syllabusAPI.getPreloadedSyllabus();
        setPreloadedSyllabus(data);
        // Si no hay sílabo seleccionado, usar el oficial
        const savedId = storage.getSelectedSyllabusId();
        if (savedId && (savedId === data.id || userSyllabi.some(s => s.id == savedId))) {
          setSelectedSyllabusId(parseInt(savedId));
        } else if (data?.id) {
          setSelectedSyllabusId(data.id);
          storage.saveSelectedSyllabusId(data.id);
        }
      } catch (error) {
        console.error('Error al cargar sílabo oficial:', error);
      } finally {
        setLoading(false);
      }
    };
    loadPreloaded();
  }, []);

  // Cargar sílabos del usuario (pendiente: backend tiene endpoint /chat/silabos)
  // Por ahora lo simulamos con un array vacío o podemos agregar después.

  const uploadSyllabus = async (file) => {
    setUploadStatus({ loading: true, message: 'Subiendo y procesando...' });
    try {
      const result = await syllabusAPI.uploadSyllabus(file, user?.id);
      const nuevoSilabo = {
        id: result.id_silabo,
        nombre_archivo: file.name,
        nombre_curso: result.nombre_curso,
        es_oficial: result.es_oficial,
        validado: result.validado,
        aviso_fiabilidad: result.aviso,
      };
      setUserSyllabi(prev => [...prev, nuevoSilabo]);
      setUploadStatus({
        success: true,
        fiabilidad: result.aviso || 'MEDIA',
        message: `Sílabo "${file.name}" subido correctamente.`,
        id: result.id_silabo,
      });
      return { success: true, id: result.id_silabo };
    } catch (error) {
      const errorInfo = handleApiError(error);
      setUploadStatus({ success: false, message: errorInfo.message });
      return { success: false, error: errorInfo };
    }
  };

  const selectSyllabus = (id) => {
    setSelectedSyllabusId(id);
    storage.saveSelectedSyllabusId(id);
  };

  const value = {
    preloadedSyllabus,
    userSyllabi,
    selectedSyllabusId,
    loading,
    uploadStatus,
    uploadSyllabus,
    selectSyllabus,
    clearUploadStatus: () => setUploadStatus(null),
  };

  return <SyllabusContext.Provider value={value}>{children}</SyllabusContext.Provider>;
};