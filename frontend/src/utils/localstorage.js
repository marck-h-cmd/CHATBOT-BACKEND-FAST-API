// Claves usadas en localStorage
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  SELECTED_SYLLABUS_ID: 'selected_syllabus_id',
  USER: 'user',
};

export const saveTokens = (accessToken, refreshToken) => {
  if (accessToken) localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
  if (refreshToken) localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
};

export const getAccessToken = () => localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
export const getRefreshToken = () => localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);

export const clearTokens = () => {
  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
};

export const saveSelectedSyllabusId = (id) => {
  if (id) localStorage.setItem(STORAGE_KEYS.SELECTED_SYLLABUS_ID, id);
};

export const getSelectedSyllabusId = () => localStorage.getItem(STORAGE_KEYS.SELECTED_SYLLABUS_ID);

export const saveUser = (user) => {
  if (user) localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
};

export const getUser = () => {
  const userStr = localStorage.getItem(STORAGE_KEYS.USER);
  return userStr ? JSON.parse(userStr) : null;
};

export const clearUser = () => localStorage.removeItem(STORAGE_KEYS.USER);

export const clearAll = () => {
  clearTokens();
  clearUser();
  localStorage.removeItem(STORAGE_KEYS.SELECTED_SYLLABUS_ID);
};