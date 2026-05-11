import React, { useState, useCallback } from 'react';
import { useSyllabus } from '../../contexts/SyllabusContext';
import Button from '../ui/Button';
import Modal from '../ui/Modal';

const SyllabusUploader = () => {
  const { uploadSyllabus, uploadStatus, clearUploadStatus } = useSyllabus();
  const [file, setFile] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected && selected.type === 'application/pdf') {
      setFile(selected);
    } else {
      alert('Por favor selecciona un archivo PDF válido.');
    }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped && dropped.type === 'application/pdf') {
      setFile(dropped);
    } else {
      alert('Solo se permiten archivos PDF.');
    }
  }, []);

  const handleDragOver = (e) => e.preventDefault();

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    const result = await uploadSyllabus(file);
    setUploading(false);
    if (result.success) {
      setFile(null);
      // El status se actualiza en el contexto, mostramos modal automáticamente
      setIsModalOpen(true);
    } else {
      alert('Error al subir: ' + result.error?.message);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    clearUploadStatus();
  };

  const getFiabilidadColor = (fiabilidad) => {
    switch (fiabilidad) {
      case 'ALTA': return 'text-green-600 bg-green-50';
      case 'MEDIA': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-red-600 bg-red-50';
    }
  };

  return (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
      <input
        type="file"
        accept="application/pdf"
        onChange={handleFileChange}
        className="hidden"
        id="pdf-upload"
      />
      <label
        htmlFor="pdf-upload"
        className="cursor-pointer inline-flex items-center gap-2 text-blue-600 hover:text-blue-800"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12m0 0l-3-3m3 3l3-3" />
        </svg>
        Seleccionar archivo PDF
      </label>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="mt-3 p-4 border border-gray-200 rounded bg-gray-50 text-gray-500 text-sm"
      >
        {file ? (
          <div className="flex justify-between items-center">
            <span>📄 {file.name}</span>
            <Button variant="outline" size="sm" onClick={() => setFile(null)}>Quitar</Button>
          </div>
        ) : (
          <span>Arrastra y suelta tu PDF aquí</span>
        )}
      </div>

      <Button
        onClick={handleUpload}
        disabled={!file || uploading}
        loading={uploading}
        className="mt-4 w-full"
      >
        Subir sílabo
      </Button>

      {/* Modal de resultado */}
      <Modal isOpen={isModalOpen} onClose={closeModal} title="Resultado de subida">
        {uploadStatus?.success ? (
          <div>
            <p className="mb-2">{uploadStatus.message}</p>
            <div className={`p-3 rounded ${getFiabilidadColor(uploadStatus.fiabilidad)}`}>
              <span className="font-medium">Fiabilidad del parsing:</span> {uploadStatus.fiabilidad}
              <p className="text-xs mt-1">
                {uploadStatus.fiabilidad === 'ALTA' 
                  ? 'El sílabo se procesó correctamente. Puedes consultar con total confianza.'
                  : uploadStatus.fiabilidad === 'MEDIA'
                  ? 'Algunas secciones pudieron extraerse con ambigüedad. Verifica los cálculos.'
                  : 'No se pudieron extraer todas las reglas. Las consultas numéricas pueden ser limitadas.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="text-red-600">
            {uploadStatus?.message || 'Error desconocido al subir el sílabo.'}
          </div>
        )}
        <div className="mt-4 flex justify-end">
          <Button onClick={closeModal}>Cerrar</Button>
        </div>
      </Modal>
    </div>
  );
};

export default SyllabusUploader;