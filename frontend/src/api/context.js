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

// Actualizar notas de un contexto
export const updateGrades = async (id_contexto, notas) => {
  const response = await apiClient.put(`/contexto/${id_contexto}/notas`, notas);
  return response.data;
};
