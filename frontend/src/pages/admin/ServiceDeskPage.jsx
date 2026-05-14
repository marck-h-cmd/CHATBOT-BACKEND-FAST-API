import React, { useState, useEffect } from 'react';
import { useServiceDesk } from '../../contexts/ServiceDeskContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';

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
    return !inc.resuelto;
  });

  const handleUpdateStatus = async (item, newStatus) => {
    try {
      if (item.categoria) {
        // Es una solicitud
        await fetch(`/api/services/requests/${item.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ estado: newStatus })
        });
      } else {
        // Es un incidente
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
    const colors = {
      'ABIERTA': 'bg-blue-100 text-blue-800',
      'EN_PROCESO': 'bg-yellow-100 text-yellow-800',
      'RESUELTA': 'bg-green-100 text-green-800',
      'CERRADA': 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getSeverityBadge = (severity) => {
    const colors = {
      'ALTA': 'bg-red-100 text-red-800',
      'MEDIA': 'bg-yellow-100 text-yellow-800',
      'BAJA': 'bg-green-100 text-green-800',
    };
    return colors[severity] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Service Desk</h1>
        <Button onClick={refreshData}>🔄 Recargar</Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2 rounded-lg ${
            activeTab === 'requests' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          Solicitudes ({requests.length})
        </button>
        <button
          onClick={() => setActiveTab('incidents')}
          className={`px-4 py-2 rounded-lg ${
            activeTab === 'incidents' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          Incidentes ({incidents.filter(i => !i.resuelto).length})
        </button>
      </div>

      {/* Filtro de estado */}
      <div className="mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2"
        >
          <option value="all">Todos los estados</option>
          <option value="ABIERTA">Abiertas</option>
          <option value="EN_PROCESO">En proceso</option>
          <option value="RESUELTA">Resueltas</option>
          <option value="CERRADA">Cerradas</option>
        </select>
      </div>

      {/* Lista de solicitudes */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          {filteredRequests.length === 0 ? (
            <Card>
              <p className="text-center text-gray-500 py-8">No hay solicitudes registradas.</p>
            </Card>
          ) : (
            filteredRequests.map((request) => (
              <Card key={request.id} className="hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs px-2 py-1 rounded ${getStatusBadge(request.estado)}`}>
                        {request.estado.replace(/_/g, ' ')}
                      </span>
                      {request.escalada && (
                        <span className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded">
                          ⬆️ Escalada
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-gray-800 mb-1">{request.descripcion || 'Sin descripción'}</p>
                    <p className="text-sm text-gray-500 mb-2">
                      Usuario: {request.usuario_nombre || 'N/A'} ({request.codigo_universitario || 'N/A'})
                    </p>
                    {request.respuesta_generada && (
                      <div className="bg-blue-50 p-3 rounded mb-2">
                        <p className="text-sm text-gray-700">{request.respuesta_generada}</p>
                      </div>
                    )}
                    <p className="text-xs text-gray-400">
                      Creado: {request.fecha_creacion ? new Date(request.fecha_creacion).toLocaleString() : 'N/A'}
                      {request.tiempo_respuesta_ms && (
                        <span className="ml-2">Tiempo: {request.tiempo_respuesta_ms}ms</span>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 ml-4">
                    <Button size="sm" variant="outline" onClick={() => openDetailModal(request)}>
                      Ver detalles
                    </Button>
                    {request.estado === 'ABIERTA' && (
                      <Button size="sm" onClick={() => handleUpdateStatus(request, 'EN_PROCESO')}>
                        En proceso
                      </Button>
                    )}
                    {request.estado === 'EN_PROCESO' && (
                      <Button size="sm" onClick={() => handleUpdateStatus(request, 'RESUELTA')}>
                        Resolver
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Lista de incidentes */}
      {activeTab === 'incidents' && (
        <div className="space-y-4">
          {filteredIncidents.length === 0 ? (
            <Card>
              <p className="text-center text-gray-500 py-8">No hay incidentes activos.</p>
            </Card>
          ) : (
            filteredIncidents.map((incident) => (
              <Card key={incident.id} className="hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs px-2 py-1 rounded ${getSeverityBadge(incident.severidad)}`}>
                        {incident.severidad}
                      </span>
                      {incident.resuelto && (
                        <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                          ✅ Resuelto
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-gray-800 mb-1">
                      {incident.recomendacion || 'Incidente académico'}
                    </p>
                    <p className="text-sm text-gray-500 mb-2">
                      Promedio: {incident.promedio_actual} | Nota necesaria: {incident.nota_necesaria}
                    </p>
                    <p className="text-xs text-gray-400">
                      Usuario: {incident.usuario_nombre || 'N/A'} ({incident.codigo_universitario || 'N/A'})
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 ml-4">
                    <Button size="sm" variant="outline" onClick={() => openDetailModal(incident)}>
                      Ver detalles
                    </Button>
                    {!incident.resuelto && (
                      <Button size="sm" onClick={() => handleUpdateStatus(incident, 'RESUELTA')}>
                        Marcar resuelto
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Modal de detalles */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Detalles">
        {selectedItem && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">
                <strong>ID:</strong> {selectedItem.id}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Usuario:</strong> {selectedItem.usuario_nombre || 'N/A'}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Fecha:</strong> {selectedItem.fecha_creacion ? new Date(selectedItem.fecha_creacion).toLocaleString() : 'N/A'}
              </p>
            </div>
            {selectedItem.descripcion && (
              <div>
                <p className="font-medium mb-2">Descripción:</p>
                <p className="text-gray-700">{selectedItem.descripcion}</p>
              </div>
            )}
            {selectedItem.respuesta_generada && (
              <div>
                <p className="font-medium mb-2">Respuesta generada:</p>
                <p className="text-gray-700">{selectedItem.respuesta_generada}</p>
              </div>
            )}
            {selectedItem.recomendacion && (
              <div>
                <p className="font-medium mb-2">Recomendación:</p>
                <p className="text-gray-700">{selectedItem.recomendacion}</p>
              </div>
            )}
            <div className="flex justify-end pt-4">
              <Button onClick={() => setIsModalOpen(false)}>Cerrar</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ServiceDeskPage;
