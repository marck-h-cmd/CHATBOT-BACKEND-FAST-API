import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSyllabus } from '../../contexts/SyllabusContext';
import { useCourse } from '../../contexts/CourseContext';
import Button from '../../components/ui/Button';
import { UploadCloud, FileText, CheckCircle2, AlertTriangle, ArrowLeft, Loader2, Info } from 'lucide-react';

export default function SyllabusUploadPage() {
  const navigate = useNavigate();
  const { uploadOfficialSyllabus, uploadStatus, clearUploadStatus } = useSyllabus();
  const { courses, periods, loading: courseLoading } = useCourse();

  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedCycle, setSelectedCycle] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [validationError, setValidationError] = useState('');

  const availableCycles = useMemo(() => {
    if (!courses) return [];
    const cycleSet = new Set(
      courses
        .map(c => c.ciclo_referencial)
        .filter(Boolean)
    );
    return Array.from(cycleSet).sort((a, b) => {
      const numA = parseInt(a) || 0;
      const numB = parseInt(b) || 0;
      return numA - numB;
    });
  }, [courses]);

  const filteredCourses = useMemo(() => {
    if (!courses) return [];
    if (!selectedCycle) return courses;
    return courses.filter(course => course.ciclo_referencial === selectedCycle);
  }, [courses, selectedCycle]);

  useEffect(() => {
    if (selectedCourse && selectedCycle) {
      const course = courses?.find(c => c.id_curso === parseInt(selectedCourse));
      if (course && course.ciclo_referencial !== selectedCycle) {
        setSelectedCourse('');
      }
    }
  }, [selectedCycle]);

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
      setValidationError('Selecciona un archivo PDF');
      return;
    }

    if (!selectedCourse || !selectedPeriod) {
      setValidationError('Selecciona un curso y un período académico');
      return;
    }

    setUploading(true);
    const result = await uploadOfficialSyllabus(
      selectedFile,
      parseInt(selectedCourse),
      parseInt(selectedPeriod)
    );

    if (result.success) {
      setSelectedFile(null);
      setSelectedCourse('');
      setSelectedPeriod('');
      setTimeout(() => {
        clearUploadStatus();
        navigate('/admin/silabos');
      }, 2500);
    }
    setUploading(false);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <button
        onClick={() => navigate('/admin/silabos')}
        className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-medium mb-6 group transition-colors"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Volver al repositorio
      </button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Subir Sílabo Oficial</h1>
        <p className="text-slate-500 mt-2 text-lg">
          Carga el documento oficial. Una vez procesado, Sylia lo usará de inmediato para responder consultas de los estudiantes.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="cycle" className="block text-sm font-semibold text-slate-700 mb-2">
                Filtrar por Ciclo (Opcional)
              </label>
              <select
                id="cycle"
                value={selectedCycle}
                onChange={(e) => setSelectedCycle(e.target.value)}
                disabled={courseLoading}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm bg-white"
              >
                <option value="">{courseLoading ? 'Cargando ciclos...' : 'Todos los ciclos'}</option>
                {availableCycles.map((cycle) => (
                  <option key={cycle} value={cycle}>Ciclo {cycle}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="course" className="block text-sm font-semibold text-slate-700 mb-2">
                Curso <span className="text-red-500">*</span>
              </label>
              <select
                id="course"
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                disabled={courseLoading}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm bg-white"
              >
                <option value="">{courseLoading ? 'Cargando...' : 'Selecciona un curso'}</option>
                {filteredCourses?.map((course) => (
                  <option key={course.id_curso} value={course.id_curso}>
                    {course.codigo_curso} - {course.nombre_curso}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="period" className="block text-sm font-semibold text-slate-700 mb-2">
              Período Académico Vigente <span className="text-red-500">*</span>
            </label>
            <select
              id="period"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm bg-white"
            >
              <option value="">Selecciona el período</option>
              {periods?.map((period) => (
                <option key={period.id_periodo} value={period.id_periodo}>
                  {period.nombre} {period.es_actual ? '(Actual)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Carga de archivo (Dropzone) */}
          <div className="pt-2">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Documento PDF <span className="text-red-500">*</span>
            </label>

            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center transition-colors relative overflow-hidden ${
                dragActive
                  ? 'border-indigo-500 bg-indigo-50'
                  : selectedFile 
                    ? 'border-emerald-300 bg-emerald-50' 
                    : 'border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-indigo-400'
              }`}
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
                <div className="text-center z-10">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mx-auto mb-4">
                    <FileText className="w-8 h-8 text-emerald-600" />
                  </div>
                  <p className="text-lg font-bold text-emerald-900 truncate max-w-sm">{selectedFile.name}</p>
                  <p className="text-emerald-700 font-medium mt-1">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    disabled={uploading}
                    className="mt-4 text-sm font-semibold text-slate-500 hover:text-slate-800 bg-white px-4 py-2 rounded-lg border border-slate-200 transition-colors"
                  >
                    Elegir otro archivo
                  </button>
                </div>
              ) : (
                <label htmlFor="file-input" className="cursor-pointer text-center flex flex-col items-center w-full z-10">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                    <UploadCloud className="w-8 h-8 text-indigo-500 group-hover:scale-110 transition-transform" />
                  </div>
                  <p className="text-lg font-bold text-slate-700">Arrastra tu PDF aquí o haz clic</p>
                  <p className="text-slate-500 font-medium mt-2">Formatos válidos: solo PDF (Máx. 20MB)</p>
                </label>
              )}
            </div>
          </div>

          {validationError && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 font-medium text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <p>{validationError}</p>
            </div>
          )}

          {uploadStatus && (
            <div className={`p-5 rounded-xl border flex items-start gap-4 ${
              uploadStatus.success ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
            }`}>
              {uploadStatus.loading ? (
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600 shrink-0" />
              ) : uploadStatus.success ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" />
              )}
              
              <div className="w-full">
                {uploadStatus.loading ? (
                  <p className="font-bold text-indigo-900">{uploadStatus.message}</p>
                ) : uploadStatus.success ? (
                  <>
                    <p className="font-bold text-emerald-900 mb-1">{uploadStatus.message}</p>
                    <div className="text-sm font-medium text-emerald-800 space-y-1">
                      <p>Confianza IA: <span className="font-bold text-emerald-900">{uploadStatus.score}%</span></p>
                      <p>Sincronizado con {uploadStatus.contextos_sincronizados} estudiantes</p>
                    </div>
                  </>
                ) : (
                  <p className="font-bold text-red-900">{uploadStatus.message}</p>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-4 pt-6 border-t border-slate-100">
            <Button
              variant="outline"
              type="button"
              onClick={() => navigate('/admin/silabos')}
              disabled={uploading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={uploading || !selectedFile}
              className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[200px] flex items-center justify-center gap-2"
            >
              {uploading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Procesando con IA...</>
              ) : (
                <><UploadCloud className="w-5 h-5" /> Confirmar y Subir</>
              )}
            </Button>
          </div>
        </form>
      </div>

      <div className="mt-8 bg-slate-100/50 rounded-2xl p-6 border border-slate-200 flex gap-4">
        <Info className="w-6 h-6 text-indigo-500 shrink-0" />
        <div>
          <h3 className="font-bold text-slate-800 mb-2">Importante sobre los Sílabos Oficiales</h3>
          <p className="text-sm text-slate-600 font-medium">
            Al subir un sílabo desde este panel, se asume que el documento es legítimo y validado por la institución. A diferencia de las subidas de alumnos, estos PDFs ingresarán directamente a la base de conocimiento vectorial de Sylia sin pasar por revisión de pendientes.
          </p>
        </div>
      </div>
    </div>
  );
}
