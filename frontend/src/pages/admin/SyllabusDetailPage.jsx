import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSyllabus } from '../../contexts/SyllabusContext';

export default function SyllabusDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getSyllabusDetail, syllabusDetail, loading } = useSyllabus();

  useEffect(() => {
    if (id) {
      getSyllabusDetail(parseInt(id));
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando detalles del sílabo...</p>
        </div>
      </div>
    );
  }

  if (!syllabusDetail) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate('/admin/silabos')}
            className="text-blue-600 hover:underline mb-6"
          >
            ← Volver
          </button>
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-600">Sílabo no encontrado</p>
          </div>
        </div>
      </div>
    );
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getEstadoBadge = (estado) => {
    const badges = {
      APROBADO: 'bg-green-100 text-green-800',
      PENDIENTE_CONFIRMACION: 'bg-yellow-100 text-yellow-800',
      RECHAZADO: 'bg-red-100 text-red-800',
    };
    return badges[estado] || 'bg-gray-100 text-gray-800';
  };

  const getAmbitoBadge = (ambito) => {
    const badges = {
      PUBLICADO: 'bg-blue-100 text-blue-800',
      COMPARTIBLE: 'bg-purple-100 text-purple-800',
      PRIVADO: 'bg-gray-100 text-gray-800',
    };
    return badges[ambito] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Encabezado */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/admin/silabos')}
            className="text-blue-600 hover:underline mb-4 flex items-center gap-2"
          >
            ← Volver a Sílabos
          </button>
          <h1 className="text-3xl font-bold text-gray-900">{syllabusDetail.nombre_curso}</h1>
          <p className="text-gray-600 mt-2">{syllabusDetail.codigo_curso}</p>
        </div>

        {/* Grid principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna principal - Información detallada */}
          <div className="lg:col-span-2 space-y-6">
            {/* Información básica */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Información Básica</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-start pb-4 border-b border-gray-200">
                  <div>
                    <p className="text-sm text-gray-600">Archivo</p>
                    <p className="text-gray-900 font-medium">{syllabusDetail.nombre_archivo}</p>
                  </div>
                </div>

                <div className="flex justify-between items-start pb-4 border-b border-gray-200">
                  <div>
                    <p className="text-sm text-gray-600">Período Académico</p>
                    <p className="text-gray-900 font-medium">{syllabusDetail.periodo}</p>
                  </div>
                </div>

                <div className="flex justify-between items-start pb-4 border-b border-gray-200">
                  <div>
                    <p className="text-sm text-gray-600">Tipo de Sílabo</p>
                    <p className="text-gray-900 font-medium capitalize">
                      {syllabusDetail.tipo_silabo?.replace('_', ' ').toLowerCase()}
                    </p>
                  </div>
                </div>

                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-gray-600">Fecha de Carga</p>
                    <p className="text-gray-900 font-medium">
                      {formatDate(syllabusDetail.fecha_subida)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Estados y Validación */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Estados y Validación</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                  <span className="text-gray-600">Estado de Validación</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getEstadoBadge(syllabusDetail.estado_validacion)}`}>
                    {syllabusDetail.estado_validacion?.replace('_', ' ')}
                  </span>
                </div>

                <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                  <span className="text-gray-600">Ámbito de Uso</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getAmbitoBadge(syllabusDetail.ambito_uso)}`}>
                    {syllabusDetail.ambito_uso?.replace('_', ' ')}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Puntaje de Confianza</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          syllabusDetail.score >= 70
                            ? 'bg-green-500'
                            : syllabusDetail.score >= 40
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                        }`}
                        style={{ width: `${syllabusDetail.score}%` }}
                      ></div>
                    </div>
                    <span className="font-bold text-gray-900 w-12 text-right">
                      {syllabusDetail.score}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Información de Carga */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Información de Carga</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Subido por</p>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-gray-900 font-medium">{syllabusDetail.subido_por?.nombre || syllabusDetail.subido_por?.email}</p>
                    <p className="text-sm text-gray-600">{syllabusDetail.subido_por?.email}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1">Coincidencia de Período</p>
                  <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${
                    syllabusDetail.coincidencia_periodo
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {syllabusDetail.coincidencia_periodo ? '✓ Sí' : '✗ No'}
                  </span>
                </div>
              </div>
            </div>

            {/* Contenido Extraído */}
            {syllabusDetail.texto_extraido && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Contenido Extraído Completo</h2>
                <div className="bg-gray-50 p-4 rounded max-h-96 overflow-y-auto text-sm text-gray-700 font-mono whitespace-pre-wrap break-words">
                  {syllabusDetail.texto_extraido}
                </div>
              </div>
            )}

            {/* Observaciones */}
            {syllabusDetail.observaciones_validacion && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Observaciones</h2>
                <div className="bg-gray-50 p-4 rounded text-gray-700">
                  {syllabusDetail.observaciones_validacion}
                </div>
              </div>
            )}

            {/* Datos Estructurados (Reglas) */}
            {syllabusDetail.reglas_json && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Datos Estructurados para el Chatbot (Reglas/Fórmulas)</h2>
                <div className="bg-gray-900 p-4 rounded max-h-96 overflow-y-auto text-sm text-green-400 font-mono whitespace-pre-wrap break-words">
                  {JSON.stringify(syllabusDetail.reglas_json, null, 2)}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar derecho - Resumen y acciones */}
          <div className="space-y-6">
            {/* Tarjeta de resumen */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Resumen</h2>
              <div className="space-y-3">
                <div className="pb-3 border-b border-gray-200">
                  <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Código</p>
                  <p className="text-gray-900 font-mono">{syllabusDetail.codigo_curso}</p>
                </div>

                <div className="pb-3 border-b border-gray-200">
                  <p className="text-xs text-gray-600 uppercase font-semibold mb-1">ID Sílabo</p>
                  <p className="text-gray-900 font-mono text-sm">{syllabusDetail.id_silabo}</p>
                </div>

                <div className="pb-3 border-b border-gray-200">
                  <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Estudiantes Asignados</p>
                  <p className="text-2xl font-bold text-blue-600">{syllabusDetail.estudiantes_asignados || 0}</p>
                </div>

                <div className="pb-3">
                  <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Estado General</p>
                  <p className="text-sm">
                    {syllabusDetail.estado_validacion === 'APROBADO' && syllabusDetail.ambito_uso === 'PUBLICADO'
                      ? '✓ Activo y Publicado'
                      : '○ No Publicado'}
                  </p>
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Acciones</h2>
              <div className="space-y-2">
                <button
                  onClick={() => navigate('/admin/silabos')}
                  className="w-full px-4 py-2 bg-gray-100 text-gray-900 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Volver a Lista
                </button>
                <button
                  onClick={() => navigate(`/admin/silabos/${syllabusDetail.id_silabo}/editar`)}
                  className="w-full px-4 py-2 bg-blue-100 text-blue-900 rounded-lg font-medium hover:bg-blue-200 transition-colors"
                  disabled
                  title="Función disponible próximamente"
                >
                  Editar
                </button>
              </div>
            </div>

            {/* Información de Sistema */}
            <div className="bg-gray-50 rounded-lg p-4 text-xs text-gray-600 space-y-2">
              <div>
                <p className="font-semibold text-gray-700 mb-1">Información del Sistema</p>
                <p>ID de Período: {syllabusDetail.id_periodo}</p>
                <p>ID de Curso: {syllabusDetail.id_curso}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
