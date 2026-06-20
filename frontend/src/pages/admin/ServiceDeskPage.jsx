import React, { useState, useEffect } from 'react';
import { useServiceDesk } from '../../contexts/ServiceDeskContext';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import Pagination from '../../components/ui/Pagination';
import { Ticket, AlertTriangle, Clock, CheckCircle2, RefreshCw, MessageSquare, ArrowRight, User } from 'lucide-react';

const ServiceDeskPage = () => {
  const { requests, incidents, loading, refreshData } = useServiceDesk();
  const [activeTab, setActiveTab] = useState('requests');
  const [selectedItem, setSelectedItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    refreshData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, statusFilter]);

  const filteredRequests = requests.filter(req => {
    if (statusFilter === 'all') return true;
    return req.estado === statusFilter;
  });

  const filteredIncidents = incidents.filter(inc => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'RESUELTA' || statusFilter === 'CERRADA') return inc.resuelto;
    return !inc.resuelto;
  });

  const paginatedRequests = filteredRequests.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const paginatedIncidents = filteredIncidents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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
      await refreshData();
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
      case 'ABIERTA': return <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/80 rounded-md text-xs font-bold inline-flex items-center gap-1"><Ticket className="w-3.5 h-3.5"/> Abierta</span>;
      case 'EN_PROCESO': return <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/80 rounded-md text-xs font-bold inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5"/> En Proceso</span>;
      case 'RESUELTA': return <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80 rounded-md text-xs font-bold inline-flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5"/> Resuelta</span>;
      case 'CERRADA': return <span className="px-2.5 py-1 bg-slate-105 dark:bg-slate-800 text-slate-700 dark:text-slate-350 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-bold inline-flex items-center gap-1">Cerrada</span>;
      default: return <span className="px-2.5 py-1 bg-slate-105 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-205 dark:border-slate-700 rounded-md text-xs font-bold">{status}</span>;
    }
  };

  const getSeverityBadge = (severity) => {
    switch(severity) {
      case 'ALTA': return <span className="px-2.5 py-1 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/80 rounded-md text-xs font-bold inline-flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5"/> Alta Prioridad</span>;
      case 'MEDIA': return <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/80 rounded-md text-xs font-bold">Media</span>;
      case 'BAJA': return <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80 rounded-md text-xs font-bold">Baja</span>;
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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Ticket className="w-6 h-6 text-indigo-600 dark:text-indigo-400" /> Mesa de Servicio ITIL
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Gestión de tickets de solicitudes e incidentes.</p>
        </div>
        <Button onClick={refreshData} variant="outline" className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-805 text-slate-705 dark:text-slate-300">
          <RefreshCw className="w-4 h-4" /> Recargar
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-6 py-3 font-semibold text-sm transition-all border-b-2 -mb-px ${
            activeTab === 'requests' 
              ? 'border-indigo-650 text-indigo-650 dark:border-indigo-400 dark:text-indigo-400' 
              : 'border-transparent text-slate-500 dark:text-slate-405 hover:text-slate-705 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          Solicitudes de Chat ({requests.length})
        </button>
        <button
          onClick={() => setActiveTab('incidents')}
          className={`px-6 py-3 font-semibold text-sm transition-all border-b-2 -mb-px flex items-center gap-2 ${
            activeTab === 'incidents' 
              ? 'border-red-600 text-red-605 dark:border-red-400 dark:text-red-400' 
              : 'border-transparent text-slate-500 dark:text-slate-405 hover:text-slate-705 dark:hover:text-slate-205 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          Incidentes Académicos 
          {incidents.filter(i => !i.resuelto).length > 0 && (
            <span className="bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 py-0.5 px-2 rounded-full text-xs">{incidents.filter(i => !i.resuelto).length}</span>
          )}
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex mb-6">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-medium text-slate-700 dark:text-slate-300 min-w-[200px]"
        >
          <option value="all">Filtrar: Todos los estados</option>
          <option value="ABIERTA">Filtrar: Abiertas</option>
          <option value="EN_PROCESO">Filtrar: En proceso</option>
          <option value="RESUELTA">Filtrar: Resueltas</option>
          <option value="CERRADA">Filtrar: Cerradas</option>
        </select>
      </div>      {/* Listado */}
      <div className="bg-white dark:bg-[#131A2C] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-card overflow-hidden min-h-[400px]">
        {activeTab === 'requests' && (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {filteredRequests.length === 0 ? (
              <div className="p-12 text-center text-slate-500 dark:text-slate-400">
                <MessageSquare className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                <p className="font-medium">No hay solicitudes que coincidan con el filtro.</p>
              </div>
            ) : (
              paginatedRequests.map((request) => (
                <div key={request.id} className="p-5 hover:bg-slate-50 dark:hover:bg-slate-900/65 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 group">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded border border-slate-150 dark:border-slate-800">REQ-{String(request.id).padStart(4, '0')}</span>
                      {getStatusBadge(request.estado)}
                      {request.escalada && (
                        <span className="px-2.5 py-1 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/40 rounded-md text-xs font-bold inline-flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5"/> Escalada
                        </span>
                      )}
                    </div>
                    <p className="text-slate-900 dark:text-white font-medium mb-1 truncate">{request.descripcion || 'Sin descripción'}</p>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-405">
                      <span className="flex items-center gap-1"><User className="w-3.5 h-3.5"/> {request.usuario_nombre || 'N/A'}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5"/> {request.fecha_creacion ? new Date(request.fecha_creacion).toLocaleString() : 'N/A'}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0">
                    {request.estado === 'ABIERTA' && (
                      <button onClick={() => handleUpdateStatus(request, 'EN_PROCESO')} className="px-3 py-1.5 text-xs font-bold bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 hover:bg-amber-105 dark:hover:bg-amber-900/40 rounded-lg transition-colors border border-amber-200 dark:border-amber-800/80">
                        Iniciar
                      </button>
                    )}
                    {request.estado === 'EN_PROCESO' && (
                      <button onClick={() => handleUpdateStatus(request, 'RESUELTA')} className="px-3 py-1.5 text-xs font-bold bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-105 dark:hover:bg-emerald-900/40 rounded-lg transition-colors border border-emerald-200 dark:border-emerald-800/80">
                        Resolver
                      </button>
                    )}
                    <button onClick={() => openDetailModal(request)} className="p-2 text-slate-405 dark:text-slate-500 hover:text-indigo-650 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 rounded-lg transition-colors" title="Ver detalles">
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'incidents' && (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {filteredIncidents.length === 0 ? (
              <div className="p-12 text-center text-slate-500 dark:text-slate-400">
                <AlertTriangle className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                <p className="font-medium">No hay incidentes activos.</p>
              </div>
            ) : (
              paginatedIncidents.map((incident) => (
                <div key={incident.id} className="p-5 hover:bg-slate-50 dark:hover:bg-slate-900/65 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-xs font-mono font-bold text-slate-505 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded border border-slate-150 dark:border-slate-800">INC-{String(incident.id).padStart(4, '0')}</span>
                      {getSeverityBadge(incident.severidad)}
                      {incident.resuelto && (
                        <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-405 border border-emerald-205 dark:border-emerald-800/65 rounded-md text-xs font-bold inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5"/> Resuelto
                        </span>
                      )}
                    </div>
                    <p className="text-slate-900 dark:text-white font-medium mb-1 truncate">{incident.recomendacion || 'Riesgo Académico Detectado'}</p>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-405">
                      <span className="flex items-center gap-1"><User className="w-3.5 h-3.5"/> {incident.usuario_nombre || 'N/A'}</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded">Promedio: {incident.promedio_actual}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0">
                    {!incident.resuelto && (
                      <button onClick={() => handleUpdateStatus(incident, 'RESUELTA')} className="px-3 py-1.5 text-xs font-bold bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-lg transition-colors border border-emerald-200 dark:border-emerald-800/80">
                        Marcar Resuelto
                      </button>
                    )}
                    <button onClick={() => openDetailModal(incident)} className="p-2 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 rounded-lg transition-colors" title="Ver detalles">
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
        {((activeTab === 'requests' && filteredRequests.length > 0) || (activeTab === 'incidents' && filteredIncidents.length > 0)) && (
          <Pagination
            currentPage={currentPage}
            totalItems={activeTab === 'requests' ? filteredRequests.length : filteredIncidents.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        )}
      </div>     <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Detalles del Ticket">
        {selectedItem && (
          <div className="space-y-6">
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">ID TICKET</p>
                <p className="font-mono text-slate-800 dark:text-white font-bold">{selectedItem.id}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">FECHA</p>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{selectedItem.fecha_creacion ? new Date(selectedItem.fecha_creacion).toLocaleString() : 'N/A'}</p>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider mb-2">Usuario Afectado</p>
              <div className="flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl">
                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 rounded-full flex items-center justify-center font-bold">
                  {selectedItem.usuario_nombre?.charAt(0) || 'U'}
                </div>
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-200">{selectedItem.usuario_nombre || 'Desconocido'}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-mono">{selectedItem.codigo_universitario || 'N/A'}</p>
                </div>
              </div>
            </div>

            {selectedItem.descripcion && (
              <div>
                <p className="text-xs font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider mb-2">Descripción de la Solicitud</p>
                <p className="text-slate-705 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl leading-relaxed">
                  {selectedItem.descripcion}
                </p>
              </div>
            )}

            {selectedItem.respuesta_generada && (
              <div>
                <p className="text-xs font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider mb-2 flex items-center gap-1"><Ticket className="w-3.5 h-3.5"/> Respuesta Generada por Sylia</p>
                <p className="text-indigo-900 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 p-4 rounded-xl leading-relaxed">
                  {selectedItem.respuesta_generada}
                </p>
              </div>
            )}

            {selectedItem.recomendacion && (
              <div>
                <p className="text-xs font-bold text-amber-500 dark:text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5"/> Alerta y Recomendación</p>
                <div className="bg-amber-50 dark:bg-amber-955/20 border border-amber-205 dark:border-amber-900/30 p-4 rounded-xl">
                  <p className="text-amber-900 dark:text-amber-300 font-bold mb-2">Riesgo Académico</p>
                  <p className="text-amber-800 dark:text-amber-400 leading-relaxed mb-3">{selectedItem.recomendacion}</p>
                  <div className="flex gap-4 text-sm font-semibold">
                    <span className="bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-350 px-2 py-1 rounded">Promedio Actual: {selectedItem.promedio_actual}</span>
                    <span className="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-350 px-2 py-1 rounded">Nota Requerida: {selectedItem.nota_necesaria}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button onClick={() => setIsModalOpen(false)} className="bg-slate-900 hover:bg-black dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl px-6">Cerrar Panel</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ServiceDeskPage;
