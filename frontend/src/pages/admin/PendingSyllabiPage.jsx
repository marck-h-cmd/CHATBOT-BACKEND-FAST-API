import React, { useState } from 'react';
import * as syllabusAPI from '../../api/syllabus';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';

const PendingSyllabiPage = () => {
  const [syllabi, setSyllabi] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSyllabus, setSelectedSyllabus] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [comentario, setComentario] = useState('');
  const [action, setAction] = useState(null); // 'approve' or 'reject'

  const loadPendingSyllabi = async () => {
    setLoading(true);
    try {
      const data = await syllabusAPI.getPendingSyllabi();
      setSyllabi(data);
    } catch (error) {
      console.error('Error al cargar sílabos pendientes:', error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadPendingSyllabi();
  }, []);

  const handleApprove = async () => {
    try {
      await syllabusAPI.approveSyllabus(selectedSyllabus.id_silabo, comentario);
      setIsModalOpen(false);
      setComentario('');
      setSelectedSyllabus(null);
      setAction(null);
      loadPendingSyllabi();
    } catch (error) {
      alert('Error al aprobar sílabo: ' + error.message);
    }
  };

  const handleReject = async () => {
    try {
      await syllabusAPI.rejectSyllabus(selectedSyllabus.id_silabo, comentario);
      setIsModalOpen(false);
      setComentario('');
      setSelectedSyllabus(null);
      setAction(null);
      loadPendingSyllabi();
    } catch (error) {
      alert('Error al rechazar sílabo: ' + error.message);
    }
  };

  const openApprovalModal = (syllabus) => {
    setSelectedSyllabus(syllabus);
    setAction('approve');
    setComentario('');
    setIsModalOpen(true);
  };

  const openRejectionModal = (syllabus) => {
    setSelectedSyllabus(syllabus);
    setAction('reject');
    setComentario('');
    setIsModalOpen(true);
  };

  const getScoreColor = (score) => {
    if (score >= 70) return 'bg-green-100 text-green-800';
    if (score >= 40) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Validación de Sílabos Pendientes</h1>
        <Button onClick={loadPendingSyllabi}>🔄 Recargar</Button>
      </div>

      {syllabi.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              No hay sílabos pendientes de validación
            </h2>
            <p className="text-gray-600">
              Todos los sílabos han sido procesados.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {syllabi.map((syllabus) => (
            <Card key={syllabus.id_silabo}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                      {syllabus.codigo_curso || 'N/A'}
                    </span>
                    <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                      {syllabus.codigo_periodo || 'N/A'}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-800 mb-1">
                    {syllabus.nombre_curso || 'Curso sin nombre'}
                  </h3>
                  <p className="text-sm text-gray-500 mb-2">
                    Subido por: {syllabus.usuario_nombre || 'Usuario'} ({syllabus.codigo_universitario || 'N/A'})
                  </p>
                  
                  {/* Score de confianza */}
                  <div className="mb-3">
                    <span className={`text-xs px-2 py-1 rounded ${getScoreColor(syllabus.puntaje_confianza || 0)}`}>
                      Score: {syllabus.puntaje_confianza || 0}%
                    </span>
                  </div>

                  {/* Detalles del parsing */}
                  {syllabus.fiabilidad && (
                    <div className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">Fiabilidad:</span> {syllabus.fiabilidad}
                    </div>
                  )}

                  {syllabus.advertencias && syllabus.advertencias.length > 0 && (
                    <div className="mb-2">
                      <span className="text-sm font-medium text-gray-700">Advertencias:</span>
                      <ul className="list-disc list-inside text-sm text-gray-600 ml-2">
                        {syllabus.advertencias.map((adv, idx) => (
                          <li key={idx}>{adv}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <p className="text-xs text-gray-400">
                    Subido: {syllabus.fecha_subida ? new Date(syllabus.fecha_subida).toLocaleString() : 'N/A'}
                  </p>
                </div>

                <div className="flex flex-col gap-2 ml-4">
                  <Button
                    size="sm"
                    onClick={() => openApprovalModal(syllabus)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    ✅ Aprobar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openRejectionModal(syllabus)}
                    className="border-red-300 text-red-600 hover:bg-red-50"
                  >
                    ❌ Rechazar
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de aprobación/rechazo */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={action === 'approve' ? 'Aprobar Sílabo' : 'Rechazar Sílabo'}
      >
        {selectedSyllabus && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="font-medium">{selectedSyllabus.nombre_curso || 'Curso sin nombre'}</p>
              <p className="text-sm text-gray-500">
                Score: {selectedSyllabus.puntaje_confianza || 0}%
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Comentario {action === 'reject' ? '(opcional)' : ''}
              </label>
              <textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                rows={3}
                placeholder={action === 'reject' ? 'Razón del rechazo...' : 'Comentario adicional...'}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={action === 'approve' ? handleApprove : handleReject}
                className={action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
              >
                {action === 'approve' ? 'Aprobar' : 'Rechazar'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PendingSyllabiPage;
