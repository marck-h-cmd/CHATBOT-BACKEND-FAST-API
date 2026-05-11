import apiClient from './client';

export const getPreloadedSyllabus = async () => {
  const response = await apiClient.get('/syllabus/preloaded');
  return response.data;
};

export const uploadSyllabus = async (file, userId) => {
  const formData = new FormData();
  formData.append('id_usuario', userId);
  formData.append('archivo', file);
  const response = await apiClient.post('/syllabus/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const getSyllabusChunks = async (idSilabo) => {
  const response = await apiClient.get(`/syllabus/${idSilabo}/chunks`);
  return response.data;
};