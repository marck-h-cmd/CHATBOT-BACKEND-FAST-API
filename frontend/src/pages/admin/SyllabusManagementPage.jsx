import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSyllabus } from '../../contexts/SyllabusContext';
import { useCourse } from '../../contexts/CourseContext';
import SearchableSelect from '../../components/ui/SearchableSelect';
import {
  FileText, Plus, Search, Filter, BookOpen, Calendar, BarChart3,
  CheckCircle2, AlertTriangle, XCircle, Clock, ArrowRight,
  ChevronLeft, ChevronRight, AlertCircle, X, Upload, Trash2
} from 'lucide-react';

const ESTADO_LABELS = {
  APROBADO: 'Aprobado',
  PENDIENTE_CONFIRMACION: 'Pendiente',
  RECHAZADO: 'Rechazado',
  OFICIAL: 'Oficial',
};

export default function SyllabusManagementPage() {
  const navigate = useNavigate();
  const { officialSyllabi, loadOfficialSyllabi, deleteOfficialSyllabus, loading } = useSyllabus();
  const { courses, periods } = useCourse();

  const [filterEscuela, setFilterEscuela] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const itemsPerPage = 8;

  useEffect(() => {
    loadOfficialSyllabi(
      null,
      filterPeriod ? parseInt(filterPeriod) : null
    );
  }, [filterPeriod]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterEscuela, filterPeriod, searchTerm]);

  const stats = useMemo(() => {
    const total = officialSyllabi.length;
    const aprobados = officialSyllabi.filter(s => s.estado === 'APROBADO').length;
    const pendientes = officialSyllabi.filter(s => s.estado === 'PENDIENTE_CONFIRMACION').length;
    const rechazados = officialSyllabi.filter(s => s.estado === 'RECHAZADO').length;
    const avgScore = total > 0
      ? Math.round(officialSyllabi.reduce((s, c) => s + (c.score || 0), 0) / total)
      : 0;
    return { total, aprobados, pendientes, rechazados, avgScore };
  }, [officialSyllabi]);

  const escuelas = useMemo(() => {
    const list = new Set(courses?.map(c => c.escuela).filter(Boolean) || []);
    return Array.from(list).sort();
  }, [courses]);

  const filteredSyllabi = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return officialSyllabi.filter((silabo) => {
      const matchesSearch = !term ||
        silabo.nombre_curso.toLowerCase().includes(term) ||
        silabo.codigo_curso.toLowerCase().includes(term) ||
        silabo.nombre_archivo.toLowerCase().includes(term);
      const matchesEscuela = !filterEscuela || silabo.escuela === filterEscuela;
      return matchesSearch && matchesEscuela;
    });
  }, [officialSyllabi, searchTerm, filterEscuela]);

  const totalPages = Math.max(1, Math.ceil(filteredSyllabi.length / itemsPerPage));
  const paginatedSyllabi = filteredSyllabi.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const hasActiveFilters = searchTerm || filterEscuela || filterPeriod;

  const clearFilters = () => {
    setSearchTerm('');
    setFilterEscuela('');
    setFilterPeriod('');
  };

  const getEstadoConfig = (estado) => {
    const configs = {
      APROBADO: {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        icon: CheckCircle2,
      },
      PENDIENTE_CONFIRMACION: {
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        border: 'border-amber-200',
        icon: AlertTriangle,
      },
      RECHAZADO: {
        bg: 'bg-red-50',
        text: 'text-red-700',
        border: 'border-red-200',
        icon: XCircle,
      },
      OFICIAL: {
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        border: 'border-blue-200',
        icon: CheckCircle2,
      },
    };
    return configs[estado] || configs.PENDIENTE_CONFIRMACION;
  };

  const getScoreBarColor = (score) => {
    if (score >= 70) return 'bg-emerald-500';
    if (score >= 40) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-PE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const StatCard = ({ icon: Icon, value, label, tone }) => {
    const toneMap = {
      blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' },
      emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' },
      amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100' },
      red: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-100' },
    };
    const t = toneMap[tone] || toneMap.blue;
    return (
      <div className={`bg-white border ${t.border} rounded-xl p-4 flex items-center gap-3`}>
        <div className={`w-10 h-10 rounded-lg ${t.bg} flex items-center justify-center shrink-0`}>
          <Icon className={`w-5 h-5 ${t.text}`} />
        </div>
        <div className="min-w-0">
          <p className="text-xl font-bold text-slate-900 truncate">{value}</p>
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
        </div>
      </div>
    );
  };

  const handleDelete = async (id_silabo) => {
    const result = await deleteOfficialSyllabus(id_silabo);
    if (result.success) {
      setDeleteConfirm(null);
    } else {
      alert(result.error?.message || 'Error al eliminar el sílabo');
    }
  };

  const SyllabusCard = ({ silabo }) => {
    const estado = getEstadoConfig(silabo.estado);
    const EstadoIcon = estado.icon;
    const score = silabo.score || 0;

    return (
      <div className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-card-hover hover:border-slate-300 transition-all flex flex-col h-full">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md border ${estado.bg} ${estado.text} ${estado.border}`}>
            <EstadoIcon className="w-3 h-3" />
            {ESTADO_LABELS[silabo.estado] || silabo.estado}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); setDeleteConfirm(silabo); }}
              className="p-1 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
              title="Eliminar sílabo"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-semibold text-slate-400">
              {formatDate(silabo.fecha_subida)}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="mb-1">
          <span className="font-mono text-[11px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
            {silabo.codigo_curso}
          </span>
        </div>
        <h3 className="text-sm font-bold text-slate-900 leading-snug mb-1 line-clamp-2">
          {silabo.nombre_curso}
        </h3>
        <p className="text-xs text-slate-500 mb-1 truncate">
          {silabo.periodo}
        </p>
        <p className="text-[11px] text-slate-400 mb-4 truncate" title={silabo.nombre_archivo}>
          {silabo.nombre_archivo}
        </p>

        {/* Score bar */}
        <div className="mt-auto">
          <div className="flex items-center justify-between text-[10px] mb-1">
            <span className="font-semibold text-slate-500">Score de validación</span>
            <span className={`font-bold ${
              score >= 70 ? 'text-emerald-600' : score >= 40 ? 'text-amber-600' : 'text-red-600'
            }`}>
              {score}%
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5">
            <div
              className={`${getScoreBarColor(score)} h-1.5 rounded-full transition-all`}
              style={{ width: `${Math.min(100, score)}%` }}
            />
          </div>
        </div>

        {/* Action */}
        <button
          onClick={() => navigate(`/admin/silabos/${silabo.id_silabo}`)}
          className="mt-4 w-full py-2 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors flex items-center justify-center gap-1.5"
        >
          Ver detalles <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  };

  const EmptyState = () => (
    <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
      <div className="w-14 h-14 bg-slate-50 rounded-xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
        <AlertCircle className="w-6 h-6 text-slate-400" />
      </div>
      <h3 className="text-base font-bold text-slate-800 mb-1">
        {hasActiveFilters ? 'Sin resultados para los filtros' : 'No hay sílabos cargados'}
      </h3>
      <p className="text-sm text-slate-500 mb-4 max-w-sm mx-auto">
        {hasActiveFilters
          ? 'Prueba ajustando los filtros de búsqueda.'
          : 'Comienza subiendo el primer sílabo oficial del sistema.'}
      </p>
      {hasActiveFilters ? (
        <button onClick={clearFilters} className="text-sm font-semibold text-blue-600 hover:text-blue-700">
          Limpiar filtros
        </button>
      ) : (
        <button
          onClick={() => navigate('/admin/silabos/subir')}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
        >
          <Upload className="w-4 h-4" /> Subir primer sílabo
        </button>
      )}
    </div>
  );

  if (loading && officialSyllabi.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-3 border-blue-500 border-t-transparent"></div>
          <p className="text-sm text-slate-500">Cargando sílabos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <FileText className="w-7 h-7 text-blue-600" />
            Sílabos Oficiales
          </h1>
          <p className="text-sm text-slate-500 mt-1.5 max-w-lg">
            Gestiona los sílabos del sistema, revisa scores de validación y controla estados de aprobación.
          </p>
        </div>
        <button
          onClick={() => navigate('/admin/silabos/subir')}
          className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm shrink-0 transition-colors"
        >
          <Upload className="w-4 h-4" /> Subir Sílabo
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard icon={BookOpen} value={stats.total} label="Total" tone="blue" />
        <StatCard icon={CheckCircle2} value={stats.aprobados} label="Aprobados" tone="emerald" />
        <StatCard icon={AlertTriangle} value={stats.pendientes} label="Pendientes" tone="amber" />
        <StatCard icon={XCircle} value={stats.rechazados} label="Rechazados" tone="red" />
        <StatCard icon={BarChart3} value={`${stats.avgScore}%`} label="Score promedio" tone="blue" />
      </div>

      {/* Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-card">
        <div className="flex flex-col lg:flex-row gap-3 justify-between">
          {/* Search */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por curso, código o archivo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm font-medium text-slate-800 placeholder:text-slate-400"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            <SearchableSelect
              icon={Filter}
              placeholder="Todas las escuelas"
              searchPlaceholder="Buscar escuela..."
              value={filterEscuela}
              onChange={setFilterEscuela}
              options={[
                { value: '', label: 'Todas las escuelas' },
                ...escuelas.map((esc) => ({ value: esc, label: esc })),
              ]}
            />
            <SearchableSelect
              icon={Calendar}
              placeholder="Todos los periodos"
              searchPlaceholder="Buscar periodo..."
              value={filterPeriod}
              onChange={setFilterPeriod}
              options={[
                { value: '', label: 'Todos los periodos' },
                ...(periods?.map((p) => ({ value: String(p.id_periodo), label: p.nombre })) || []),
              ]}
            />
          </div>
        </div>

        {/* Active filters */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 flex-wrap">
            <span className="text-xs font-medium text-slate-500">Filtros:</span>
            {searchTerm && (
              <span className="inline-flex items-center gap-1 text-xs font-medium bg-blue-50 text-blue-700 px-2 py-1 rounded-md border border-blue-100">
                "{searchTerm}" <button onClick={() => setSearchTerm('')}><X className="w-3 h-3" /></button>
              </span>
            )}
            {filterEscuela && (
              <span className="inline-flex items-center gap-1 text-xs font-medium bg-violet-50 text-violet-700 px-2 py-1 rounded-md border border-violet-100">
                {filterEscuela} <button onClick={() => setFilterEscuela('')}><X className="w-3 h-3" /></button>
              </span>
            )}
            {filterPeriod && (
              <span className="inline-flex items-center gap-1 text-xs font-medium bg-amber-50 text-amber-700 px-2 py-1 rounded-md border border-amber-100">
                {periods?.find(p => String(p.id_periodo) === filterPeriod)?.nombre || 'Periodo'} <button onClick={() => setFilterPeriod('')}><X className="w-3 h-3" /></button>
              </span>
            )}
            <button onClick={clearFilters} className="text-xs font-semibold text-slate-500 hover:text-slate-700 ml-auto">
              Limpiar todo
            </button>
          </div>
        )}
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Mostrando <span className="font-bold text-slate-900">{paginatedSyllabi.length}</span> de{' '}
          <span className="font-bold text-slate-900">{filteredSyllabi.length}</span> sílabos
        </p>
      </div>

      {/* Cards Grid */}
      {filteredSyllabi.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {paginatedSyllabi.map(silabo => (
            <SyllabusCard key={silabo.id_silabo} silabo={silabo} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Página {currentPage} de {totalPages}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-9 h-9 rounded-lg text-sm font-semibold transition-colors ${
                  currentPage === page
                    ? 'bg-blue-600 text-white'
                    : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modal de confirmación para eliminar */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Eliminar sílabo oficial</h3>
                <p className="text-sm text-slate-500">
                  Esta acción no se puede deshacer.
                </p>
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 mb-6">
              <p className="text-sm font-medium text-slate-800">{deleteConfirm.nombre_curso}</p>
              <p className="text-xs text-slate-500">{deleteConfirm.codigo_curso} · {deleteConfirm.periodo}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm.id_silabo)}
                disabled={loading}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" /> Eliminar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
