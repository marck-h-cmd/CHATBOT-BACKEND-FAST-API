import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSyllabus } from '../../contexts/SyllabusContext';
import { useCourse } from '../../contexts/CourseContext';
import Pagination from '../../components/ui/Pagination';

export default function SyllabusManagementPage() {
  const navigate = useNavigate();
  const { officialSyllabi, loadOfficialSyllabi, loading } = useSyllabus();
  const { courses, periods } = useCourse();

  const [filterCourse, setFilterCourse] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadOfficialSyllabi(
      filterCourse ? parseInt(filterCourse) : null,
      filterPeriod ? parseInt(filterPeriod) : null
    );
  }, [filterCourse, filterPeriod]);

  const filteredSyllabi = officialSyllabi.filter(
    (silabo) =>
      silabo.nombre_curso.toLowerCase().includes(searchTerm.toLowerCase()) ||
      silabo.codigo_curso.toLowerCase().includes(searchTerm.toLowerCase()) ||
      silabo.nombre_archivo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [filterCourse, filterPeriod, searchTerm]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedSyllabi = filteredSyllabi.slice(startIndex, startIndex + itemsPerPage);

  const getEstadoBadge = (estado) => {
    const badges = {
      APROBADO: 'bg-green-100 text-green-800',
      PENDIENTE_CONFIRMACION: 'bg-yellow-100 text-yellow-800',
      RECHAZADO: 'bg-red-100 text-red-800',
    };
    return badges[estado] || 'bg-gray-100 text-gray-800';
  };

  const getScoreColor = (score) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      month: 'short',
      day: 'numeric',
      year: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Encabezado */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Gestión de Sílabos Oficiales</h1>
              <p className="text-gray-600 mt-2">
                Administra los sílabos oficiales del sistema
              </p>
            </div>
            <button
              onClick={() => navigate('/admin/silabos/subir')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              ⬆ Subir Nuevo Sílabo
            </button>
          </div>
        </div>

        {/* Filtros y búsqueda */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Búsqueda */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Buscar
              </label>
              <input
                type="text"
                placeholder="Nombre, código, archivo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filtro por curso */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Filtrar por Curso
              </label>
              <select
                value={filterCourse}
                onChange={(e) => setFilterCourse(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos los cursos</option>
                {courses?.map((course) => (
                  <option key={course.id_curso} value={course.id_curso}>
                    {course.codigo_curso}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro por período */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Filtrar por Período
              </label>
              <select
                value={filterPeriod}
                onChange={(e) => setFilterPeriod(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos los períodos</option>
                {periods?.map((period) => (
                  <option key={period.id_periodo} value={period.id_periodo}>
                    {period.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Limpiar filtros */}
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterCourse('');
                  setFilterPeriod('');
                }}
                className="w-full px-4 py-2 bg-gray-200 text-gray-900 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Limpiar
              </button>
            </div>
          </div>
        </div>

        {/* Tabla de sílabos */}
        {loading ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando sílabos...</p>
          </div>
        ) : filteredSyllabi.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-600 mb-4">
              {officialSyllabi.length === 0
                ? 'No hay sílabos oficiales cargados'
                : 'No se encontraron resultados con los filtros aplicados'}
            </p>
            {officialSyllabi.length === 0 && (
              <button
                onClick={() => navigate('/admin/silabos/subir')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Subir primer sílabo
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Curso
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Código
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Período
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Archivo
                    </th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">
                      Score
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedSyllabi.map((silabo) => (
                    <tr key={silabo.id_silabo} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                        {silabo.nombre_curso}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 font-mono">
                        {silabo.codigo_curso}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {silabo.periodo}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                        {silabo.nombre_archivo}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`font-bold text-sm ${getScoreColor(silabo.score)}`}
                        >
                          {silabo.score}%
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getEstadoBadge(silabo.estado)}`}
                        >
                          {silabo.estado?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(silabo.fecha_subida)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => navigate(`/admin/silabos/${silabo.id_silabo}`)}
                          className="text-blue-600 hover:underline font-medium text-sm"
                        >
                          Ver detalles →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredSyllabi.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalItems={filteredSyllabi.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
