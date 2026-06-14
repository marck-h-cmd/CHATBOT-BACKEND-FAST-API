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
  const response = await apiClient.delete(`/silabo/${idSilabo}`);
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
export const approveSyllabus = async (id_silabo, comentario = null, id_periodo_nuevo = null) => {
  const response = await apiClient.post(`/silabo/aprobar/${id_silabo}`, {
    comentario,
    id_periodo_nuevo
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

// ==================== ADMIN: GESTIÓN OFICIAL DE SÍLABOS ====================

// Admin: Subir sílabo oficial
export const uploadOfficialSyllabus = async (file, id_curso, id_periodo) => {
  console.log('DEBUG FRONTEND: id_curso=', id_curso, 'tipo=', typeof id_curso);
  console.log('DEBUG FRONTEND: id_periodo=', id_periodo, 'tipo=', typeof id_periodo);
  console.log('DEBUG FRONTEND: archivo=', file.name);
  
  const formData = new FormData();
  formData.append('id_curso', id_curso);
  formData.append('id_periodo', id_periodo);
  formData.append('archivo', file);
  
  console.log('DEBUG FRONTEND: FormData entries:');
  for (let [key, value] of formData.entries()) {
    console.log(`  ${key}:`, value, typeof value);
  }
  
  // Llamar al endpoint oficial
  const response = await apiClient.post('/silabo/upload-oficial', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

// Admin: Listar sílabos oficiales publicados
export const getOfficialSyllabi = async (id_curso = null, id_periodo = null) => {
  const params = new URLSearchParams();
  if (id_curso) params.append('id_curso', id_curso);
  if (id_periodo) params.append('id_periodo', id_periodo);
  
  const url = `/silabo/list-oficial${params.toString() ? '?' + params.toString() : ''}`;
  const response = await apiClient.get(url);
  return response.data;
};

// Admin: Eliminar sílabo oficial
export const deleteOfficialSyllabus = async (id_silabo) => {
  const response = await apiClient.delete(`/silabo/oficial/${id_silabo}`);
  return response.data;
};

// Admin: Obtener detalle completo de un sílabo
export const getSyllabusFullDetail = async (id_silabo) => {
  const response = await apiClient.get(`/silabo/${id_silabo}/detalle`);
  return response.data;
};

// Obtener lista de sílabos para el estudiante (oficiales matriculados + propios subidos)
export const getMySyllabi = async () => {
  const response = await apiClient.get('/silabo/mis-silabos');
  return response.data;
};

// Admin: Obtener chunks RAG de un sílabo
export const getSilaboChunks = async (id_silabo) => {
  const response = await apiClient.get(`/silabo/${id_silabo}/chunks`);
  return response.data;
};

// Admin: Actualizar un chunk RAG (regenera embedding)
export const updateSilaboChunk = async (id_silabo, id_chunk, data) => {
  const response = await apiClient.put(`/silabo/${id_silabo}/chunks/${id_chunk}`, data);
  return response.data;
};

// Admin: Actualizar reglas_json de un sílabo
export const updateSilaboReglasJson = async (id_silabo, reglas_json) => {
  const response = await apiClient.put(`/silabo/${id_silabo}/reglas-json`, { reglas_json });
  return response.data;
};

// Admin: Regenerar todos los chunks RAG de un sílabo
export const regenerarChunksSilabo = async (id_silabo) => {
  const response = await apiClient.post(`/silabo/${id_silabo}/regenerar-chunks`);
  return response.data;
};