import apiClient from './client';

// Listar todos los cursos
export const getCourses = async () => {
  const response = await apiClient.get('/cursos/');
  return response.data;
};

// Crear curso (solo admin)
export const createCourse = async (courseData) => {
  const response = await apiClient.post('/cursos/', courseData);
  return response.data;
};

// Actualizar curso (solo admin)
export const updateCourse = async (id_curso, courseData) => {
  const response = await apiClient.put(`/cursos/${id_curso}`, courseData);
  return response.data;
};

// Eliminar curso (solo admin)
export const deleteCourse = async (id_curso) => {
  const response = await apiClient.delete(`/cursos/${id_curso}`);
  return response.data;
};
