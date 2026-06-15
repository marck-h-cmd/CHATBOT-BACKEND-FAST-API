import React, { useState, useEffect } from 'react';
import { useCourse } from '../contexts/CourseContext';
import { useSyllabus } from '../contexts/SyllabusContext';
import { useNavigate, useLocation } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const EnrollmentSuccessPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { courses, periods, loading: coursesLoading, refreshData } = useCourse();
  const { userSyllabi, uploadSyllabus, loading: syllabusLoading } = useSyllabus();
  
  const [syllabusExists, setSyllabusExists] = useState(false);
  const [syllabusInfo, setSyllabusInfo] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const enrollmentData = location.state?.enrollment || {};
  const courseId = enrollmentData.id_curso;
  const periodId = enrollmentData.id_periodo;

  const courseData = courses?.length ? courses.find(c => c.id_curso === courseId) : null;
  const periodData = periods?.length ? periods.find(p => p.id_periodo === periodId) : null;

  // Verificar si existe sílabo para este curso/período
  useEffect(() => {
    if (courseId && periodId && userSyllabi?.length) {
      const silabo = userSyllabi.find(s => 
        s.id_curso === courseId && s.id_periodo === periodId
      );
      
      if (silabo) {
        setSyllabusExists(true);
        setSyllabusInfo(silabo);
      } else {
        setSyllabusExists(false);
      }
    }
  }, [courseId, periodId, userSyllabi]);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setError('Por favor, carga un archivo PDF');
        return;
      }
      if (file.size > 20 * 1024 * 1024) { // 20MB
        setError('El archivo es demasiado grande (máx 20MB)');
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleUploadSyllabus = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadProgress(0);
    setError(null);

    // Simular progreso
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => Math.min(prev + 10, 90));
    }, 200);

    try {
      console.log('Iniciando upload...', { courseId, periodId, fileName: selectedFile.name });
      const result = await uploadSyllabus(selectedFile, courseId, periodId);
      
      clearInterval(progressInterval);
      console.log('Upload result:', result);
      
      if (result?.success) {
        setUploadProgress(100);
        setSyllabusExists(true);
        // Guardar info del sílabo subido
        setSyllabusInfo({
          id_silabo: result.id,
          id_curso: courseId,
          id_periodo: periodId,
          nombre_archivo: selectedFile.name,
          fecha_subida: new Date().toISOString(),
          score: result.data?.score,
          ...result.data
        });
        setSelectedFile(null);
        if (typeof refreshData === 'function') {
          refreshData();
        }
      } else {
        const errorMsg = result?.error?.message || result?.error?.detail || 'Error al cargar el sílabo';
        console.error('Upload failed:', errorMsg);
        setError(errorMsg);
      }
    } catch (err) {
      clearInterval(progressInterval);
      console.error('Upload exception:', err);
      setError(err.message || 'Error al cargar el sílabo. Por favor intenta de nuevo.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSkipUpload = () => {
    // Ir a chat sin cargar sílabo
    navigate('/chat');
  };

  const handleGoToChat = () => {
    navigate('/chat');
  };

  if (syllabusLoading || coursesLoading) {
    return <LoadingSpinner fullScreen />;
  }

  // Validar que hay datos de inscripción
  if (!courseId || !periodId) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="dark:bg-[#131A2C] dark:border-slate-800 transition-colors duration-200">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">❌</div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Error en la Inscripción</h2>
            <p className="text-gray-600 dark:text-slate-400 mb-8">
              No se encontraron los datos de la inscripción. Por favor, intenta de nuevo.
            </p>
            <Button onClick={() => navigate('/cursos')}>
              Volver al Catálogo
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Resumen de inscripción */}
      <Card className="mb-6 border-green-200 dark:border-green-900/30 bg-green-50 dark:bg-green-955/20 transition-colors duration-200">
        <div className="text-center py-4">
          <div className="text-5xl mb-3">✅</div>
          <h1 className="text-2xl font-bold text-green-900 dark:text-green-400 mb-2">¡Inscripción Confirmada!</h1>
          <p className="text-green-800 dark:text-green-300 mb-4">
            Te has inscrito exitosamente en:
          </p>
          <div className="bg-white dark:bg-slate-900 rounded-lg p-4 mb-4 border border-green-100/50 dark:border-green-950/20 transition-colors duration-200">
            <p className="text-lg font-semibold text-gray-800 dark:text-white mb-1">
              {courseData?.nombre_curso}
            </p>
            <p className="text-sm text-gray-600 dark:text-slate-300 mb-2">
              {courseData?.codigo_curso} • {courseData?.creditos} créditos
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Período: {periodData?.nombre}
            </p>
          </div>
        </div>
      </Card>
      {/* Sección de sílabo */}
      <Card className="mb-6 dark:bg-[#131A2C] dark:border-slate-800 transition-colors duration-200">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <span>📚 Sílabo del Curso</span>
        </h2>

        {syllabusExists && syllabusInfo?.estado === 'PENDIENTE_CONFIRMACION' ? (
          <div className="bg-amber-50 dark:bg-amber-955/20 border border-amber-200 dark:border-amber-900/30 rounded-lg p-4 mb-4 transition-colors duration-200">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⏳</span>
              <div className="flex-1">
                <p className="font-semibold text-amber-900 dark:text-amber-400 mb-1">Sílabo en Revisión Manual</p>
                <p className="text-sm text-amber-805 dark:text-amber-300 mb-3">
                  Tu sílabo fue subido exitosamente, pero la extracción de la IA tuvo un nivel de confianza del <span className="font-bold">{syllabusInfo.score || 0}%</span>. Un administrador validará los datos pronto para habilitar el chat.
                </p>
                {syllabusInfo?.fecha_subida && (
                  <p className="text-xs text-amber-700 dark:text-amber-500 font-medium">
                    Enviado el: {new Date(syllabusInfo.fecha_subida).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : syllabusExists && (!syllabusInfo?.estado || syllabusInfo?.estado === 'APROBADO') ? (
          <div className="bg-blue-50 dark:bg-blue-955/20 border border-blue-200 dark:border-blue-900/30 rounded-lg p-4 mb-4 transition-colors duration-200">
            <div className="flex items-start gap-3">
              <span className="text-2xl">✓</span>
              <div className="flex-1">
                <p className="font-semibold text-blue-900 dark:text-blue-400 mb-1">Sílabo Disponible y Validado</p>
                <p className="text-sm text-blue-800 dark:text-blue-300 mb-3">
                  {syllabusInfo?.score ? `El sílabo fue procesado por la IA con un ${syllabusInfo.score}% de confianza y ya está activo.` : 'El sílabo de este curso ya está disponible.'} Puedes acceder a él en el chat.
                </p>
                {syllabusInfo?.fecha_subida && (
                  <p className="text-xs text-blue-700 dark:text-blue-500">
                    Cargado: {new Date(syllabusInfo.fecha_subida).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            {syllabusExists && syllabusInfo?.estado === 'RECHAZADO' && (
              <div className="bg-red-50 dark:bg-red-955/20 border border-red-200 dark:border-red-900/30 rounded-lg p-4 mb-4 transition-colors duration-200">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">❌</span>
                  <div>
                    <p className="font-semibold text-red-900 dark:text-red-400 mb-1">Sílabo Rechazado</p>
                    <p className="text-sm text-red-800 dark:text-red-300">
                      Tu último intento de carga fue invalidado por un administrador. Por favor, sube un documento PDF correcto.
                    </p>
                  </div>
                </div>
              </div>
            )}
            <div className="bg-orange-50 dark:bg-orange-955/20 border border-orange-200 dark:border-orange-900/30 rounded-lg p-4 mb-4 transition-colors duration-200">
              <div className="flex items-start gap-3 mb-4">
                <span className="text-2xl">⚠️</span>
                <div>
                  <p className="font-semibold text-orange-900 dark:text-orange-400 mb-1">Sílabo No Disponible</p>
                  <p className="text-sm text-orange-800 dark:text-orange-300">
                    No hay sílabo cargado para este curso. Puedes cargarlo ahora o hacerlo después.
                  </p>
                </div>
              </div>
            </div>                {/* Upload area */}
            {!uploading && !uploadProgress ? (
              <div>
                <label className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed border-orange-300 dark:border-orange-800 rounded-lg cursor-pointer bg-orange-100 dark:bg-orange-955/20 hover:bg-orange-200 dark:hover:bg-orange-900/30 transition-colors">
                  <div className="text-center">
                    <span className="text-3xl mb-2">📄</span>
                    <p className="font-medium text-orange-900 dark:text-orange-300 mb-1">
                      {selectedFile ? selectedFile.name : 'Haz clic para seleccionar o arrastra un PDF'}
                    </p>
                    <p className="text-xs text-orange-700 dark:text-orange-400">
                      Máximo 20MB • Formato: PDF
                    </p>
                  </div>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>

                <div className="mt-4 flex gap-3">
                  <Button
                    onClick={handleUploadSyllabus}
                    disabled={!selectedFile}
                    className="flex-1"
                  >
                    Cargar Sílabo
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleSkipUpload}
                    className="flex-1 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-705 dark:text-slate-300 rounded-xl transition-colors"
                  >
                    Saltar por Ahora
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="w-full bg-gray-200 dark:bg-slate-800 rounded-full h-2">
                  <div
                    className="bg-orange-500 dark:bg-orange-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600 dark:text-slate-400 text-center">
                  {uploadProgress > 0 ? `Cargando... ${uploadProgress}%` : 'Procesando sílabo...'}
                </p>
              </div>
            )}

            {/* Error message - mostrar siempre */}
            {error && (
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-955/20 border-l-4 border-red-500 dark:border-red-600 rounded">
                <p className="text-sm font-semibold text-red-808 dark:text-red-400 mb-2">❌ Error al cargar:</p>
                <p className="text-sm text-red-707 dark:text-red-300 mb-3">{error}</p>
                <Button
                  onClick={() => { setError(null); setSelectedFile(null); }}
                  variant="outline"
                  size="sm"
                  className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-705 dark:text-slate-300 rounded-xl transition-colors"
                >
                  Limpiar e intentar de nuevo
                </Button>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Próximos pasos */}
      <Card className="mb-6 bg-blue-50 dark:bg-blue-955/20 border border-blue-200 dark:border-blue-900/30 transition-colors duration-200">
        <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-400 mb-3">🎯 Próximos Pasos</h2>
        <ol className="space-y-2 text-sm text-blue-900 dark:text-blue-300">
          <li className="flex gap-2">
            <span className="font-bold">1.</span>
            <span>Accede al chat del curso para interactuar con el asistente ITIL</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">2.</span>
            <span>Realiza consultas sobre el contenido del sílabo</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">3.</span>
            <span>El sistema te alertará sobre riesgos académicos detectados</span>
          </li>
        </ol>
      </Card>

      {/* Botón principal */}
      <div className="flex gap-3">
        <Button
          onClick={() => navigate('/cursos')}
          variant="outline"
          className="flex-1 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-705 dark:text-slate-300 rounded-xl transition-colors"
        >
          ← Volver al Catálogo
        </Button>
        <Button
          onClick={handleGoToChat}
          className="flex-1"
        >
          Ir al Chat del Curso 💬
        </Button>
      </div>
    </div>
  );
};

export default EnrollmentSuccessPage;
