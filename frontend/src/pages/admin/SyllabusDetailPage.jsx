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
      <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F19] p-6 flex items-center justify-center transition-colors duration-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Cargando detalles del sílabo...</p>
        </div>
      </div>
    );
  }

  if (!syllabusDetail) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F19] p-6 transition-colors duration-200">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate('/admin/silabos')}
            className="text-blue-600 dark:text-blue-400 hover:underline mb-6 font-semibold"
          >
            ← Volver
          </button>
          <div className="bg-white dark:bg-[#131A2C] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-card p-8 text-center">
            <p className="text-slate-600 dark:text-slate-400 font-medium">Sílabo no encontrado</p>
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
      APROBADO: 'bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-400 border border-green-200 dark:border-green-850',
      PENDIENTE_CONFIRMACION: 'bg-yellow-100 dark:bg-yellow-950/30 text-yellow-800 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-850',
      RECHAZADO: 'bg-red-100 dark:bg-red-950/30 text-red-800 dark:text-red-400 border border-red-200 dark:border-red-850',
    };
    return badges[estado] || 'bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
  };

  const getAmbitoBadge = (ambito) => {
    const badges = {
      PUBLICADO: 'bg-blue-100 dark:bg-blue-950/30 text-blue-800 dark:text-blue-400 border border-blue-200 dark:border-blue-850',
      COMPARTIBLE: 'bg-purple-100 dark:bg-purple-950/30 text-purple-800 dark:text-purple-400 border border-purple-200 dark:border-purple-850',
      PRIVADO: 'bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-300 border border-slate-200 dark:border-slate-705',
    };
    return badges[ambito] || 'bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-350 border border-slate-205';
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F19] p-6 transition-colors duration-200">
      <div className="max-w-4xl mx-auto">
        {/* Encabezado */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/admin/silabos')}
            className="text-blue-600 dark:text-blue-400 hover:underline mb-4 flex items-center gap-2 font-semibold"
          >
            ← Volver a Sílabos
          </button>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{syllabusDetail.nombre_curso}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-mono text-sm">{syllabusDetail.codigo_curso}</p>
        </div>

        {/* Grid principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna principal - Información detallada */}
          <div className="lg:col-span-2 space-y-6">
            {/* Información básica */}
            <div className="bg-white dark:bg-[#131A2C] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-card p-6">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 tracking-tight">Información Básica</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-start pb-4 border-b border-slate-100 dark:border-slate-800/80">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">Archivo</p>
                    <p className="text-slate-800 dark:text-slate-200 font-medium break-all">{syllabusDetail.nombre_archivo}</p>
                  </div>
                </div>

                <div className="flex justify-between items-start pb-4 border-b border-slate-100 dark:border-slate-800/80">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">Período Académico</p>
                    <p className="text-slate-800 dark:text-slate-200 font-medium">{syllabusDetail.periodo}</p>
                  </div>
                </div>

                <div className="flex justify-between items-start pb-4 border-b border-slate-100 dark:border-slate-800/80">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">Tipo de Sílabo</p>
                    <p className="text-slate-800 dark:text-slate-200 font-medium capitalize">
                      {syllabusDetail.tipo_silabo?.replace('_', ' ').toLowerCase()}
                    </p>
                  </div>
                </div>

                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">Fecha de Carga</p>
                    <p className="text-slate-800 dark:text-slate-200 font-medium">
                      {formatDate(syllabusDetail.fecha_subida)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Estados y Validación */}
            <div className="bg-white dark:bg-[#131A2C] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-card p-6">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 tracking-tight">Estados y Validación</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/80">
                  <span className="text-sm font-semibold text-slate-550 dark:text-slate-400">Estado de Validación</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${getEstadoBadge(syllabusDetail.estado_validacion)}`}>
                    {syllabusDetail.estado_validacion?.replace('_', ' ')}
                  </span>
                </div>

                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/80">
                  <span className="text-sm font-semibold text-slate-550 dark:text-slate-400">Ámbito de Uso</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${getAmbitoBadge(syllabusDetail.ambito_uso)}`}>
                    {syllabusDetail.ambito_uso?.replace('_', ' ')}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-550 dark:text-slate-400">Puntaje de Confianza</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-slate-200 dark:bg-slate-800 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          syllabusDetail.score >= 70
                            ? 'bg-emerald-500'
                            : syllabusDetail.score >= 40
                              ? 'bg-amber-500'
                              : 'bg-red-500'
                        }`}
                        style={{ width: `${syllabusDetail.score}%` }}
                      ></div>
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white text-sm w-12 text-right">
                      {syllabusDetail.score}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Información de Carga */}
            <div className="bg-white dark:bg-[#131A2C] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-card p-6">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 tracking-tight">Información de Carga</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Subido por</p>
                  <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 p-3.5 rounded-xl">
                    <p className="text-slate-805 dark:text-slate-205 font-semibold text-sm">{syllabusDetail.subido_por?.nombre || syllabusDetail.subido_por?.email}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{syllabusDetail.subido_por?.email}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Coincidencia de Período</p>
                  <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold border ${
                    syllabusDetail.coincidencia_periodo
                      ? 'bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900/30'
                      : 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/30'
                  }`}>
                    {syllabusDetail.coincidencia_periodo ? '✓ Sí' : '✗ No'}
                  </span>
                </div>
              </div>
            </div>

            {/* Contenido Extraído */}
            {syllabusDetail.texto_extraido && (
              <div className="bg-white dark:bg-[#131A2C] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-card p-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 tracking-tight">Contenido Extraído Completo</h2>
                <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-xl max-h-96 overflow-y-auto text-xs text-slate-705 dark:text-slate-300 font-mono whitespace-pre-wrap break-words">
                  {syllabusDetail.texto_extraido}
                </div>
              </div>
            )}

            {/* Observaciones */}
            {syllabusDetail.observaciones_validacion && (
              <div className="bg-white dark:bg-[#131A2C] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-card p-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 tracking-tight">Observaciones</h2>
                <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-xl text-sm text-slate-705 dark:text-slate-300 leading-relaxed">
                  {syllabusDetail.observaciones_validacion}
                </div>
              </div>
            )}

            {/* Datos Estructurados (Reglas) */}
            {syllabusDetail.reglas_json && (
              <div className="bg-white dark:bg-[#131A2C] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-card p-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 tracking-tight">Datos Estructurados para el Chatbot (Reglas/Fórmulas)</h2>
                <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl max-h-96 overflow-y-auto text-xs text-green-400 font-mono whitespace-pre-wrap break-words">
                  {JSON.stringify(syllabusDetail.reglas_json, null, 2)}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar derecho - Resumen y acciones */}
          <div className="space-y-6">
            {/* Tarjeta de resumen */}
            <div className="bg-white dark:bg-[#131A2C] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-card p-6 transition-colors duration-200">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 tracking-tight">Resumen</h2>
              <div className="space-y-3">
                <div className="pb-3 border-b border-slate-100 dark:border-slate-800/80">
                  <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Código</p>
                  <p className="text-slate-800 dark:text-slate-200 font-mono text-sm">{syllabusDetail.codigo_curso}</p>
                </div>

                <div className="pb-3 border-b border-slate-100 dark:border-slate-800/80">
                  <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">ID Sílabo</p>
                  <p className="text-slate-800 dark:text-slate-200 font-mono text-xs break-all">{syllabusDetail.id_silabo}</p>
                </div>

                <div className="pb-3 border-b border-slate-100 dark:border-slate-800/80">
                  <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Estudiantes Asignados</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{syllabusDetail.estudiantes_asignados || 0}</p>
                </div>

                <div className="pb-3">
                  <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Estado General</p>
                  <p className="text-sm font-semibold text-slate-805 dark:text-slate-205">
                    {syllabusDetail.estado_validacion === 'APROBADO' && syllabusDetail.ambito_uso === 'PUBLICADO'
                      ? '✓ Activo y Publicado'
                      : '○ No Publicado'}
                  </p>
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="bg-white dark:bg-[#131A2C] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-card p-6 transition-colors duration-200">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 tracking-tight">Acciones</h2>
              <div className="space-y-2">
                <button
                  onClick={() => navigate('/admin/silabos')}
                  className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm"
                >
                  Volver a Lista
                </button>
                <button
                  onClick={() => navigate(`/admin/silabos/${syllabusDetail.id_silabo}/editar`)}
                  className="w-full px-4 py-2.5 bg-blue-50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-400 rounded-xl font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800/80 transition-colors text-sm"
                  disabled
                  title="Función disponible próximamente"
                >
                  Editar
                </button>
              </div>
            </div>

            {/* Información de Sistema */}
            <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-150 dark:border-slate-800 rounded-xl p-4 text-xs text-slate-500 dark:text-slate-400 space-y-2">
              <div>
                <p className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1 text-[10px]">Información del Sistema</p>
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
