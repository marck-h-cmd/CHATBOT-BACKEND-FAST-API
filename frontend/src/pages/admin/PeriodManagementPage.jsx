import React, { useState, useMemo, useEffect } from 'react';
import { useCourse } from '../../contexts/CourseContext';
import * as periodAPI from '../../api/periods';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import {
  CalendarDays, Plus, Edit2, CheckCircle2, PlayCircle, AlertCircle,
  Clock, TrendingUp, Calendar, X, ChevronLeft, ChevronRight
} from 'lucide-react';

const PeriodManagementPage = () => {
  const { periods, loading, refreshData } = useCourse();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const [formData, setFormData] = useState({
    anio: new Date().getFullYear(),
    termino: '',
    nombre: '',
    es_actual: false,
    fecha_inicio: '',
    fecha_fin: ''
  });

  const stats = useMemo(() => {
    const total = periods.length;
    const actual = periods.find(p => p.es_actual);
    const anios = new Set(periods.map(p => p.anio)).size;
    const abiertos = periods.filter(p => {
      const fin = new Date(p.fecha_fin);
      return fin >= new Date();
    }).length;
    return { total, actual, anios, abiertos };
  }, [periods]);

  const sortedPeriods = useMemo(() => {
    return [...periods].sort((a, b) => {
      if (a.es_actual && !b.es_actual) return -1;
      if (!a.es_actual && b.es_actual) return 1;
      return new Date(b.fecha_inicio) - new Date(a.fecha_inicio);
    });
  }, [periods]);

  const totalPages = Math.max(1, Math.ceil(sortedPeriods.length / itemsPerPage));
  const paginatedPeriods = sortedPeriods.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [periods.length]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await periodAPI.createPeriod(formData);
      setIsModalOpen(false);
      resetForm();
      refreshData();
    } catch (error) {
      alert('Error al crear periodo: ' + error.message);
    }
  };

  const handleEdit = (period) => {
    setEditingPeriod(period);
    setFormData({
      anio: period.anio,
      termino: period.termino,
      nombre: period.nombre,
      es_actual: period.es_actual,
      fecha_inicio: period.fecha_inicio?.split('T')[0] || '',
      fecha_fin: period.fecha_fin?.split('T')[0] || ''
    });
    setIsModalOpen(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await periodAPI.updatePeriod(editingPeriod.id_periodo, formData);
      setIsModalOpen(false);
      resetForm();
      setEditingPeriod(null);
      refreshData();
    } catch (error) {
      alert('Error al actualizar periodo: ' + error.message);
    }
  };

  const handleSetCurrent = async (id_periodo) => {
    if (!confirm('¿Deseas activar este periodo? Todos los demás periodos pasarán a inactivos.')) return;
    try {
      await periodAPI.updatePeriod(id_periodo, { es_actual: true });
      refreshData();
    } catch (error) {
      alert('Error al establecer periodo actual: ' + error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      anio: new Date().getFullYear(),
      termino: '',
      nombre: '',
      es_actual: false,
      fecha_inicio: '',
      fecha_fin: ''
    });
  };

  const openCreateModal = () => {
    resetForm();
    setEditingPeriod(null);
    setIsModalOpen(true);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const StatCard = ({ icon: Icon, value, label, tone }) => {
    const toneMap = {
      blue: { bg: 'bg-blue-50 dark:bg-blue-950/20', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-100 dark:border-blue-900/30' },
      emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950/20', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-100 dark:border-emerald-900/30' },
      violet: { bg: 'bg-violet-50 dark:bg-violet-950/20', text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-100 dark:border-violet-900/30' },
      amber: { bg: 'bg-amber-50 dark:bg-amber-950/20', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-100 dark:border-amber-900/30' },
    };
    const t = toneMap[tone] || toneMap.blue;
    return (
      <div className={`bg-white dark:bg-[#131A2C] border ${t.border} rounded-xl p-4 flex items-center gap-3 transition-colors duration-200`}>
        <div className={`w-10 h-10 rounded-lg ${t.bg} flex items-center justify-center shrink-0`}>
          <Icon className={`w-5 h-5 ${t.text}`} />
        </div>
        <div className="min-w-0">
          <p className="text-xl font-bold text-slate-900 dark:text-white truncate">{value}</p>
          <p className="text-[11px] font-semibold text-slate-505 dark:text-slate-400 uppercase tracking-wider">{label}</p>
        </div>
      </div>
    );
  };

  const PeriodCard = ({ period }) => {
    const isCurrent = period.es_actual;
    const isPast = new Date(period.fecha_fin) < new Date();
    const durationDays = Math.ceil(
      (new Date(period.fecha_fin) - new Date(period.fecha_inicio)) / (1000 * 60 * 60 * 24)
    );

    return (
      <div className={`bg-white dark:bg-[#131A2C] border rounded-xl p-5 transition-all hover:shadow-card-hover ${
        isCurrent ? 'border-blue-300 dark:border-blue-500/50 ring-1 ring-blue-100 dark:ring-blue-900/30' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
      }`}>
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md border ${
              isCurrent
                ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30'
                : isPast
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-202 dark:border-slate-700'
                  : 'bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-900/30'
            }`}>
              {isCurrent && <CheckCircle2 className="w-3 h-3" />}
              {isCurrent ? 'En curso' : isPast ? 'Finalizado' : 'Próximo'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {!isCurrent && (
              <button
                onClick={() => handleSetCurrent(period.id_periodo)}
                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-colors"
                title="Activar como periodo actual"
              >
                <PlayCircle className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => handleEdit(period)}
              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-colors"
              title="Editar"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">{period.nombre}</h3>
        <p className="text-xs text-slate-505 dark:text-slate-400 mb-4">
          Año {period.anio} · Término {period.termino}
        </p>

        {/* Dates */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-slate-600 dark:text-slate-350">Inicio: <span className="font-medium text-slate-808 dark:text-slate-200">{formatDate(period.fecha_inicio)}</span></span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-slate-600 dark:text-slate-350">Fin: <span className="font-medium text-slate-808 dark:text-slate-200">{formatDate(period.fecha_fin)}</span></span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <TrendingUp className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-slate-600 dark:text-slate-350">Duración: <span className="font-medium text-slate-808 dark:text-slate-200">{durationDays} días</span></span>
          </div>
        </div>

        {/* Progress bar */}
        {isCurrent && (
          <div className="mt-auto">
            <div className="flex items-center justify-between text-[10px] mb-1">
              <span className="font-semibold text-slate-500 dark:text-slate-400">Progreso del periodo</span>
              <span className="font-bold text-blue-600 dark:text-blue-400">
                {Math.min(100, Math.round(
                  ((new Date() - new Date(period.fecha_inicio)) /
                   (new Date(period.fecha_fin) - new Date(period.fecha_inicio))) * 100
                ))}%
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
              <div
                className="bg-blue-600 dark:bg-blue-500 h-1.5 rounded-full transition-all"
                style={{
                  width: `${Math.min(100, Math.round(
                    ((new Date() - new Date(period.fecha_inicio)) /
                     (new Date(period.fecha_fin) - new Date(period.fecha_inicio))) * 100
                  ))}%`
                }}
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <CalendarDays className="w-7 h-7 text-blue-600" />
            Gestión de Periodos
          </h1>
          <p className="text-sm text-slate-505 dark:text-slate-400 mt-1.5 max-w-lg">
            Administra los ciclos académicos, controla vigencias y establece el periodo activo del sistema.
          </p>
        </div>
        <Button
          onClick={openCreateModal}
          className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" /> Nuevo Periodo
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Calendar} value={stats.total} label="Periodos" tone="blue" />
        <StatCard icon={CheckCircle2} value={stats.actual?.nombre || 'Ninguno'} label="Periodo actual" tone="emerald" />
        <StatCard icon={TrendingUp} value={stats.anios} label="Años cubiertos" tone="violet" />
        <StatCard icon={Clock} value={stats.abiertos} label="Periodos abiertos" tone="amber" />
      </div>

      {/* Current Period Banner */}
      {stats.actual && (
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-202 dark:border-emerald-900/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-455" />
            </div>
            <div>
              <p className="text-sm font-bold text-emerald-900 dark:text-emerald-200">Periodo actual activo</p>
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
                {stats.actual.nombre} · {formatDate(stats.actual.fecha_inicio)} — {formatDate(stats.actual.fecha_fin)}
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-707 dark:text-emerald-400 px-2.5 py-1 rounded-md border border-emerald-202 dark:border-emerald-800 self-start sm:self-center">
            EN CURSO
          </span>
        </div>
      )}

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-505 dark:text-slate-400">
          Mostrando <span className="font-bold text-slate-900 dark:text-white">{paginatedPeriods.length}</span> de{' '}
          <span className="font-bold text-slate-900 dark:text-white">{sortedPeriods.length}</span> periodos
        </p>
      </div>

      {/* Cards Grid */}
      {sortedPeriods.length === 0 ? (
        <div className="bg-white dark:bg-[#131A2C] border border-slate-202 dark:border-slate-800 rounded-2xl p-12 text-center transition-colors duration-200">
          <div className="w-14 h-14 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-4 border border-slate-100 dark:border-slate-700">
            <AlertCircle className="w-6 h-6 text-slate-400 dark:text-slate-500" />
          </div>
          <h3 className="text-base font-bold text-slate-808 dark:text-white mb-1">No hay periodos registrados</h3>
          <p className="text-sm text-slate-505 dark:text-slate-400 mb-4 max-w-sm mx-auto">
            Comienza aperturando el primer periodo académico para el sistema.
          </p>
          <Button onClick={openCreateModal} className="bg-blue-600 hover:bg-blue-707 text-white text-sm">
            <Plus className="w-4 h-4 mr-1.5" /> Aperturar periodo
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedPeriods.map(period => (
            <PeriodCard key={period.id_periodo} period={period} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-505 dark:text-slate-400">
            Página {currentPage} de {totalPages}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-slate-208 dark:border-slate-800 text-slate-605 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-9 h-9 rounded-lg text-sm font-semibold transition-colors ${
                  currentPage === page
                    ? 'bg-blue-655 dark:bg-blue-500 text-white'
                    : 'border border-slate-208 dark:border-slate-800 text-slate-605 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-slate-208 dark:border-slate-800 text-slate-605 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingPeriod ? 'Editar Periodo' : 'Aperturar Nuevo Periodo'}>
        <form onSubmit={editingPeriod ? handleUpdate : handleCreate} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-705 dark:text-slate-300 mb-1.5">Nombre Oficial del Periodo</label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({...formData, nombre: e.target.value})}
              className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
              placeholder="Ej. 2026-I"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-705 dark:text-slate-300 mb-1.5">Año</label>
              <input
                type="number"
                min="2020"
                max="2050"
                value={formData.anio}
                onChange={(e) => setFormData({...formData, anio: parseInt(e.target.value)})}
                className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-705 dark:text-slate-300 mb-1.5">Término</label>
              <select
                value={formData.termino}
                onChange={(e) => setFormData({...formData, termino: e.target.value})}
                className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white appearance-none"
                required
              >
                <option value="">Seleccionar...</option>
                <option value="I">I</option>
                <option value="II">II</option>
                <option value="Verano">Verano</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-705 dark:text-slate-300 mb-1.5">Fecha de Inicio</label>
              <input
                type="date"
                value={formData.fecha_inicio}
                onChange={(e) => setFormData({...formData, fecha_inicio: e.target.value})}
                className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-705 dark:text-slate-300 mb-1.5">Fecha de Fin</label>
              <input
                type="date"
                value={formData.fecha_fin}
                onChange={(e) => setFormData({...formData, fecha_fin: e.target.value})}
                className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                required
              />
            </div>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={formData.es_actual}
                onChange={(e) => setFormData({...formData, es_actual: e.target.checked})}
              />
              <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-655 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-655"></div>
              <span className="ml-3 text-sm font-medium text-slate-705 dark:text-slate-300">Forzar como periodo actual</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-5 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="text-sm">
              Cancelar
            </Button>
            <Button type="submit" className="bg-blue-600 text-white hover:bg-blue-700 text-sm px-5">
              {editingPeriod ? 'Guardar Cambios' : 'Aperturar Periodo'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PeriodManagementPage;
