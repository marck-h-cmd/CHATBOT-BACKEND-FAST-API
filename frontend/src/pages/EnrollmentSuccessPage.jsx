import React, { useState, useEffect } from 'react';
import { useCourse } from '../contexts/CourseContext';
import { useSyllabus } from '../contexts/SyllabusContext';
import { useNavigate, useLocation } from 'react-router-dom';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { CheckCircle2, AlertTriangle, BookOpen, FileText, UploadCloud, MessageSquare, ChevronLeft, Calendar } from 'lucide-react';

const EnrollmentSuccessPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { courses, periods, enrollments, loading: coursesLoading } = useCourse();
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

  useEffect(() => {
    if (enrollmentData.silabo_asignado) {
      setSyllabusExists(true);
      setSyllabusInfo({
        id_silabo: enrollmentData.silabo_asignado,
        id_curso: courseId,
        id_periodo: periodId,
      });
      return;
    }

    if (enrollments && enrollments.length > 0) {
      const enrollment = enrollments.find(e => e.id_curso === courseId && e.id_periodo === periodId);
      if (enrollment && enrollment.id_silabo) {
        setSyllabusExists(true);
        setSyllabusInfo({
          id_silabo: enrollment.id_silabo,
          id_curso: courseId,
          id_periodo: periodId,
        });
        return;
      }
    }

    if (courseId && periodId && userSyllabi?.length) {
      const silabo = userSyllabi.find(s => 
        s.id_curso === courseId && s.id_periodo === periodId
      );
      
      if (silabo) {
        setSyllabusExists(true);
        setSyllabusInfo(silabo);
        return;
      }
    }
    setSyllabusExists(false);
  }, [courseId, periodId, userSyllabi, enrollmentData.silabo_asignado, enrollments]);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setError('Por favor, carga un archivo PDF');
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
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

    const progressInterval = setInterval(() => {
      setUploadProgress(prev => Math.min(prev + 10, 90));
    }, 200);

    try {
      const result = await uploadSyllabus(selectedFile, courseId, periodId);
      clearInterval(progressInterval);
      
      if (result?.success) {
        setUploadProgress(100);
        setSyllabusExists(true);
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
      } else {
        const errorMsg = result?.error?.message || result?.error?.detail || 'Error al cargar el sílabo';
        setError(errorMsg);
      }
    } catch (err) {
      clearInterval(progressInterval);
      setError(err.message || 'Error al cargar el sílabo. Por favor intenta de nuevo.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSkipUpload = () => navigate('/chat');
  const handleGoToChat = () => navigate('/chat');

  if (syllabusLoading || coursesLoading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!courseId || !periodId) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Error en la Inscripción</h2>
          <p className="text-slate-500 mb-8 max-w-md mx-auto">
            No se encontraron los datos de la inscripción. Por favor, intenta de nuevo desde el catálogo.
          </p>
          <Button onClick={() => navigate('/cursos')}>Volver al Catálogo</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
      {/* Resumen de inscripción */}
      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm mb-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500"></div>
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-5 text-emerald-600">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">¡Inscripción Confirmada!</h1>
          <p className="text-slate-500 mb-8 max-w-lg">
            Te has matriculado exitosamente en el siguiente curso. Ya puedes acceder al contenido y herramientas del asistente.
          </p>
          
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 w-full max-w-lg text-left">
            <p className="text-xl font-bold text-slate-800 mb-2">{courseData?.nombre_curso}</p>
            <div className="flex flex-wrap gap-2 text-sm text-slate-600 mb-3">
              <span className="bg-white px-2 py-1 rounded border border-slate-200 font-mono">{courseData?.codigo_curso}</span>
              <span className="bg-white px-2 py-1 rounded border border-slate-200">{courseData?.creditos} créditos</span>
              <span className="bg-white px-2 py-1 rounded border border-slate-200">{courseData?.escuela}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-slate-500 font-medium">
              <Calendar className="w-4 h-4" /> {periodData?.nombre}
            </div>
          </div>
        </div>
      </div>

      {/* Sección de sílabo */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-indigo-600" /> Sílabo del Curso
        </h2>

        {syllabusExists ? (
          <div className={`border rounded-2xl p-6 shadow-sm flex items-start gap-4 ${
            syllabusInfo?.estado_verificacion === 'APROBADO' || syllabusInfo?.estado_verificacion === 'OFICIAL' || syllabusInfo?.estado === 'APROBADO'
              ? 'bg-emerald-50 border-emerald-200' 
              : syllabusInfo?.estado_verificacion === 'RECHAZADO' || syllabusInfo?.estado === 'RECHAZADO'
              ? 'bg-red-50 border-red-200'
              : 'bg-amber-50 border-amber-200'
          }`}>
            <div className={`p-3 rounded-xl shrink-0 ${
              syllabusInfo?.estado_verificacion === 'APROBADO' || syllabusInfo?.estado_verificacion === 'OFICIAL' || syllabusInfo?.estado === 'APROBADO'
                ? 'bg-emerald-100 text-emerald-600'
                : syllabusInfo?.estado_verificacion === 'RECHAZADO' || syllabusInfo?.estado === 'RECHAZADO'
                ? 'bg-red-100 text-red-600'
                : 'bg-amber-100 text-amber-600'
            }`}>
              {syllabusInfo?.estado_verificacion === 'APROBADO' || syllabusInfo?.estado_verificacion === 'OFICIAL' || syllabusInfo?.estado === 'APROBADO' ? (
                <CheckCircle2 className="w-6 h-6" />
              ) : syllabusInfo?.estado_verificacion === 'RECHAZADO' || syllabusInfo?.estado === 'RECHAZADO' ? (
                <AlertTriangle className="w-6 h-6" />
              ) : (
                <FileText className="w-6 h-6" />
              )}
            </div>
            <div className="w-full">
              <p className={`font-bold text-lg mb-1 ${
                syllabusInfo?.estado_verificacion === 'APROBADO' || syllabusInfo?.estado_verificacion === 'OFICIAL' || syllabusInfo?.estado === 'APROBADO'
                  ? 'text-emerald-900'
                  : syllabusInfo?.estado_verificacion === 'RECHAZADO' || syllabusInfo?.estado === 'RECHAZADO'
                  ? 'text-red-900'
                  : 'text-amber-900'
              }`}>
                {syllabusInfo?.estado_verificacion === 'APROBADO' || syllabusInfo?.estado_verificacion === 'OFICIAL' || syllabusInfo?.estado === 'APROBADO'
                  ? 'Sílabo Aprobado y Activo'
                  : syllabusInfo?.estado_verificacion === 'RECHAZADO' || syllabusInfo?.estado === 'RECHAZADO'
                  ? 'Sílabo Rechazado'
                  : 'Sílabo en Revisión'}
              </p>
              <p className={`text-sm mb-3 ${
                syllabusInfo?.estado_verificacion === 'APROBADO' || syllabusInfo?.estado_verificacion === 'OFICIAL' || syllabusInfo?.estado === 'APROBADO'
                  ? 'text-emerald-800'
                  : syllabusInfo?.estado_verificacion === 'RECHAZADO' || syllabusInfo?.estado === 'RECHAZADO'
                  ? 'text-red-800'
                  : 'text-amber-800'
              }`}>
                {syllabusInfo?.estado_verificacion === 'APROBADO' || syllabusInfo?.estado_verificacion === 'OFICIAL' || syllabusInfo?.estado === 'APROBADO'
                  ? '¡Perfecto! Sylia ha extraído las fórmulas y reglas correctamente. Puedes realizar cualquier consulta de cálculo y evaluación en el chat.'
                  : syllabusInfo?.estado_verificacion === 'RECHAZADO' || syllabusInfo?.estado === 'RECHAZADO'
                  ? 'El documento no parece ser un sílabo válido o es ilegible. Sylia no pudo procesarlo.'
                  : 'Sylia ha detectado estructuras complejas. Mientras se revisa automáticamente, solo podrás hacer consultas teóricas generales.'}
              </p>
              
              {syllabusInfo?.score && (
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold bg-white/50 px-2 py-1 rounded border border-black/5">
                    Confiabilidad de IA: {syllabusInfo.score}%
                  </span>
                </div>
              )}
              
              {syllabusInfo?.fecha_subida && (
                <p className="text-xs font-medium opacity-60">
                  Procesado el {new Date(syllabusInfo.fecha_subida).toLocaleDateString()}
                </p>
              )}

              {(syllabusInfo?.estado_verificacion === 'RECHAZADO' || syllabusInfo?.estado === 'RECHAZADO') && (
                <Button 
                  size="sm" 
                  onClick={() => {
                    setSyllabusExists(false);
                    setSyllabusInfo(null);
                  }}
                  className="mt-3 bg-red-600 hover:bg-red-700 text-white"
                >
                  Subir nuevo PDF
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white border border-amber-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold text-slate-800 text-lg mb-1">Sílabo No Disponible</p>
                <p className="text-slate-500">
                  Para que el asistente inteligente pueda ayudarte con este curso, necesitas subir el archivo PDF del sílabo oficial.
                </p>
              </div>
            </div>

            {/* Upload area */}
            {!uploading && !uploadProgress ? (
              <div>
                <label className="flex flex-col items-center justify-center w-full px-6 py-8 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 hover:border-indigo-400 transition-colors group">
                  <UploadCloud className="w-10 h-10 text-slate-400 group-hover:text-indigo-500 mb-3 transition-colors" />
                  <p className="font-semibold text-slate-700 mb-1">
                    {selectedFile ? selectedFile.name : 'Haz clic o arrastra un PDF aquí'}
                  </p>
                  <p className="text-xs text-slate-500 font-medium">
                    Máximo 20MB
                  </p>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>

                {error && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex gap-3 items-start">
                    <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                    <div>
                      <p className="font-semibold text-red-800 text-sm mb-1">Error al procesar archivo</p>
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                )}

                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={handleUploadSyllabus}
                    disabled={!selectedFile}
                    className="flex-1 bg-indigo-600"
                  >
                    Procesar e Ingestar Sílabo
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleSkipUpload}
                    className="flex-1"
                  >
                    Saltar este paso
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 p-6 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex justify-between text-sm font-semibold text-slate-700 mb-1">
                  <span>Procesando PDF con Inteligencia Artificial...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Próximos pasos y CTAs */}
      <div className="flex flex-col sm:flex-row gap-4 mt-10">
        <Button
          onClick={() => navigate('/cursos')}
          variant="outline"
          className="flex-1 bg-white flex items-center justify-center gap-2 py-3"
        >
          <ChevronLeft className="w-4 h-4" /> Volver al Catálogo
        </Button>
        <Button
          onClick={handleGoToChat}
          className="flex-1 bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center gap-2 py-3"
        >
          Consultar a Sylia <MessageSquare className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default EnrollmentSuccessPage;
