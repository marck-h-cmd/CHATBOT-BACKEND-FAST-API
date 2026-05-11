/**
 * Clasifica errores de respuesta HTTP y devuelve un mensaje amigable
 */
export const handleApiError = (error) => {
  // Error de red o servidor caído
  if (error.message === 'Network Error') {
    return {
      title: 'Error de conexión',
      message: 'No se pudo conectar con el servidor. Verifica que el backend esté corriendo.',
      status: null,
    };
  }

  const response = error.response;
  if (!response) {
    return {
      title: 'Error inesperado',
      message: error.message || 'Ocurrió un error desconocido.',
      status: null,
    };
  }

  const { status, data } = response;
  let detail = data?.detail || data?.message || '';
  
  // Si detail es un objeto, convertirlo a string
  if (typeof detail === 'object' && detail !== null) {
    detail = JSON.stringify(detail);
  }
  
  // Si no hay detail, intentar obtener más información del error
  if (!detail) {
    if (Array.isArray(data)) {
      detail = data.map(err => err?.msg || err?.message || String(err)).join(', ');
    } else if (typeof data === 'object') {
      detail = Object.values(data).join(', ');
    }
  }

  switch (status) {
    case 400:
      return {
        title: 'Solicitud incorrecta',
        message: detail || 'Los datos enviados no son válidos.',
        status,
      };
    case 401:
      return {
        title: 'No autorizado',
        message: detail || 'Tu sesión ha expirado. Inicia sesión nuevamente.',
        status,
      };
    case 403:
      return {
        title: 'Acceso denegado',
        message: detail || 'No tienes permisos para realizar esta acción.',
        status,
      };
    case 404:
      return {
        title: 'No encontrado',
        message: detail || 'El recurso solicitado no existe.',
        status,
      };
    case 409:
      return {
        title: 'Conflicto',
        message: detail || 'El email o código universitario ya está registrado.',
        status,
      };
    case 422:
      return {
        title: 'Error de validación',
        message: detail || 'Algunos campos no cumplen el formato requerido.',
        status,
      };
    case 500:
      return {
        title: 'Error del servidor',
        message: detail || 'Hubo un problema en el servidor. Intenta más tarde.',
        status,
      };
    default:
      return {
        title: 'Error',
        message: detail || 'Ocurrió un error inesperado.',
        status,
      };
  }
};

/**
 * Muestra un error en consola (para desarrollo) y opcionalmente dispara una notificación
 */
export const logError = (error, context = 'API Error') => {
  console.error(`[${context}]`, error);
  if (import.meta.env.DEV) {
    console.debug('Detalles:', error.response?.data || error.message);
  }
};