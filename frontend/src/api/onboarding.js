import apiClient from './client';

export const getOnboardingStatus = async () => {
  const resp = await apiClient.get('/onboarding/status');
  return resp.data;
};

export const updateOnboardingStatus = async (payload) => {
  const resp = await apiClient.patch('/onboarding/status', payload);
  return resp.data;
};
