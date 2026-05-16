import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSyllabus } from '../../contexts/SyllabusContext';
import { useCourse } from '../../contexts/CourseContext';

export default function SyllabusUploadPage() {
  const navigate = useNavigate();
  const { uploadOfficialSyllabus, uploadStatus, clearUploadStatus } = useSyllabus();
  const { courses, periods, loading: courseLoading } = useCourse();

  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Cargar cursos y periodos
  useEffect(() => {
    // Los cursos ya están cargados desde el contexto
  }, []);

  const validateFile = (file) => {
    const maxSize = 20 * 1024 * 1024; // 20MB
    const validTypes = ['application/pdf'];

    if (!validTypes.includes(file.type)) {
      setValidationError('Solo se permiten archivos PDF');
      return false;
    }

    if (file.size > maxSize) {
      setValidationError('El archivo no debe exceder 20MB');
      return false;
    }

    setValidationError('');
    return true;
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) {
      setSelectedFile(file);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file && validateFile(file)) {
      setSelectedFile(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedFile) {
      setValidationError('Selecciona un archivo');
      return;
    }

    if (!selectedCourse) {
      setValidationError('Selecciona un curso');
      return;
    }

    if (!selectedPeriod) {
      setValidationError('Selecciona un período');
      return;
    }

    setUploading(true);
    const result = await uploadOfficialSyllabus(
      selectedFile,
      parseInt(selectedCourse),
      parseInt(selectedPeriod)
    );

    if (result.success) {
      // Limpiar formulario
      setSelectedFile(null);
      setSelectedCourse('');
      setSelectedPeriod('');
      // Mantener el mensaje de éxito visible por unos segundos
      setTimeout(() => {
        clearUploadStatus();
        navigate('/admin/silabos');
      }, 2000);
    }
    setUploading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Encabezado */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Subir Sílabo Oficial</h1>
          <p className="text-gray-600 mt-2">
            Carga el documento oficial del sílabo. Una vez subido, se sincronizará automáticamente con los estudiantes.
          </p>
        </div>

        {/* Tarjeta principal */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Selección de Curso */}
            <div>
              <label htmlFor="course" className="block text-sm font-medium text-gray-900 mb-2">
                Curso <span className="text-red-500">*</span>
              </label>
              <select
                id="course"
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                disabled={courseLoading}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">
                  {courseLoading ? 'Cargando cursos...' : 'Selecciona un curso'}
                </option>
                {courses?.map((course) => (
                  <option key={course.id_curso} value={course.id_curso}>
                    {course.codigo_curso} - {course.nombre_curso}
                  </option>
                ))}
              </select>
            </div>

            {/* Selección de Período */}
            <div>
              <label htmlFor="period" className="block text-sm font-medium text-gray-900 mb-2">
                Período Académico <span className="text-red-500">*</span>
              </label>
              <select
                id="period"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Selecciona un período</option>
                {periods?.map((period) => (
                  <option key={period.id_periodo} value={period.id_periodo}>
                    {period.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Carga de archivo */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Archivo PDF <span className="text-red-500">*</span>
              </label>

              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  dragActive
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 bg-gray-50'
                } ${selectedFile ? 'bg-blue-50 border-blue-300' : ''}`}
              >
                <input
                  type="file"
                  id="file-input"
                  onChange={handleFileSelect}
                  accept=".pdf"
                  className="hidden"
                  disabled={uploading}
                />

                {selectedFile ? (
                  <div>
                    <div className="text-4xl mb-2">✓</div>
                    <p className="text-green-600 font-medium">{selectedFile.name}</p>
                    <p className="text-gray-600 text-sm mt-1">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      disabled={uploading}
                      className="text-blue-500 text-sm mt-2 hover:underline disabled:opacity-50"
                    >
                      Cambiar archivo
                    </button>
                  </div>
                ) : (
                  <label htmlFor="file-input" className="cursor-pointer">
                    <div className="text-4xl mb-2">📄</div>
                    <p className="text-gray-900 font-medium">
                      Arrastra aquí o haz clic para seleccionar
                    </p>
                    <p className="text-gray-600 text-sm mt-1">
                      Máximo 20MB • Solo PDF
                    </p>
                  </label>
                )}
              </div>
            </div>

            {/* Errores de validación */}
            {validationError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700 text-sm">{validationError}</p>
              </div>
            )}

            {/* Estado de carga */}
            {uploadStatus && (
              <div
                className={`p-4 rounded-lg ${
                  uploadStatus.success
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                }`}
              >
                {uploadStatus.loading && (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                    <p className="text-blue-700 text-sm">{uploadStatus.message}</p>
                  </div>
                )}
                {uploadStatus.success && !uploadStatus.loading && (
                  <div>
                    <p className="text-green-700 font-medium">✓ {uploadStatus.message}</p>
                    <p className="text-green-600 text-sm mt-1">
                      Score de confianza: {uploadStatus.score}%
                    </p>
                    <p className="text-green-600 text-sm">
                      {uploadStatus.contextos_sincronizados} estudiantes sincronizados
                    </p>
                  </div>
                )}
                {uploadStatus.error && !uploadStatus.loading && (
                  <p className="text-red-700 text-sm">{uploadStatus.message}</p>
                )}
              </div>
            )}

            {/* Botones de acción */}
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => navigate('/admin/silabos')}
                disabled={uploading}
                className="flex-1 px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={uploading || !selectedFile}
                className="flex-1 px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Cargando...
                  </>
                ) : (
                  <>
                    ⬆ Subir Sílabo
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Información útil */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="font-medium text-gray-900 mb-3">Requisitos:</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>✓ Formato PDF</li>
              <li>✓ Máximo 20MB</li>
              <li>✓ Documento legible y estructurado</li>
              <li>✓ Contiene información del curso, objetivos y metodología</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
