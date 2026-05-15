import React, { useState, useEffect } from 'react';
import { useServiceDesk } from '../../contexts/ServiceDeskContext';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import { Ticket, AlertTriangle, Clock, CheckCircle2, RefreshCw, MessageSquare, ArrowRight, User } from 'lucide-react';

const ServiceDeskPage = () => {
  const { requests, incidents, loading, refreshData } = useServiceDesk();
  const [activeTab, setActiveTab] = useState('requests');
  const [selectedItem, setSelectedItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    refreshData();
  }, []);

  const filteredRequests = requests.filter(req => {
    if (statusFilter === 'all') return true;
    return req.estado === statusFilter;
  });

  const filteredIncidents = incidents.filter(inc => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'RESUELTA' || statusFilter === 'CERRADA') return inc.resuelto;
    return !inc.resuelto;
  });

  const handleUpdateStatus = async (item, newStatus) => {
    try {
      if (item.categoria) {
        await fetch(`/api/services/requests/${item.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ estado: newStatus })
        });
      } else {
        await fetch(`/api/services/incidents/${item.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resuelto: newStatus === 'RESUELTA' || newStatus === 'CERRADA' })
        });
      }
      refreshData();
    } catch (error) {
      alert('Error al actualizar estado: ' + error.message);
    }
  };

  const openDetailModal = (item) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ABIERTA': return <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-xs font-bold inline-flex items-center gap-1"><Ticket className="w-3.5 h-3.5"/> Abierta</span>;
      case 'EN_PROCESO': return <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-xs font-bold inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5"/> En Proceso</span>;
      case 'RESUELTA': return <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-xs font-bold inline-flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5"/> Resuelta</span>;
      case 'CERRADA': return <span className="px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-md text-xs font-bold inline-flex items-center gap-1">Cerrada</span>;
      default: return <span className="px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-md text-xs font-bold">{status}</span>;
    }
  };

  const getSeverityBadge = (severity) => {
    switch(severity) {
      case 'ALTA': return <span className="px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 rounded-md text-xs font-bold inline-flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5"/> Alta Prioridad</span>;
      case 'MEDIA': return <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-xs font-bold">Media</span>;
      case 'BAJA': return <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-xs font-bold">Baja</span>;
      default: return null;
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Ticket className="w-6 h-6 text-indigo-600" /> Mesa de Servicio ITIL
          </h1>
          <p className="text-slate-500 mt-1">Gestión centralizada de solicitudes de estudiantes e incidentes académicos.</p>
        </div>
        <Button onClick={refreshData} variant="outline" className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Recargar
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-6 py-3 font-semibold text-sm transition-all border-b-2 -mb-px ${
            activeTab === 'requests' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          Solicitudes de Chat ({requests.length})
        </button>
        <button
          onClick={() => setActiveTab('incidents')}
          className={`px-6 py-3 font-semibold text-sm transition-all border-b-2 -mb-px flex items-center gap-2 ${
            activeTab === 'incidents' 
              ? 'border-red-600 text-red-600' 
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          Incidentes Académicos 
          {incidents.filter(i => !i.resuelto).length > 0 && (
            <span className="bg-red-100 text-red-700 py-0.5 px-2 rounded-full text-xs">{incidents.filter(i => !i.resuelto).length}</span>
          )}
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex mb-6">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-medium text-slate-700 min-w-[200px]"
        >
          <option value="all">Filtrar: Todos los estados</option>
          <option value="ABIERTA">Filtrar: Abiertas</option>
          <option value="EN_PROCESO">Filtrar: En proceso</option>
          <option value="RESUELTA">Filtrar: Resueltas</option>
          <option value="CERRADA">Filtrar: Cerradas</option>
        </select>
      </div>

      {/* Listado */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden min-h-[400px]">
        {activeTab === 'requests' && (
          <div className="divide-y divide-slate-100">
            {filteredRequests.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="font-medium">No hay solicitudes que coincidan con el filtro.</p>
              </div>
            ) : (
              filteredRequests.map((request) => (
                <div key={request.id} className="p-5 hover:bg-slate-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 group">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">REQ-{String(request.id).padStart(4, '0')}</span>
                      {getStatusBadge(request.estado)}
                      {request.escalada && (
                        <span className="px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 rounded-md text-xs font-bold inline-flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5"/> Escalada
                        </span>
                      )}
                    </div>
                    <p className="text-slate-900 font-medium mb-1 truncate">{request.descripcion || 'Sin descripción'}</p>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><User className="w-3.5 h-3.5"/> {request.usuario_nombre || 'N/A'}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5"/> {request.fecha_creacion ? new Date(request.fecha_creacion).toLocaleString() : 'N/A'}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0">
                    {request.estado === 'ABIERTA' && (
                      <button onClick={() => handleUpdateStatus(request, 'EN_PROCESO')} className="px-3 py-1.5 text-xs font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg transition-colors border border-amber-200">
                        Iniciar
                      </button>
                    )}
                    {request.estado === 'EN_PROCESO' && (
                      <button onClick={() => handleUpdateStatus(request, 'RESUELTA')} className="px-3 py-1.5 text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200">
                        Resolver
                      </button>
                    )}
                    <button onClick={() => openDetailModal(request)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Ver detalles">
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'incidents' && (
          <div className="divide-y divide-slate-100">
            {filteredIncidents.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <AlertTriangle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="font-medium">No hay incidentes activos.</p>
              </div>
            ) : (
              filteredIncidents.map((incident) => (
                <div key={incident.id} className="p-5 hover:bg-slate-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">INC-{String(incident.id).padStart(4, '0')}</span>
                      {getSeverityBadge(incident.severidad)}
                      {incident.resuelto && (
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-xs font-bold inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5"/> Resuelto
                        </span>
                      )}
                    </div>
                    <p className="text-slate-900 font-medium mb-1 truncate">{incident.recomendacion || 'Riesgo Académico Detectado'}</p>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><User className="w-3.5 h-3.5"/> {incident.usuario_nombre || 'N/A'}</span>
                      <span className="font-semibold text-slate-700 bg-slate-200 px-2 py-0.5 rounded">Promedio: {incident.promedio_actual}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0">
                    {!incident.resuelto && (
                      <button onClick={() => handleUpdateStatus(incident, 'RESUELTA')} className="px-3 py-1.5 text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200">
                        Marcar Resuelto
                      </button>
                    )}
                    <button onClick={() => openDetailModal(incident)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Ver detalles">
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Detalles del Ticket">
        {selectedItem && (
          <div className="space-y-6">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">ID TICKET</p>
                <p className="font-mono text-slate-800 font-bold">{selectedItem.id}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">FECHA</p>
                <p className="text-sm font-medium text-slate-700">{selectedItem.fecha_creacion ? new Date(selectedItem.fecha_creacion).toLocaleString() : 'N/A'}</p>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Usuario Afectado</p>
              <div className="flex items-center gap-3 bg-white border border-slate-200 p-3 rounded-xl">
                <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold">
                  {selectedItem.usuario_nombre?.charAt(0) || 'U'}
                </div>
                <div>
                  <p className="font-bold text-slate-800">{selectedItem.usuario_nombre || 'Desconocido'}</p>
                  <p className="text-sm text-slate-500 font-mono">{selectedItem.codigo_universitario || 'N/A'}</p>
                </div>
              </div>
            </div>

            {selectedItem.descripcion && (
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Descripción de la Solicitud</p>
                <p className="text-slate-700 bg-white border border-slate-200 p-4 rounded-xl leading-relaxed">
                  {selectedItem.descripcion}
                </p>
              </div>
            )}

            {selectedItem.respuesta_generada && (
              <div>
                <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2 flex items-center gap-1"><Ticket className="w-3.5 h-3.5"/> Respuesta Generada por Sylia</p>
                <p className="text-indigo-900 bg-indigo-50 border border-indigo-100 p-4 rounded-xl leading-relaxed">
                  {selectedItem.respuesta_generada}
                </p>
              </div>
            )}

            {selectedItem.recomendacion && (
              <div>
                <p className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-2 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5"/> Alerta y Recomendación</p>
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
                  <p className="text-amber-900 font-bold mb-2">Riesgo Académico</p>
                  <p className="text-amber-800 leading-relaxed mb-3">{selectedItem.recomendacion}</p>
                  <div className="flex gap-4 text-sm font-semibold">
                    <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded">Promedio Actual: {selectedItem.promedio_actual}</span>
                    <span className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded">Nota Requerida: {selectedItem.nota_necesaria}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <Button onClick={() => setIsModalOpen(false)}>Cerrar Panel</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ServiceDeskPage;
