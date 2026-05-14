import React, { useState, useCallback } from 'react';
import { useSyllabus } from '../../contexts/SyllabusContext';
import { useCourse } from '../../contexts/CourseContext';
import Button from '../ui/Button';
import Modal from '../ui/Modal';

const SyllabusUploader = () => {
  const { uploadSyllabus, uploadStatus, clearUploadStatus } = useSyllabus();
  const { courses, periods, getCurrentPeriod } = useCourse();
  const [file, setFile] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState(null);

  // Seleccionar periodo actual por defecto
  React.useEffect(() => {
    const currentPeriod = getCurrentPeriod();
    if (currentPeriod) {
      setSelectedPeriod(currentPeriod.id_periodo);
    }
  }, [getCurrentPeriod]);

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
    if (!selectedCourse) {
      alert('Por favor selecciona un curso.');
      return;
    }
    if (!selectedPeriod) {
      alert('Por favor selecciona un periodo.');
      return;
    }
    setUploading(true);
    const result = await uploadSyllabus(file, selectedCourse, selectedPeriod);
    setUploading(false);
    if (result.success) {
      setFile(null);
      setIsModalOpen(true);
    } else {
      alert('Error al subir: ' + (result.error?.message || 'Error desconocido'));
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    clearUploadStatus();
  };

  const getFiabilidadColor = (fiabilidad) => {
    if (!fiabilidad) return 'text-gray-600 bg-gray-50';
    const nivel = fiabilidad.toString().toUpperCase();
    switch (nivel) {
      case 'ALTA':
        return 'text-green-700 bg-green-50 border border-green-200';
      case 'MEDIA':
        return 'text-yellow-700 bg-yellow-50 border border-yellow-200';
      case 'BAJA':
        return 'text-red-700 bg-red-50 border border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border border-gray-200';
    }
  };

  const getFiabilidadIcono = (fiabilidad) => {
    if (!fiabilidad) return '📄';
    const nivel = fiabilidad.toString().toUpperCase();
    switch (nivel) {
      case 'ALTA': return '✅';
      case 'MEDIA': return '⚠️';
      case 'BAJA': return '❌';
      default: return '📄';
    }
  };

  const getFiabilidadDescripcion = (fiabilidad, advertencias) => {
    if (!fiabilidad) return 'No se pudo determinar la fiabilidad del procesamiento.';
    
    const nivel = fiabilidad.toString().toUpperCase();
    
    switch (nivel) {
      case 'ALTA':
        return 'El sílabo se procesó correctamente. Puedes realizar consultas con total confianza.';
      case 'MEDIA':
        return 'Algunas secciones se extrajeron con ambigüedad. Verifica los cálculos manualmente si es necesario.';
      case 'BAJA':
        return 'No se pudieron extraer todas las reglas automáticamente. Las consultas numéricas pueden ser limitadas. Revisa el sílabo original.';
      default:
        return 'Procesamiento completado. Revisa los detalles abajo.';
    }
  };

  return (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
      {/* Selectores de curso y periodo */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Curso</label>
          <select
            value={selectedCourse || ''}
            onChange={(e) => setSelectedCourse(parseInt(e.target.value))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Seleccionar curso...</option>
            {courses.map((course) => (
              <option key={course.id_curso} value={course.id_curso}>
                {course.codigo_curso} - {course.nombre_curso}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Periodo</label>
          <select
            value={selectedPeriod || ''}
            onChange={(e) => setSelectedPeriod(parseInt(e.target.value))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Seleccionar periodo...</option>
            {periods.map((period) => (
              <option key={period.id_periodo} value={period.id_periodo}>
                {period.nombre} {period.es_actual && '(Actual)'}
              </option>
            ))}
          </select>
        </div>
      </div>

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
        disabled={!file || uploading || !selectedCourse || !selectedPeriod}
        loading={uploading}
        className="mt-4 w-full"
      >
        Subir sílabo
      </Button>

      {/* Modal de resultado */}
      <Modal isOpen={isModalOpen} onClose={closeModal} title="📋 Resultado de subida" size="lg">
        {uploadStatus?.success ? (
          <div className="space-y-4">
            {/* Mensaje principal */}
            <p className="text-gray-700">{uploadStatus.message || uploadStatus.aviso || 'Sílabo procesado correctamente'}</p>
            
            {/* Información del curso */}
            {(uploadStatus.nombre_curso || uploadStatus.curso?.nombre) && (
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <h4 className="font-semibold text-gray-700 mb-2">📚 Información del curso</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">Curso:</span>
                    <p className="font-medium">{uploadStatus.nombre_curso || uploadStatus.curso?.nombre}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Código:</span>
                    <p className="font-medium">{uploadStatus.codigo_curso || uploadStatus.curso?.codigo || 'No especificado'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Ciclo:</span>
                    <p className="font-medium">{uploadStatus.ciclo || uploadStatus.curso?.ciclo || 'No especificado'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Periodo:</span>
                    <p className="font-medium">{uploadStatus.periodo || uploadStatus.curso?.periodo || 'No especificado'}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500">Docente:</span>
                    <p className="font-medium">{uploadStatus.docente || uploadStatus.curso?.docente || 'No especificado'}</p>
                  </div>
                  {uploadStatus.email_docente && (
                    <div className="col-span-2">
                      <span className="text-gray-500">Email:</span>
                      <p className="font-medium text-sm">{uploadStatus.email_docente}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Fiabilidad */}
            <div className={`p-3 rounded-lg ${getFiabilidadColor(uploadStatus.fiabilidad)}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{getFiabilidadIcono(uploadStatus.fiabilidad)}</span>
                <span className="font-semibold">
                  Fiabilidad del parsing: {uploadStatus.fiabilidad || 'No determinada'}
                </span>
              </div>
              <p className="text-sm">
                {getFiabilidadDescripcion(uploadStatus.fiabilidad, uploadStatus.advertencias)}
              </p>
              
              {/* Advertencias específicas */}
              {uploadStatus.advertencias && uploadStatus.advertencias.length > 0 && (
                <div className="mt-2 text-xs border-t pt-2 border-current/30">
                  <span className="font-medium">⚠️ Observaciones:</span>
                  <ul className="list-disc list-inside mt-1">
                    {uploadStatus.advertencias.map((adv, idx) => (
                      <li key={idx}>{adv}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            {/* Evidencias detectadas */}
            {uploadStatus.evidencias && Object.keys(uploadStatus.evidencias).length > 0 && (
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-2">📊 Sistema de evaluación detectado</h4>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(uploadStatus.evidencias).map(([key, value]) => (
                    <div key={key} className="bg-white rounded p-2 text-center shadow-sm">
                      <div className="font-bold text-blue-600">{key}</div>
                      <div className="text-xs text-gray-500 truncate">{value.nombre || key}</div>
                      <div className="text-sm font-semibold mt-1">Peso: {value.peso}%</div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  Nota aprobatoria: {uploadStatus.nota_aprobatoria || 14}
                </p>
              </div>
            )}
            
            {/* Unidades detectadas */}
            {uploadStatus.unidades && uploadStatus.unidades.length > 0 && (
              <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                <h4 className="font-semibold text-green-800 mb-2">📖 Unidades curriculares</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {uploadStatus.unidades.map((unidad, idx) => (
                    <div key={idx} className="bg-white rounded p-2 text-sm">
                      <span className="font-medium">{unidad.id}:</span> {unidad.nombre}
                      <span className="text-xs text-gray-500 ml-2">({unidad.semanas})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Modo de procesamiento */}
            <div className="text-xs text-gray-400 text-center pt-2 border-t">
              {uploadStatus.usando_gemini 
                ? '🤖 Procesado con IA (Gemini)'
                : '📝 Procesado con motor estándar'}
            </div>
          </div>
        ) : (
          <div className="text-red-600 p-4 bg-red-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">❌</span>
              <span className="font-semibold">Error al procesar el sílabo</span>
            </div>
            <p>{uploadStatus?.message || 'Error desconocido al subir el sílabo.'}</p>
            {uploadStatus?.error && (
              <p className="text-xs mt-2 text-red-500">{uploadStatus.error}</p>
            )}
          </div>
        )}
        <div className="mt-4 flex justify-end">
          <Button onClick={closeModal} variant="primary">
            Entendido
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default SyllabusUploader;