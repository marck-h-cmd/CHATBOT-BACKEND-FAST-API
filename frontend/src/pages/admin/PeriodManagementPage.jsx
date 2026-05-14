import React, { useState } from 'react';
import { useCourse } from '../../contexts/CourseContext';
import * as periodAPI from '../../api/periods';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';

const PeriodManagementPage = () => {
  const { periods, loading, refreshData } = useCourse();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState(null);
  const [formData, setFormData] = useState({
    anio: new Date().getFullYear(),
    termino: '',
    nombre: '',
    es_actual: false,
    fecha_inicio: '',
    fecha_fin: ''
  });

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

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Gestión de Periodos Académicos</h1>
        <Button onClick={openCreateModal}>+ Crear Periodo</Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Año</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Término</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha Inicio</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha Fin</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {periods.map((period) => (
                <tr key={period.id_periodo} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{period.nombre}</td>
                  <td className="px-4 py-3 text-sm">{period.anio}</td>
                  <td className="px-4 py-3 text-sm">{period.termino}</td>
                  <td className="px-4 py-3 text-sm">{new Date(period.fecha_inicio).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-sm">{new Date(period.fecha_fin).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-sm">
                    {period.es_actual ? (
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                        Actual
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">
                        Inactivo
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm space-x-2">
                    {!period.es_actual && (
                      <Button size="sm" variant="outline" onClick={() => handleSetCurrent(period.id_periodo)}>
                        Establecer Actual
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => handleEdit(period)}>
                      Editar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingPeriod ? 'Editar Periodo' : 'Crear Periodo'}>
        <form onSubmit={editingPeriod ? handleUpdate : handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({...formData, nombre: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="2024-I, 2024-II, etc."
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
              <input
                type="number"
                value={formData.anio}
                onChange={(e) => setFormData({...formData, anio: parseInt(e.target.value)})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Término</label>
              <input
                type="text"
                value={formData.termino}
                onChange={(e) => setFormData({...formData, termino: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="I, II, Verano, etc."
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicio</label>
              <input
                type="date"
                value={formData.fecha_inicio}
                onChange={(e) => setFormData({...formData, fecha_inicio: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Fin</label>
              <input
                type="date"
                value={formData.fecha_fin}
                onChange={(e) => setFormData({...formData, fecha_fin: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                required
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.es_actual}
              onChange={(e) => setFormData({...formData, es_actual: e.target.checked})}
              className="rounded"
            />
            <label className="text-sm text-gray-700">Establecer como periodo actual</label>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {editingPeriod ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PeriodManagementPage;
