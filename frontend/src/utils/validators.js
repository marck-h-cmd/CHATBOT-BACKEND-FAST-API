/**
 * Valida email institucional de la UNT
 * Formato: cualquier cosa @unitru.edu.pe
 */
export const isValidUniversityEmail = (email) => {
  const regex = /^[^\s@]+@unitru\.edu\.pe$/;
  return regex.test(email);
};

/**
 * Valida código universitario (8 a 10 dígitos)
 */
export const isValidUniversityCode = (code) => {
  const regex = /^\d{8,10}$/;
  return regex.test(code);
};

/**
 * Valida que la contraseña tenga al menos 6 caracteres
 */
export const isValidPassword = (password) => {
  return password && password.length >= 6;
};

/**
 * Valida nombre y apellidos (solo letras, espacios, mínimo 2 caracteres)
 */
export const isValidName = (name) => {
  const regex = /^[a-zA-ZáéíóúñÑ\s]{2,}$/;
  return regex.test(name);
};

/**
 * Valida que la nota sea un número entre 0 y 20
 */
export const isValidGrade = (grade) => {
  const num = parseFloat(grade);
  return !isNaN(num) && num >= 0 && num <= 20;
};