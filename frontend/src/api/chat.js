import apiClient from './client';

export const sendQuestion = async (pregunta, idContexto, historial = [], idSesion = null) => {
  const response = await apiClient.post('/chat/consultar', {
    pregunta,
    id_contexto: idContexto,
    id_sesion: idSesion,
    historial
  });
  return response.data;
};

export const getSessions = async (idContexto) => {
  const response = await apiClient.get(`/chat/sessions/${idContexto}`);
  return response.data;
};

export const getHistory = async (idSesion) => {
  const response = await apiClient.get(`/chat/history/${idSesion}`);
  return response.data;
};

export const getUserSyllabi = async () => {
  const response = await apiClient.get('/chat/silabos');
  return response.data;
};