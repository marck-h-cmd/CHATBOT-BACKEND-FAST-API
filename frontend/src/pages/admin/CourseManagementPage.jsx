import React, { useState, useMemo } from 'react';
import { useCourse } from '../../contexts/CourseContext';
import * as courseAPI from '../../api/courses';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import Pagination from '../../components/ui/Pagination';
import { Search, Plus, Edit2, Trash2, BookMarked, Filter } from 'lucide-react';

const CourseManagementPage = () => {
  const { courses, loading, refreshData } = useCourse();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEscuela, setFilterEscuela] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const [formData, setFormData] = useState({
    codigo_curso: '',
    nombre_curso: '',
    ciclo_referencial: '',
    creditos: 3,
    escuela: 'Ingeniería de Sistemas',
    estado: true
  });

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await courseAPI.createCourse(formData);
      setIsModalOpen(false);
      resetForm();
      refreshData();
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
      refreshData();
    } catch (error) {
      alert('Error al actualizar curso: ' + error.message);
    }
  };

  const handleDelete = async (id_curso) => {
    if (!confirm('¿Estás seguro de eliminar este curso? Esta acción no se puede deshacer.')) return;
    try {
      await courseAPI.deleteCourse(id_curso);
      refreshData();
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

  const filteredCourses = useMemo(() => {
    return courses.filter(course => {
      const matchesSearch = course.nombre_curso.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            course.codigo_curso.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesEscuela = filterEscuela === 'all' || course.escuela === filterEscuela;
      return matchesSearch && matchesEscuela;
    });
  }, [courses, searchTerm, filterEscuela]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterEscuela]);

  const paginatedCourses = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredCourses.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCourses, currentPage]);

  const escuelas = useMemo(() => {
    const list = new Set(courses.map(c => c.escuela).filter(Boolean));
    return Array.from(list);
  }, [courses]);

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BookMarked className="w-6 h-6 text-indigo-600" /> Catálogo Académico
          </h1>
          <p className="text-slate-500 mt-1">Gestiona los cursos, créditos y escuelas del sistema.</p>
        </div>
        <Button onClick={openCreateModal} className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 px-4">
          <Plus className="w-4 h-4" /> Nuevo Curso
        </Button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4 justify-between bg-slate-50/50">
          <div className="relative w-full md:w-96">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar por código o nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors text-sm"
            />
          </div>
          <div className="relative w-full md:w-64 shrink-0">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter className="h-4 w-4 text-slate-400" />
            </div>
            <select
              value={filterEscuela}
              onChange={(e) => setFilterEscuela(e.target.value)}
              className="w-full pl-9 pr-8 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors text-sm appearance-none font-medium text-slate-700"
            >
              <option value="all">Todas las escuelas</option>
              {escuelas.map(esc => (
                <option key={esc} value={esc}>{esc}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider font-semibold text-slate-500">
                <th className="px-6 py-4 whitespace-nowrap">Código</th>
                <th className="px-6 py-4">Asignatura</th>
                <th className="px-6 py-4 whitespace-nowrap">Ciclo</th>
                <th className="px-6 py-4 whitespace-nowrap">Créditos</th>
                <th className="px-6 py-4">Escuela</th>
                <th className="px-6 py-4 whitespace-nowrap">Estado</th>
                <th className="px-6 py-4 text-right whitespace-nowrap">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCourses.length > 0 ? (
                paginatedCourses.map((course) => (
                  <tr key={course.id_curso} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs font-semibold bg-slate-100 text-slate-700 px-2 py-1 rounded border border-slate-200">
                        {course.codigo_curso}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-800 text-sm">{course.nombre_curso}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-slate-600">{course.ciclo_referencial || '-'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-slate-600">{course.creditos}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600">{course.escuela}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${
                        course.estado 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {course.estado ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                      <button 
                        onClick={() => handleEdit(course)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(course.id_curso)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-slate-500">
                    No se encontraron cursos que coincidan con la búsqueda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {filteredCourses.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalItems={filteredCourses.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingCourse ? 'Editar Curso' : 'Registrar Nuevo Curso'}>
        <form onSubmit={editingCourse ? handleUpdate : handleCreate} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Código del Curso</label>
            <input
              type="text"
              value={formData.codigo_curso}
              onChange={(e) => setFormData({...formData, codigo_curso: e.target.value.toUpperCase()})}
              className="w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono text-sm"
              required
              disabled={editingCourse}
            />
            {editingCourse && <p className="text-xs text-slate-500 mt-1">El código no se puede modificar una vez creado.</p>}
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nombre de la Asignatura</label>
            <input
              type="text"
              value={formData.nombre_curso}
              onChange={(e) => setFormData({...formData, nombre_curso: e.target.value})}
              className="w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Ciclo Referencial</label>
              <input
                type="text"
                value={formData.ciclo_referencial}
                onChange={(e) => setFormData({...formData, ciclo_referencial: e.target.value})}
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
                placeholder="Ej. I, II, III"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Créditos</label>
              <input
                type="number"
                min="1"
                max="10"
                value={formData.creditos}
                onChange={(e) => setFormData({...formData, creditos: parseInt(e.target.value)})}
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Escuela / Facultad</label>
            <input
              type="text"
              value={formData.escuela}
              onChange={(e) => setFormData({...formData, escuela: e.target.value})}
              className="w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
              required
            />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={formData.estado}
                onChange={(e) => setFormData({...formData, estado: e.target.checked})}
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              <span className="ml-3 text-sm font-medium text-slate-700">Curso Activo</span>
            </label>
          </div>
          
          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 mt-6">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-indigo-600 text-white hover:bg-indigo-700">
              {editingCourse ? 'Guardar Cambios' : 'Registrar Curso'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CourseManagementPage;
