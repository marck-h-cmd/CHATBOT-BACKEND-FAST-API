/**
 * Formatea una nota (número) con 2 decimales
 * Ej: 14.6666 → "14.67"
 */
export const formatGrade = (grade) => {
  if (typeof grade !== 'number' || isNaN(grade)) return '--';
  return grade.toFixed(2);
};

/**
 * Aplica redondeo de medio punto a favor del estudiante
 * Regla: si la parte decimal es 0.5 o más, redondea hacia arriba
 * Ej: 13.5 → 14; 13.4 → 13
 */
export const applyHalfPointRounding = (grade) => {
  const decimal = grade - Math.floor(grade);
  if (decimal >= 0.5) {
    return Math.ceil(grade);
  }
  return Math.floor(grade);
};

/**
 * Formatea una fecha en formato local DD/MM/YYYY HH:MM
 */
export const formatDateTime = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Formatea una fecha solo en DD/MM/YYYY
 */
export const formatDate = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleDateString('es-PE');
};

/**
 * Trunca un texto a una longitud máxima y añade "..."
 */
export const truncateText = (text, maxLength = 100) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Capitaliza la primera letra de cada palabra
 */
export const capitalizeWords = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};