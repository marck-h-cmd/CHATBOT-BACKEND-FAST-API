import apiClient from './client';

// Inscribir estudiante en un curso
export const enrollInCourse = async (id_curso, id_periodo = null) => {
  const response = await apiClient.post('/contexto/inscribir', {
    id_curso,
    id_periodo
  });
  return response.data;
};

// Obtener cursos del estudiante con contexto
export const getMyCourses = async () => {
  const response = await apiClient.get('/contexto/mis-cursos');
  return response.data;
};
