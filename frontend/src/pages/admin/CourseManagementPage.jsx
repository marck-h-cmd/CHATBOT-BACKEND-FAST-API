import React, { useState } from 'react';
import { useCourse } from '../../contexts/CourseContext';
import * as courseAPI from '../../api/courses';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';

const CourseManagementPage = () => {
  const { courses, loading, refreshData } = useCourse();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
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
    if (!confirm('¿Estás seguro de eliminar este curso?')) return;
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

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Gestión de Cursos</h1>
        <Button onClick={openCreateModal}>+ Crear Curso</Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ciclo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Créditos</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Escuela</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {courses.map((course) => (
                <tr key={course.id_curso} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono">{course.codigo_curso}</td>
                  <td className="px-4 py-3 text-sm">{course.nombre_curso}</td>
                  <td className="px-4 py-3 text-sm">{course.ciclo_referencial || '-'}</td>
                  <td className="px-4 py-3 text-sm">{course.creditos}</td>
                  <td className="px-4 py-3 text-sm">{course.escuela}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      course.estado ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {course.estado ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm space-x-2">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(course)}>
                      Editar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDelete(course.id_curso)}>
                      Eliminar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingCourse ? 'Editar Curso' : 'Crear Curso'}>
        <form onSubmit={editingCourse ? handleUpdate : handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
            <input
              type="text"
              value={formData.codigo_curso}
              onChange={(e) => setFormData({...formData, codigo_curso: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              required
              disabled={editingCourse}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <input
              type="text"
              value={formData.nombre_curso}
              onChange={(e) => setFormData({...formData, nombre_curso: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ciclo</label>
            <input
              type="text"
              value={formData.ciclo_referencial}
              onChange={(e) => setFormData({...formData, ciclo_referencial: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="I, II, III, etc."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Créditos</label>
            <input
              type="number"
              value={formData.creditos}
              onChange={(e) => setFormData({...formData, creditos: parseInt(e.target.value)})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Escuela</label>
            <input
              type="text"
              value={formData.escuela}
              onChange={(e) => setFormData({...formData, escuela: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              required
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.estado}
              onChange={(e) => setFormData({...formData, estado: e.target.checked})}
              className="rounded"
            />
            <label className="text-sm text-gray-700">Activo</label>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {editingCourse ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CourseManagementPage;
