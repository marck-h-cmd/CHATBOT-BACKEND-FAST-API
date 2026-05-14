// syllabus.js
import apiClient from './client';

export const getPreloadedSyllabus = async () => {
  const response = await apiClient.get('/syllabus/preloaded');
  return response.data;
};

export const uploadSyllabus = async (file, id_curso, id_periodo) => {
  const formData = new FormData();
  formData.append('id_curso', id_curso);
  formData.append('id_periodo', id_periodo);
  formData.append('archivo', file);
  const response = await apiClient.post('/silabo/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const getSyllabusChunks = async (idSilabo) => {
  const response = await apiClient.get(`/syllabus/${idSilabo}/chunks`);
  return response.data;
};

// Nueva: Obtener lista de sílabos (oficiales y del usuario)
export const listSyllabus = async () => {
  const response = await apiClient.get('/syllabus/');
  return response.data;
};

// Nueva: Obtener detalle completo de un sílabo
export const getSyllabusDetail = async (idSilabo) => {
  const response = await apiClient.get(`/syllabus/${idSilabo}`);
  return response.data;
};

// Nueva: Actualizar un sílabo
export const updateSyllabus = async (idSilabo, data) => {
  const response = await apiClient.put(`/syllabus/${idSilabo}`, data);
  return response.data;
};

// Nueva: Eliminar un sílabo
export const deleteSyllabus = async (idSilabo) => {
  const response = await apiClient.delete(`/syllabus/${idSilabo}`);
  return response.data;
};

// Nueva: Obtener asociaciones (accesos) de un sílabo
export const getSyllabusAssociations = async (idSilabo) => {
  const response = await apiClient.get(`/syllabus/access/${idSilabo}`);
  return response.data;
};

// Nueva: Crear asociación (compartir sílabo con usuario)
export const addSyllabusAssociation = async (idSilabo, idUsuario, esFavorito = false) => {
  const response = await apiClient.post('/syllabus/access', {
    id_silabo: idSilabo,
    id_usuario: idUsuario,
    es_favorito: esFavorito
  });
  return response.data;
};

// Nueva: Eliminar asociación
export const removeSyllabusAssociation = async (idSilabo, idUsuario) => {
  const response = await apiClient.delete('/syllabus/access', {
    data: { id_silabo: idSilabo, id_usuario: idUsuario }
  });
  return response.data;
};

// Nueva: Obtener sílabos de un usuario específico
export const getUserSyllabus = async (idUsuario) => {
  const response = await apiClient.get(`/syllabus/user/${idUsuario}`);
  return response.data;
};

// ITIL: Listar sílabos pendientes de revisión (admin)
export const getPendingSyllabi = async () => {
  const response = await apiClient.get('/silabo/revisar');
  return response.data;
};

// ITIL: Aprobar sílabo (admin)
export const approveSyllabus = async (id_silabo, comentario = null) => {
  const response = await apiClient.post(`/silabo/aprobar/${id_silabo}`, {
    comentario
  });
  return response.data;
};

// ITIL: Rechazar sílabo (admin)
export const rejectSyllabus = async (id_silabo, comentario = null) => {
  const response = await apiClient.post(`/silabo/rechazar/${id_silabo}`, {
    comentario
  });
  return response.data;
};