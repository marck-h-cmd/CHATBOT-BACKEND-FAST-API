import apiClient from './client';

export const sendQuestion = async (pregunta, idSilabo) => {
  const response = await apiClient.post('/chat/consultar', {
    pregunta,
    id_silabo: idSilabo,
  });
  return response.data;
};

export const getUserSyllabi = async () => {
  const response = await apiClient.get('/chat/silabos');
  return response.data;
};