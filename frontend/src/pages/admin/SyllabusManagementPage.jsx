import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSyllabus } from '../../contexts/SyllabusContext';
import { useCourse } from '../../contexts/CourseContext';
import Button from '../../components/ui/Button';
import { FileText, Search, Plus, Filter, ChevronRight, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

export default function SyllabusManagementPage() {
  const navigate = useNavigate();
  const { officialSyllabi, loadOfficialSyllabi, loading } = useSyllabus();
  const { courses, periods } = useCourse();

  const [filterCourse, setFilterCourse] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadOfficialSyllabi(
      filterCourse ? parseInt(filterCourse) : null,
      filterPeriod ? parseInt(filterPeriod) : null
    );
  }, [filterCourse, filterPeriod]);

  const filteredSyllabi = useMemo(() => {
    return officialSyllabi.filter((silabo) => {
      const sTerm = searchTerm.toLowerCase();
      return (
        silabo.nombre_curso.toLowerCase().includes(sTerm) ||
        silabo.codigo_curso.toLowerCase().includes(sTerm) ||
        silabo.nombre_archivo.toLowerCase().includes(sTerm)
      );
    });
  }, [officialSyllabi, searchTerm]);

  const getEstadoBadge = (estado) => {
    switch (estado) {
      case 'APROBADO':
        return <span className="px-2.5 py-1 inline-flex items-center gap-1.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle2 className="w-3.5 h-3.5" /> Aprobado</span>;
      case 'PENDIENTE_CONFIRMACION':
        return <span className="px-2.5 py-1 inline-flex items-center gap-1.5 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200"><AlertTriangle className="w-3.5 h-3.5" /> Pendiente</span>;
      case 'RECHAZADO':
        return <span className="px-2.5 py-1 inline-flex items-center gap-1.5 text-xs font-semibold rounded-full bg-red-50 text-red-700 border border-red-200"><XCircle className="w-3.5 h-3.5" /> Rechazado</span>;
      default:
        return <span className="px-2.5 py-1 inline-flex items-center gap-1.5 text-xs font-semibold rounded-full bg-slate-50 text-slate-700 border border-slate-200">{estado?.replace('_', ' ')}</span>;
    }
  };

  const getScoreColor = (score) => {
    if (score >= 70) return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    if (score >= 40) return 'text-amber-600 bg-amber-50 border-amber-100';
    return 'text-red-600 bg-red-50 border-red-100';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-ES', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-600" /> Repositorio de Sílabos Oficiales
          </h1>
          <p className="text-slate-500 mt-1">Administra los sílabos oficiales cargados en el sistema RAG.</p>
        </div>
        <Button onClick={() => navigate('/admin/silabos/subir')} className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 px-4">
          <Plus className="w-4 h-4" /> Subir Oficial
        </Button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        {/* Toolbar de Filtros */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Búsqueda */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Buscar por nombre, código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors text-sm"
              />
            </div>

            {/* Filtro por curso */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Filter className="h-4 w-4 text-slate-400" />
              </div>
              <select
                value={filterCourse}
                onChange={(e) => setFilterCourse(e.target.value)}
                className="w-full pl-9 pr-8 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors text-sm appearance-none font-medium text-slate-700"
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
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Filter className="h-4 w-4 text-slate-400" />
              </div>
              <select
                value={filterPeriod}
                onChange={(e) => setFilterPeriod(e.target.value)}
                className="w-full pl-9 pr-8 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors text-sm appearance-none font-medium text-slate-700"
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
            <div>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterCourse('');
                  setFilterPeriod('');
                }}
                className="w-full px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-100 transition-colors text-sm"
              >
                Limpiar Filtros
              </button>
            </div>
          </div>
        </div>

        {/* Tabla de sílabos */}
        <div className="overflow-x-auto min-h-[300px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent mb-4"></div>
              <p className="text-sm font-medium">Cargando repositorio...</p>
            </div>
          ) : filteredSyllabi.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center px-4">
              <FileText className="w-12 h-12 text-slate-300 mb-3" />
              <p className="text-slate-600 font-medium mb-1">
                {officialSyllabi.length === 0
                  ? 'El repositorio está vacío'
                  : 'No se encontraron resultados'}
              </p>
              <p className="text-slate-500 text-sm mb-4">
                {officialSyllabi.length === 0
                  ? 'Sube el primer sílabo oficial para comenzar.'
                  : 'Prueba ajustando los filtros de búsqueda.'}
              </p>
              {officialSyllabi.length === 0 && (
                <Button onClick={() => navigate('/admin/silabos/subir')} variant="outline">
                  Subir primer sílabo
                </Button>
              )}
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider font-semibold text-slate-500">
                  <th className="px-6 py-4">Asignatura</th>
                  <th className="px-6 py-4 whitespace-nowrap">Código</th>
                  <th className="px-6 py-4 whitespace-nowrap">Período</th>
                  <th className="px-6 py-4">Archivo</th>
                  <th className="px-6 py-4 text-center whitespace-nowrap">Score IA</th>
                  <th className="px-6 py-4 whitespace-nowrap">Estado</th>
                  <th className="px-6 py-4 whitespace-nowrap">Fecha de Carga</th>
                  <th className="px-6 py-4 text-right whitespace-nowrap">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSyllabi.map((silabo) => (
                  <tr key={silabo.id_silabo} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-800 text-sm">{silabo.nombre_curso}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs font-semibold bg-slate-100 text-slate-700 px-2 py-1 rounded border border-slate-200">
                        {silabo.codigo_curso}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-slate-600">{silabo.periodo}</span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-500 truncate max-w-[150px]" title={silabo.nombre_archivo}>
                        {silabo.nombre_archivo}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block px-2 py-1 rounded font-bold text-xs border ${getScoreColor(silabo.score)}`}>
                        {silabo.score}%
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {getEstadoBadge(silabo.estado)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-500">{formatDate(silabo.fecha_subida)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => navigate(`/admin/silabos/${silabo.id_silabo}`)}
                        className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium"
                      >
                        Inspeccionar <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pie de tabla con información */}
        {filteredSyllabi.length > 0 && (
          <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 text-sm text-slate-500 flex justify-between items-center">
            <span>
              Mostrando <span className="font-medium text-slate-700">{filteredSyllabi.length}</span> de{' '}
              <span className="font-medium text-slate-700">{officialSyllabi.length}</span> sílabos
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
