import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    const { errorCount } = this.state;
    const newCount = errorCount + 1;
    
    // Log error details
    console.error('Error caught by boundary:', error);
    console.error('Error info:', errorInfo);
    
    this.setState({
      error,
      errorInfo,
      errorCount: newCount
    });

    // Enviar error a servicio de logging si existe
    if (window.logError) {
      window.logError({
        error: error?.toString(),
        errorInfo: errorInfo?.componentStack,
        timestamp: new Date().toISOString(),
        errorCount: newCount
      });
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  handleReload = () => {
    window.location.href = '/';
  };

  render() {
    const { hasError, error, errorInfo, errorCount } = this.state;
    const { children, fallback } = this.props;

    if (!hasError) {
      return children;
    }

    // Si hay más de 3 errores consecutivos, mostrar opción de recargar
    const shouldReload = errorCount > 3;

    if (fallback) {
      return fallback(error, this.handleReset, this.handleReload);
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
          <div className="text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">¡Algo salió mal!</h1>
            <p className="text-gray-600 mb-4">
              La aplicación encontró un error inesperado.
            </p>

            {process.env.NODE_ENV === 'development' && (
              <div className="mb-4 text-left bg-red-50 border border-red-200 rounded p-3">
                <h2 className="font-semibold text-red-800 mb-2">Detalles del error:</h2>
                <p className="text-sm text-red-700 font-mono mb-2">
                  {error && error.toString()}
                </p>
                {errorInfo && (
                  <details className="text-xs text-red-600">
                    <summary className="cursor-pointer font-semibold mb-2">
                      Stack trace
                    </summary>
                    <pre className="overflow-auto text-red-600 whitespace-pre-wrap">
                      {errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className="space-y-2">
              <button
                onClick={this.handleReset}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Intentar nuevamente
              </button>

              {shouldReload && (
                <button
                  onClick={this.handleReload}
                  className="w-full px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors"
                >
                  Recargar aplicación
                </button>
              )}

              <a
                href="/"
                className="block w-full px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors text-center"
              >
                Ir al inicio
              </a>
            </div>

            {errorCount > 1 && (
              <p className="text-xs text-gray-500 mt-4">
                Errores consecutivos: {errorCount}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
