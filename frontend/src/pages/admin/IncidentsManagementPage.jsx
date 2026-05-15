import React, { useState, useEffect } from 'react';
import * as servicesAPI from '../../api/service-desk';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { AlertTriangle, Filter, CheckCircle2 } from 'lucide-react';

const IncidentsManagementPage = () => {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadIncidents();
  }, []);

  const loadIncidents = async () => {
    setLoading(true);
    try {
      const data = await servicesAPI.getIncidents?.();
      setIncidents(data || []);
    } catch (error) {
      console.error('Error al cargar incidentes:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner fullScreen />;

  const filteredIncidents = filter === 'all' 
    ? incidents 
    : incidents.filter(i => {
        if(filter === 'abierto') return !i.resuelto;
        if(filter === 'resuelto') return i.resuelto;
        return true;
      });

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-red-600" /> Prevención de Riesgo Académico
        </h1>
        <p className="text-slate-500 mt-1">Monitoreo de incidentes detectados automáticamente por el sistema de evaluación.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-wrap gap-2 items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-semibold text-slate-600 mr-2">Filtros:</span>
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${filter === 'all' ? 'bg-indigo-100 text-indigo-700' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              Todos ({incidents.length})
            </button>
            <button
              onClick={() => setFilter('abierto')}
              className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${filter === 'abierto' ? 'bg-red-100 text-red-700' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              Abiertos
            </button>
            <button
              onClick={() => setFilter('resuelto')}
              className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${filter === 'resuelto' ? 'bg-emerald-100 text-emerald-700' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              Resueltos
            </button>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider font-semibold text-slate-500">
                <th className="px-6 py-4 whitespace-nowrap">ID Incidente</th>
                <th className="px-6 py-4 whitespace-nowrap">Estudiante Afectado</th>
                <th className="px-6 py-4 whitespace-nowrap">Nivel de Riesgo</th>
                <th className="px-6 py-4 whitespace-nowrap">Estado</th>
                <th className="px-6 py-4 whitespace-nowrap">Fecha de Detección</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredIncidents.length > 0 ? (
                filteredIncidents.map(incident => (
                  <tr key={incident.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs font-semibold bg-slate-100 text-slate-700 px-2 py-1 rounded border border-slate-200">
                        INC-{String(incident.id).padStart(4, '0')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800">{incident.usuario}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-bold rounded-md border ${
                        incident.severidad === 'ALTA' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {incident.severidad === 'ALTA' ? 'Riesgo Crítico' : 'Riesgo Moderado'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {incident.resuelto ? (
                        <span className="px-2.5 py-1 inline-flex items-center gap-1 text-xs font-bold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5"/> Intervenido
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 inline-flex items-center gap-1 text-xs font-bold rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                          <AlertTriangle className="w-3.5 h-3.5"/> Pendiente
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-slate-600">
                        {new Date(incident.fecha_creacion).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                    <AlertTriangle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="font-medium">No hay incidentes para mostrar.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default IncidentsManagementPage;
