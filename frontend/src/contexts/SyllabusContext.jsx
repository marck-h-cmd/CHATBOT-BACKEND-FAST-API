import React, { createContext, useState, useContext, useEffect } from 'react';
import * as syllabusAPI from '../api/syllabus';
import * as storage from '../utils/localstorage';
import { handleApiError } from '../utils/errorHandler';
import { useAuth } from './AuthContext';

const SyllabusContext = createContext();

export const useSyllabus = () => useContext(SyllabusContext);

export const SyllabusProvider = ({ children }) => {
  const [preloadedSyllabus, setPreloadedSyllabus] = useState(null);
  const [userSyllabi, setUserSyllabi] = useState([]);
  const [selectedSyllabusId, setSelectedSyllabusId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadStatus, setUploadStatus] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    const loadPreloaded = async () => {
      try {
        const data = await syllabusAPI.getPreloadedSyllabus();
        setPreloadedSyllabus(data);
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

  const uploadSyllabus = async (file) => {
    setUploadStatus({ loading: true, message: 'Subiendo y procesando...' });
    try {
      const result = await syllabusAPI.uploadSyllabus(file, user?.id);
      
      // Procesar el resultado del backend
      const nuevoSilabo = {
        id: result.id_silabo,
        id_curso: result.id_curso,
        nombre_archivo: file.name,
        nombre_curso: result.nombre_curso || result.curso?.nombre,
        codigo_curso: result.codigo_curso || result.curso?.codigo,
        docente: result.docente || result.curso?.docente,
        es_oficial: result.es_oficial || false,
        validado: result.validado || false,
        aviso_fiabilidad: result.aviso,
      };
      
      setUserSyllabi(prev => [...prev, nuevoSilabo]);
      
      // Construir uploadStatus con toda la información del backend
      setUploadStatus({
        success: true,
        fiabilidad: result.confiabilidad || result.fiabilidad || 'MEDIA',
        mensaje: result.aviso || result.message || `Sílabo "${file.name}" subido correctamente.`,
        message: result.aviso || result.message || `Sílabo "${file.name}" subido correctamente.`,
        id_silabo: result.id_silabo,
        id_curso: result.id_curso,
        nombre_curso: result.nombre_curso,
        codigo_curso: result.codigo_curso,
        docente: result.docente,
        curso: result.curso,
        evidencias: result.evidencias,
        formulas: result.formulas,
        unidades: result.unidades,
        advertencias: result.advertencias || [],
        usando_gemini: result.usando_gemini || false,
      });
      
      return { success: true, id: result.id_silabo, data: result };
    } catch (error) {
      const errorInfo = handleApiError(error);
      setUploadStatus({ 
        success: false, 
        message: errorInfo.message,
        error: errorInfo.detail
      });
      return { success: false, error: errorInfo };
    }
  };

  const selectSyllabus = (id) => {
    setSelectedSyllabusId(id);
    storage.saveSelectedSyllabusId(id);
  };

  const clearUploadStatus = () => setUploadStatus(null);

  const value = {
    preloadedSyllabus,
    userSyllabi,
    selectedSyllabusId,
    loading,
    uploadStatus,
    uploadSyllabus,
    selectSyllabus,
    clearUploadStatus,
  };

  return <SyllabusContext.Provider value={value}>{children}</SyllabusContext.Provider>;
};