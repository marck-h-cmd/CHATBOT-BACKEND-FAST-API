import apiClient from './client';

export const sendQuestion = async (pregunta, idContexto) => {
  const response = await apiClient.post('/chat/consultar', {
    pregunta,
    id_contexto: idContexto,
  });
  return response.data;
};

export const getUserSyllabi = async () => {
  const response = await apiClient.get('/chat/silabos');
  return response.data;
};