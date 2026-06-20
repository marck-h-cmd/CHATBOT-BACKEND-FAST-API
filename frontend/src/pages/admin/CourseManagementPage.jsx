import React, { useState, useMemo, useEffect } from 'react';
import { useCourse } from '../../contexts/CourseContext';
import * as courseAPI from '../../api/courses';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import Pagination from '../../components/ui/Pagination';
import {
  Search, Plus, Edit2, Trash2, BookMarked, Filter, LayoutGrid, List,
  GraduationCap, Building2, Award, Layers, X, ChevronLeft, ChevronRight,
  AlertCircle
} from 'lucide-react';

const CICLOS_ORDEN = ['I','II','III','IV','V','VI','VII','VIII','IX','X'];

const CourseManagementPage = () => {
  const { courses, loading, refreshData } = useCourse();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEscuela, setFilterEscuela] = useState('all');
  const [filterCiclo, setFilterCiclo] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = viewMode === 'grid' ? 8 : 10;

  const [formData, setFormData] = useState({
    codigo_curso: '',
    nombre_curso: '',
    ciclo_referencial: '',
    creditos: 3,
    escuela: 'Ingeniería de Sistemas',
    estado: true
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterEscuela, filterCiclo, viewMode]);

  const stats = useMemo(() => {
    const total = courses.length;
    const creditos = courses.reduce((s, c) => s + (c.creditos || 0), 0);
    const escuelas = new Set(courses.map(c => c.escuela).filter(Boolean)).size;
    const ciclos = new Set(courses.map(c => c.ciclo_referencial).filter(Boolean)).size;
    return { total, creditos, escuelas, ciclos };
  }, [courses]);

  const escuelas = useMemo(() => {
    const list = new Set(courses.map(c => c.escuela).filter(Boolean));
    return Array.from(list).sort();
  }, [courses]);

  const ciclosDisponibles = useMemo(() => {
    const set = new Set(courses.map(c => c.ciclo_referencial).filter(Boolean));
    return CICLOS_ORDEN.filter(c => set.has(c));
  }, [courses]);

  const filteredCourses = useMemo(() => {
    return courses.filter(course => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = !term ||
        course.nombre_curso.toLowerCase().includes(term) ||
        course.codigo_curso.toLowerCase().includes(term);
      const matchesEscuela = filterEscuela === 'all' || course.escuela === filterEscuela;
      const matchesCiclo = filterCiclo === 'all' || course.ciclo_referencial === filterCiclo;
      return matchesSearch && matchesEscuela && matchesCiclo;
    });
  }, [courses, searchTerm, filterEscuela, filterCiclo]);

  const paginatedCourses = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredCourses.slice(start, start + itemsPerPage);
  }, [filteredCourses, currentPage, itemsPerPage]);

  const totalPages = Math.max(1, Math.ceil(filteredCourses.length / itemsPerPage));

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await courseAPI.createCourse(formData);
      setIsModalOpen(false);
      resetForm();
      await refreshData();
    } catch (error) {
      alert('Error al crear curso: ' + error.message);
    }
  };

  const handleEdit = (course) => {
    setEditingCourse(course);
    setFormData({
      codigo_curso: course.codigo_curso,
      nombre_curso: course.nombre_curso,
      ciclo_referencial: course.ciclo_referencial || '',
      creditos: course.creditos,
      escuela: course.escuela,
      estado: course.estado
    });
    setIsModalOpen(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await courseAPI.updateCourse(editingCourse.id_curso, formData);
      setIsModalOpen(false);
      resetForm();
      setEditingCourse(null);
      await refreshData();
    } catch (error) {
      alert('Error al actualizar curso: ' + error.message);
    }
  };

  const handleDelete = async (id_curso) => {
    if (!confirm('¿Estás seguro de eliminar este curso? Esta acción no se puede deshacer.')) return;
    try {
      await courseAPI.deleteCourse(id_curso);
      await refreshData();
    } catch (error) {
      alert('Error al eliminar curso: ' + error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      codigo_curso: '',
      nombre_curso: '',
      ciclo_referencial: '',
      creditos: 3,
      escuela: 'Ingeniería de Sistemas',
      estado: true
    });
  };

  const openCreateModal = () => {
    resetForm();
    setEditingCourse(null);
    setIsModalOpen(true);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterEscuela('all');
    setFilterCiclo('all');
  };

  const hasActiveFilters = searchTerm || filterEscuela !== 'all' || filterCiclo !== 'all';

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
        <div>
          <p className="text-xl font-bold text-slate-900 dark:text-white">{value}</p>
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</p>
        </div>
      </div>
    );
  };

  const CourseCard = ({ course }) => (
    <div className="bg-white dark:bg-[#131A2C] border border-slate-200 dark:border-slate-800 rounded-xl p-5 hover:shadow-card-hover hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 group flex flex-col">
      <div className="flex items-start justify-between mb-3">
        <span className="font-mono text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-655 dark:text-slate-400 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">
          {course.codigo_curso}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleEdit(course)}
            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-colors"
            title="Editar"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleDelete(course.id_curso)}
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
            title="Eliminar"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug mb-1 line-clamp-2 min-h-[2.5rem]">
        {course.nombre_curso}
      </h3>
      <p className="text-xs text-slate-505 dark:text-slate-400 mb-4">{course.escuela}</p>
      <div className="mt-auto flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 px-2 py-1 rounded-md border border-blue-100 dark:border-blue-900/30">
          {course.ciclo_referencial || 'Sin ciclo'} ciclo
        </span>
        <span className="text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded-md border border-emerald-100 dark:border-emerald-900/30">
          {course.creditos} créd.
        </span>
        <span className={`text-[10px] font-semibold px-2 py-1 rounded-md border ${
          course.estado
            ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
        }`}>
          {course.estado ? 'Activo' : 'Inactivo'}
        </span>
      </div>
    </div>
  );

  const EmptyState = () => (
    <div className="bg-white dark:bg-[#131A2C] border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center transition-colors duration-200">
      <div className="w-14 h-14 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-4 border border-slate-100 dark:border-slate-700">
        <AlertCircle className="w-6 h-6 text-slate-400 dark:text-slate-500" />
      </div>
      <h3 className="text-base font-bold text-slate-800 dark:text-white mb-1">
        {hasActiveFilters ? 'Sin resultados para los filtros aplicados' : 'No hay cursos registrados'}
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 max-w-sm mx-auto">
        {hasActiveFilters
          ? 'Prueba ajustando los filtros de búsqueda.'
          : 'Comienza agregando el primer curso.'}
      </p>
      {hasActiveFilters ? (
        <button onClick={clearFilters} className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
          Limpiar filtros
        </button>
      ) : (
        <Button onClick={openCreateModal} className="bg-blue-600 hover:bg-blue-700 text-white text-sm">
          <Plus className="w-4 h-4 mr-1.5" /> Agregar curso
        </Button>
      )}
    </div>
  );

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
            <BookMarked className="w-7 h-7 text-blue-600" />
            Catálogo Académico
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gestión de asignaturas y plan de estudios.
          </p>
        </div>
        <Button
          onClick={openCreateModal}
          className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" /> Nuevo Curso
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={GraduationCap} value={stats.total} label="Cursos" tone="blue" />
        <StatCard icon={Award} value={stats.creditos} label="Créditos totales" tone="emerald" />
        <StatCard icon={Building2} value={stats.escuelas} label="Escuelas" tone="violet" />
        <StatCard icon={Layers} value={stats.ciclos} label="Ciclos" tone="amber" />
      </div>

      {/* Toolbar */}
      <div className="bg-white dark:bg-[#131A2C] border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-card transition-colors duration-200">
        <div className="flex flex-col lg:flex-row gap-3 justify-between">
          {/* Search */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por código o nombre de curso..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm font-medium text-slate-800 dark:text-slate-105 placeholder:text-slate-405 dark:placeholder:text-slate-500"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <select
                value={filterEscuela}
                onChange={(e) => setFilterEscuela(e.target.value)}
                className="pl-8 pr-7 py-2.5 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm font-medium text-slate-705 dark:text-slate-300 appearance-none min-w-[180px]"
              >
                <option value="all">Todas las escuelas</option>
                {escuelas.map(esc => (
                  <option key={esc} value={esc}>{esc}</option>
                ))}
              </select>
            </div>
            <div className="relative">
              <Layers className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <select
                value={filterCiclo}
                onChange={(e) => setFilterCiclo(e.target.value)}
                className="pl-8 pr-7 py-2.5 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm font-medium text-slate-705 dark:text-slate-300 appearance-none min-w-[150px]"
              >
                <option value="all">Todos los ciclos</option>
                {ciclosDisponibles.map(c => (
                  <option key={c} value={c}>{c} Ciclo</option>
                ))}
              </select>
            </div>

            {/* View toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                title="Vista de tarjetas"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                title="Vista de lista"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Active filters */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex-wrap">
            <span className="text-xs font-medium text-slate-505 dark:text-slate-400">Filtros activos:</span>
            {searchTerm && (
              <span className="inline-flex items-center gap-1 text-xs font-medium bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 px-2 py-1 rounded-md border border-blue-100 dark:border-blue-900/30">
                Buscar: "{searchTerm}" <button onClick={() => setSearchTerm('')}><X className="w-3 h-3" /></button>
              </span>
            )}
            {filterEscuela !== 'all' && (
              <span className="inline-flex items-center gap-1 text-xs font-medium bg-violet-50 dark:bg-violet-950/20 text-violet-707 dark:text-violet-400 px-2 py-1 rounded-md border border-violet-100 dark:border-violet-900/30">
                {filterEscuela} <button onClick={() => setFilterEscuela('all')}><X className="w-3 h-3" /></button>
              </span>
            )}
            {filterCiclo !== 'all' && (
              <span className="inline-flex items-center gap-1 text-xs font-medium bg-amber-50 dark:bg-amber-950/20 text-amber-707 dark:text-amber-400 px-2 py-1 rounded-md border border-amber-100 dark:border-amber-900/30">
                {filterCiclo} Ciclo <button onClick={() => setFilterCiclo('all')}><X className="w-3 h-3" /></button>
              </span>
            )}
            <button onClick={clearFilters} className="text-xs font-semibold text-slate-505 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 ml-auto">
              Limpiar todo
            </button>
          </div>
        )}
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-505 dark:text-slate-400">
          Mostrando <span className="font-bold text-slate-900 dark:text-white">{paginatedCourses.length}</span> de{' '}
          <span className="font-bold text-slate-900 dark:text-white">{filteredCourses.length}</span> cursos
        </p>
      </div>

      {/* Content */}
      {filteredCourses.length === 0 ? (
        <EmptyState />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {paginatedCourses.map(course => (
            <CourseCard key={course.id_curso} course={course} />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-[#131A2C] border border-slate-200 dark:border-slate-800 rounded-xl shadow-card overflow-hidden transition-colors duration-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800">
                  <th className="px-5 py-3.5 text-[11px] font-bold text-slate-505 dark:text-slate-400 uppercase tracking-wider">Código</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold text-slate-505 dark:text-slate-400 uppercase tracking-wider">Asignatura</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold text-slate-505 dark:text-slate-400 uppercase tracking-wider">Ciclo</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold text-slate-505 dark:text-slate-400 uppercase tracking-wider">Créd.</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold text-slate-505 dark:text-slate-400 uppercase tracking-wider">Escuela</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold text-slate-505 dark:text-slate-400 uppercase tracking-wider">Estado</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold text-slate-505 dark:text-slate-400 uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedCourses.map(course => (
                  <tr key={course.id_curso} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-655 dark:text-slate-400 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">
                        {course.codigo_curso}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-semibold text-slate-808 dark:text-slate-200">{course.nombre_curso}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-medium text-slate-605 dark:text-slate-400">{course.ciclo_referencial || '-'}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-medium text-slate-605 dark:text-slate-400">{course.creditos}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs text-slate-605 dark:text-slate-400">{course.escuela}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex text-[10px] font-bold px-2 py-1 rounded-md border ${
                        course.estado
                          ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-505 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                      }`}>
                        {course.estado ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right space-x-1">
                      <button
                        onClick={() => handleEdit(course)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(course.id_curso)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-605 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
                    : 'border border-slate-200 dark:border-slate-800 text-slate-605 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-605 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingCourse ? 'Editar Curso' : 'Registrar Nuevo Curso'}>
        <form onSubmit={editingCourse ? handleUpdate : handleCreate} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-705 dark:text-slate-300 mb-1.5">Código del Curso</label>
            <input
              type="text"
              value={formData.codigo_curso}
              onChange={(e) => setFormData({...formData, codigo_curso: e.target.value.toUpperCase()})}
              className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
              required
              disabled={editingCourse}
              placeholder="Ej. EE-101"
            />
            {editingCourse && <p className="text-xs text-slate-505 dark:text-slate-400 mt-1">El código no se puede modificar una vez creado.</p>}
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-705 dark:text-slate-300 mb-1.5">Nombre de la Asignatura</label>
            <input
              type="text"
              value={formData.nombre_curso}
              onChange={(e) => setFormData({...formData, nombre_curso: e.target.value})}
              className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
              required
              placeholder="Nombre completo del curso"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-705 dark:text-slate-300 mb-1.5">Ciclo Referencial</label>
              <select
                value={formData.ciclo_referencial}
                onChange={(e) => setFormData({...formData, ciclo_referencial: e.target.value})}
                className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white appearance-none"
              >
                <option value="">Seleccionar...</option>
                {CICLOS_ORDEN.map(c => (
                  <option key={c} value={c}>{c} Ciclo</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-705 dark:text-slate-300 mb-1.5">Créditos</label>
              <input
                type="number"
                min="1"
                max="10"
                value={formData.creditos}
                onChange={(e) => setFormData({...formData, creditos: parseInt(e.target.value)})}
                className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-705 dark:text-slate-300 mb-1.5">Escuela / Facultad</label>
            <input
              type="text"
              value={formData.escuela}
              onChange={(e) => setFormData({...formData, escuela: e.target.value})}
              className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
              required
              placeholder="Ej. Ingeniería de Sistemas"
            />
          </div>
          <div className="flex items-center gap-3 pt-1">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={formData.estado}
                onChange={(e) => setFormData({...formData, estado: e.target.checked})}
              />
              <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-655"></div>
              <span className="ml-3 text-sm font-medium text-slate-705 dark:text-slate-300">Curso Activo</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-5 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="text-sm">
              Cancelar
            </Button>
            <Button type="submit" className="bg-blue-600 text-white hover:bg-blue-700 text-sm px-5">
              {editingCourse ? 'Guardar Cambios' : 'Registrar Curso'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CourseManagementPage;
