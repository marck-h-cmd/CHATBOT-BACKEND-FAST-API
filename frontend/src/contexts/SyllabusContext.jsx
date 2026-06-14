import React, { createContext, useState, useContext, useEffect } from 'react';
import * as syllabusAPI from '../api/syllabus';
import * as storage from '../utils/localstorage';
import { handleApiError } from '../utils/errorHandler';
import { useAuth } from './AuthContext';

const SyllabusContext = createContext();

export const useSyllabus = () => useContext(SyllabusContext);

export const SyllabusProvider = ({ children }) => {
  const [userSyllabi, setUserSyllabi] = useState([]);
  const [officialSyllabi, setOfficialSyllabi] = useState([]);
  const [selectedSyllabusId, setSelectedSyllabusId] = useState(null);
  const [syllabusDetail, setSyllabusDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const { user } = useAuth();

  const loadUserSyllabi = async () => {
    setLoading(true);
    try {
      const result = await syllabusAPI.getMySyllabi();
      // Mapear al formato esperado por el frontend
      const mappedSyllabi = result.map(s => ({
        id: s.id_silabo,
        id_curso: s.id_curso,
        id_periodo: s.id_periodo,
        nombre_archivo: s.nombre_archivo,
        nombre_curso: s.nombre_curso,
        codigo_curso: s.codigo_curso,
        periodo: s.periodo,
        estado: s.estado,
        score: s.score,
        ruta_pdf: s.ruta_pdf,
        es_oficial: s.tipo_silabo === 'OFICIAL',
        fecha_subida: s.fecha_subida,
      }));
      setUserSyllabi(mappedSyllabi);
      return mappedSyllabi;
    } catch (error) {
      const errorInfo = handleApiError(error);
      console.error('Load user syllabi error:', errorInfo);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Cargar sílabos del usuario al cambiar de usuario o iniciar sesión
  useEffect(() => {
    if (user) {
      loadUserSyllabi();
    } else {
      setUserSyllabi([]);
      setSelectedSyllabusId(null);
      setSyllabusDetail(null);
    }
  }, [user]);

  // Cargar detalles completos del sílabo seleccionado de forma automática
  useEffect(() => {
    if (selectedSyllabusId) {
      getSyllabusDetail(selectedSyllabusId);
    } else {
      setSyllabusDetail(null);
    }
  }, [selectedSyllabusId]);

  const uploadSyllabus = async (file, id_curso, id_periodo) => {
    setUploadStatus({ loading: true, message: 'Subiendo y procesando...' });
    try {
      const result = await syllabusAPI.uploadSyllabus(file, id_curso, id_periodo);
      
      // Procesar el resultado del backend (más simple)
      const nuevoSilabo = {
        id_silabo: result.id_silabo,
        id_curso: result.id_curso,
        id_periodo: result.id_periodo,
        nombre_archivo: result.nombre_archivo,
        nombre_curso: result.nombre_curso,
        codigo_curso: result.codigo_curso,
        estado: result.estado,
        score: result.score,
      };
      
      setUserSyllabi(prev => [...prev, nuevoSilabo]);
      
      console.log('DEBUG UPLOAD SYLLABUS API RESULT:', result);
      
      // Retornar información del backend
      setUploadStatus({
        success: true,
        message: result.mensaje || `Sílabo "${file.name}" subido correctamente.`,
        id_silabo: result.id_silabo,
        score: result.score,
        fiabilidad: result.score >= 80 ? 'ALTA' : result.score >= 50 ? 'MEDIA' : 'BAJA',
        evidencias: result.datos_extraidos?.evidencias || {},
        unidades: result.datos_extraidos?.unidades || [],
        advertencias: result.datos_extraidos?.advertencias || [],
        usando_gemini: result.usando_gemini ?? true,
        nombre_curso: result.nombre_curso,
        codigo_curso: result.codigo_curso,
        ciclo: result.ciclo,
        periodo: result.periodo,
        docente: result.docente,
        email_docente: result.email_docente,
        ...result
      });
      
      return { success: true, id: result.id_silabo, data: result };
    } catch (error) {
      const errorInfo = handleApiError(error);
      console.error('Upload error:', errorInfo);
      setUploadStatus({ 
        success: false, 
        message: errorInfo.message,
        error: errorInfo.detail
      });
      return { success: false, error: errorInfo };
    }
  };

  // ==================== ADMIN: GESTIÓN OFICIAL ====================

  const uploadOfficialSyllabus = async (file, id_curso, id_periodo) => {
    setUploadStatus({ loading: true, message: 'Subiendo sílabo oficial...' });
    try {
      const result = await syllabusAPI.uploadOfficialSyllabus(file, id_curso, id_periodo);
      
      const nuevoSilaboOficial = {
        id_silabo: result.id_silabo,
        id_curso: result.id_curso,
        id_periodo: result.id_periodo,
        nombre_archivo: result.nombre_archivo,
        nombre_curso: result.nombre_curso,
        codigo_curso: result.codigo_curso,
        escuela: result.escuela,
        periodo: result.periodo,
        estado: result.estado,
        ambito: result.ambito,
        score: result.score,
        fecha_subida: new Date().toISOString(),
      };
      
      setOfficialSyllabi(prev => [nuevoSilaboOficial, ...prev]);
      
      setUploadStatus({
        success: true,
        message: result.mensaje || `Sílabo oficial "${file.name}" subido exitosamente`,
        id_silabo: result.id_silabo,
        score: result.score,
        contextos_sincronizados: result.contextos_sincronizados,
      });
      
      return { success: true, id: result.id_silabo, data: result };
    } catch (error) {
      const errorInfo = handleApiError(error);
      console.error('Upload official error:', errorInfo);
      setUploadStatus({ 
        success: false, 
        message: errorInfo.message,
        error: errorInfo.detail
      });
      return { success: false, error: errorInfo };
    }
  };

  const loadOfficialSyllabi = async (id_curso = null, id_periodo = null) => {
    setLoading(true);
    try {
      const result = await syllabusAPI.getOfficialSyllabi(id_curso, id_periodo);
      setOfficialSyllabi(result);
      return result;
    } catch (error) {
      const errorInfo = handleApiError(error);
      console.error('Load official syllabi error:', errorInfo);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const deleteOfficialSyllabus = async (id_silabo) => {
    setLoading(true);
    try {
      const result = await syllabusAPI.deleteOfficialSyllabus(id_silabo);
      setOfficialSyllabi(prev => prev.filter(s => s.id_silabo !== id_silabo));
      return { success: true, data: result };
    } catch (error) {
      const errorInfo = handleApiError(error);
      console.error('Delete official syllabus error:', errorInfo);
      return { success: false, error: errorInfo };
    } finally {
      setLoading(false);
    }
  };

  const getSyllabusDetail = async (id_silabo) => {
    setLoading(true);
    try {
      const result = await syllabusAPI.getSyllabusFullDetail(id_silabo);
      setSyllabusDetail(result);
      return result;
    } catch (error) {
      const errorInfo = handleApiError(error);
      console.error('Get syllabus detail error:', errorInfo);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const selectSyllabus = (id) => {
    setSelectedSyllabusId(id);
    storage.saveSelectedSyllabusId(id);
  };

  const clearUploadStatus = () => setUploadStatus(null);
  const clearSyllabusDetail = () => setSyllabusDetail(null);

  const value = {
    userSyllabi,
    officialSyllabi,
    selectedSyllabusId,
    syllabusDetail,
    loading,
    uploadStatus,
    uploadSyllabus,
    uploadOfficialSyllabus,
    loadOfficialSyllabi,
    deleteOfficialSyllabus,
    getSyllabusDetail,
    selectSyllabus,
    clearUploadStatus,
    clearSyllabusDetail,
    loadUserSyllabi,
  };

  return <SyllabusContext.Provider value={value}>{children}</SyllabusContext.Provider>;
};