import React, { createContext, useState, useContext, useEffect } from 'react';
import * as courseAPI from '../api/courses';
import * as periodAPI from '../api/periods';
import * as contextAPI from '../api/context';
import { handleApiError } from '../utils/errorHandler';
import { useAuth } from './AuthContext';

const CourseContext = createContext();

export const useCourse = () => {
  const context = useContext(CourseContext);
  if (!context) {
    throw new Error('useCourse must be used within a CourseProvider');
  }
  return context;
};

export const CourseProvider = ({ children }) => {
  const [courses, setCourses] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { isAuthenticated } = useAuth();

  // Cargar cursos y periodos al iniciar (públicos)
  useEffect(() => {
    loadPublicData();
  }, []);

  // Cargar inscripciones solo si está autenticado
  useEffect(() => {
    if (isAuthenticated) {
      loadEnrollments();
    } else {
      setEnrollments([]);
    }
  }, [isAuthenticated]);

  // Mantener sincronizado el estado del contexto académico cuando la pestaña vuelve a enfocarse
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleFocus = () => {
      loadEnrollments();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isAuthenticated]);

  const loadPublicData = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const [coursesData, periodsData] = await Promise.all([
        courseAPI.getCourses(),
        periodAPI.getPeriods()
      ]);
      setCourses(coursesData);
      setPeriods(periodsData);
      setError('');
    } catch (err) {
      const errorInfo = handleApiError(err);
      setError(errorInfo.message);
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  const loadEnrollments = async () => {
    try {
      const enrollmentsData = await contextAPI.getMyCourses();
      setEnrollments(enrollmentsData);
    } catch (err) {
      // Si falla por no estar autenticado, no mostrar error
      console.error('Error al cargar inscripciones:', err);
    }
  };

  const enrollInCourse = async (id_curso, id_periodo = null) => {
    try {
      const result = await contextAPI.enrollInCourse(id_curso, id_periodo);
      // Recargar inscripciones después de inscribirse
      const enrollmentsData = await contextAPI.getMyCourses();
      setEnrollments(enrollmentsData);
      return { success: true, data: result };
    } catch (err) {
      const errorInfo = handleApiError(err);
      return { success: false, error: errorInfo };
    }
  };

  const getCurrentPeriod = () => {
    return periods.find(p => p.es_actual) || null;
  };

  const getEnrollmentByCourse = (id_curso, id_periodo) => {
    return enrollments.find(
      e => e.id_curso === id_curso && e.id_periodo === id_periodo
    );
  };

  const value = {
    courses,
    periods,
    enrollments,
    selectedCourse,
    selectedPeriod,
    loading,
    error,
    setSelectedCourse,
    setSelectedPeriod,
    enrollInCourse,
    getCurrentPeriod,
    getEnrollmentByCourse,
    refreshData: async (showSpinner = false) => {
      const promises = [loadPublicData(showSpinner)];
      if (isAuthenticated) {
        promises.push(loadEnrollments());
      }
      await Promise.all(promises);
    }
  };

  return <CourseContext.Provider value={value}>{children}</CourseContext.Provider>;
};
