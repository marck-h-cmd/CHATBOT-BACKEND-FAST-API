import React, { useState } from 'react';
import { useCourse } from '../../contexts/CourseContext';
import * as periodAPI from '../../api/periods';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import { CalendarDays, Plus, Edit2, CheckCircle2, PlayCircle } from 'lucide-react';

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
    if(!confirm("¿Deseas activar este periodo? Todos los demás periodos pasarán a inactivos.")) return;
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
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-indigo-600" /> Gestión de Periodos
          </h1>
          <p className="text-slate-500 mt-1">Administra los ciclos académicos y controla el periodo activo vigente.</p>
        </div>
        <Button onClick={openCreateModal} className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 px-4">
          <Plus className="w-4 h-4" /> Nuevo Periodo
        </Button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider font-semibold text-slate-500">
                <th className="px-6 py-4 whitespace-nowrap">Periodo Académico</th>
                <th className="px-6 py-4 whitespace-nowrap">Año</th>
                <th className="px-6 py-4 whitespace-nowrap">Término</th>
                <th className="px-6 py-4 whitespace-nowrap">Vigencia</th>
                <th className="px-6 py-4 whitespace-nowrap">Estado del Sistema</th>
                <th className="px-6 py-4 text-right whitespace-nowrap">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {periods.map((period) => (
                <tr key={period.id_periodo} className={`hover:bg-slate-50/80 transition-colors ${period.es_actual ? 'bg-indigo-50/30' : ''}`}>
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-800 text-sm">{period.nombre}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-slate-600">{period.anio}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-slate-600">{period.termino}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-slate-500 block">Del: {new Date(period.fecha_inicio).toLocaleDateString()}</span>
                    <span className="text-xs text-slate-500 block">Al: {new Date(period.fecha_fin).toLocaleDateString()}</span>
                  </td>
                  <td className="px-6 py-4">
                    {period.es_actual ? (
                      <span className="px-2.5 py-1 inline-flex items-center gap-1.5 text-xs leading-5 font-semibold rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" /> En Curso
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border bg-slate-50 text-slate-600 border-slate-200">
                        Cerrado
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                    {!period.es_actual && (
                      <button 
                        onClick={() => handleSetCurrent(period.id_periodo)}
                        className="px-3 py-1.5 text-xs font-medium bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors inline-flex items-center gap-1.5"
                      >
                        <PlayCircle className="w-3.5 h-3.5" /> Activar
                      </button>
                    )}
                    <button 
                      onClick={() => handleEdit(period)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors inline-flex align-middle"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingPeriod ? 'Editar Periodo' : 'Aperturar Nuevo Periodo'}>
        <form onSubmit={editingPeriod ? handleUpdate : handleCreate} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nombre Oficial del Periodo</label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({...formData, nombre: e.target.value})}
              className="w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-medium"
              placeholder="Ej. Semestre 2024-I"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Año</label>
              <input
                type="number"
                min="2020"
                max="2050"
                value={formData.anio}
                onChange={(e) => setFormData({...formData, anio: parseInt(e.target.value)})}
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Término (Ciclo)</label>
              <input
                type="text"
                value={formData.termino}
                onChange={(e) => setFormData({...formData, termino: e.target.value})}
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
                placeholder="Ej. I, II, 0"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Fecha de Inicio</label>
              <input
                type="date"
                value={formData.fecha_inicio}
                onChange={(e) => setFormData({...formData, fecha_inicio: e.target.value})}
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm text-slate-700"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Fecha de Fin</label>
              <input
                type="date"
                value={formData.fecha_fin}
                onChange={(e) => setFormData({...formData, fecha_fin: e.target.value})}
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm text-slate-700"
                required
              />
            </div>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={formData.es_actual}
                onChange={(e) => setFormData({...formData, es_actual: e.target.checked})}
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              <span className="ml-3 text-sm font-medium text-slate-700">Forzar como Periodo Actual de Inmediato</span>
            </label>
          </div>
          
          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 mt-6">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-indigo-600 text-white hover:bg-indigo-700">
              {editingPeriod ? 'Guardar Cambios' : 'Aperturar Periodo'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PeriodManagementPage;
