import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSyllabus } from '../../contexts/SyllabusContext';
import { useCourse } from '../../contexts/CourseContext';
import SearchableSelect from '../../components/ui/SearchableSelect';
import {
  Upload, FileText, ArrowLeft, BookOpen, Calendar, FileUp,
  CheckCircle2, AlertCircle, X, Loader2, FileCheck,
  Layers, Clock, GraduationCap
} from 'lucide-react';

const STEPS = [
  { id: 1, label: 'Curso y periodo', icon: BookOpen },
  { id: 2, label: 'Archivo PDF', icon: FileUp },
  { id: 3, label: 'Confirmar', icon: FileCheck },
];

export default function SyllabusUploadPage() {
  const navigate = useNavigate();
  const { uploadOfficialSyllabus, uploadStatus, clearUploadStatus } = useSyllabus();
  const { courses, periods, loading: courseLoading } = useCourse();

  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [selectedCiclo, setSelectedCiclo] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [currentStep, setCurrentStep] = useState(1);

  const ciclos = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

  const filteredCourses = selectedCiclo
    ? courses?.filter(c => c.ciclo_referencial === selectedCiclo || c.ciclo_referencial?.toUpperCase() === selectedCiclo.toUpperCase())
    : courses;

  const courseOptions = useMemo(() => {
    const list = filteredCourses?.map(c => ({
      value: c.id_curso,
      label: `${c.codigo_curso} — ${c.nombre_curso}`,
    })) || [];
    return [{ value: '', label: 'Seleccionar curso...' }, ...list];
  }, [filteredCourses]);

  const periodOptions = useMemo(() => {
    const list = periods?.map(p => ({
      value: p.id_periodo,
      label: p.nombre,
    })) || [];
    return [{ value: '', label: 'Seleccionar periodo...' }, ...list];
  }, [periods]);

  const selectedCourseObj = courses?.find(c => String(c.id_curso) === selectedCourse);
  const selectedPeriodObj = periods?.find(p => String(p.id_periodo) === selectedPeriod);

  // Auto-advance step
  useEffect(() => {
    if (selectedCourse && selectedPeriod) setCurrentStep(2);
    if (selectedFile && selectedCourse && selectedPeriod) setCurrentStep(3);
  }, [selectedCourse, selectedPeriod, selectedFile]);

  const handleCicloChange = (val) => {
    setSelectedCiclo(val);
    setSelectedCourse('');
  };

  const validateFile = (file) => {
    const maxSize = 20 * 1024 * 1024;
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
    if (file && validateFile(file)) setSelectedFile(file);
  };

  const handleDrag = (e) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file && validateFile(file)) setSelectedFile(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) { setValidationError('Selecciona un archivo'); return; }
    if (!selectedCourse) { setValidationError('Selecciona un curso'); return; }
    if (!selectedPeriod) { setValidationError('Selecciona un período'); return; }

    setUploading(true);
    const result = await uploadOfficialSyllabus(
      selectedFile,
      parseInt(selectedCourse),
      parseInt(selectedPeriod)
    );

    if (result.success) {
      setTimeout(() => {
        clearUploadStatus();
        navigate('/admin/silabos');
      }, 2500);
    }
    setUploading(false);
  };

  const StepIndicator = () => (
    <div className="flex items-center gap-2 mb-6">
      {STEPS.map((step, idx) => (
        <React.Fragment key={step.id}>
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
            currentStep >= step.id
              ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/30'
              : 'bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-800/80'
          }`}>
            <step.icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{step.label}</span>
          </div>
          {idx < STEPS.length - 1 && (
            <div className={`w-6 h-px transition-colors ${currentStep > step.id ? 'bg-blue-300 dark:bg-blue-800' : 'bg-slate-200 dark:bg-slate-800'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  const SummaryCard = () => (
    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30 rounded-xl p-4 mb-4">
      <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2">Resumen</p>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <BookOpen className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 shrink-0" />
          <span className="text-sm text-slate-700 dark:text-slate-300">
            <span className="font-semibold text-slate-900 dark:text-white">{selectedCourseObj?.codigo_curso}</span> — {selectedCourseObj?.nombre_curso}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 shrink-0" />
          <span className="text-sm text-slate-700 dark:text-slate-300">{selectedPeriodObj?.nombre}</span>
        </div>
        {selectedFile && (
          <div className="flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 shrink-0" />
            <span className="text-sm text-slate-700 dark:text-slate-300 truncate">{selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate('/admin/silabos')}
          className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a sílabos
        </button>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
          <Upload className="w-7 h-7 text-blue-600 dark:text-blue-400" />
          Subir Sílabo Oficial
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
          Carga el documento oficial del sílabo para sincronizar con estudiantes.
        </p>
      </div>

      {/* Step indicator */}
      <StepIndicator />

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Step 1: Course & Period */}
        <div className="bg-white dark:bg-[#131A2C] border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-card transition-colors duration-200">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 bg-blue-100 dark:bg-blue-950/30 rounded-lg flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">1. Curso y periodo académico</h2>
          </div>

          <div className="space-y-4">
            {/* Ciclo filter */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Filtrar por ciclo
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleCicloChange('')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    !selectedCiclo
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  Todos
                </button>
                {ciclos.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handleCicloChange(c)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      selectedCiclo === c
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <SearchableSelect
                label="Curso *"
                placeholder="Seleccionar curso..."
                searchPlaceholder="Buscar curso..."
                value={selectedCourse}
                onChange={setSelectedCourse}
                options={courseOptions}
                disabled={courseLoading}
              />
              <SearchableSelect
                label="Periodo académico *"
                placeholder="Seleccionar periodo..."
                searchPlaceholder="Buscar periodo..."
                value={selectedPeriod}
                onChange={setSelectedPeriod}
                options={periodOptions}
              />
            </div>
          </div>
        </div>

        {/* Step 2: File Upload */}
        <div className={`bg-white dark:bg-[#131A2C] border rounded-xl p-5 shadow-card transition-all duration-200 ${
          selectedCourse && selectedPeriod ? 'border-slate-200 dark:border-slate-800' : 'border-slate-205 dark:border-slate-800/60 opacity-60'
        }`}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 bg-blue-100 dark:bg-blue-950/30 rounded-lg flex items-center justify-center">
              <FileUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">2. Archivo PDF del sílabo</h2>
          </div>

          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
              dragActive
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/35'
                : selectedFile
                  ? 'border-emerald-350 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20'
                  : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-850 hover:border-slate-400 dark:hover:border-slate-600'
            }`}
          >
            <input
              type="file"
              id="file-input"
              onChange={handleFileSelect}
              accept=".pdf"
              className="hidden"
              disabled={uploading || !selectedCourse || !selectedPeriod}
            />

            {selectedFile ? (
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/40 rounded-xl flex items-center justify-center mb-3">
                  <FileText className="w-6 h-6 text-emerald-600 dark:text-emerald-450" />
                </div>
                <p className="text-sm font-bold text-slate-900 dark:text-white mb-1">{selectedFile.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • PDF
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  disabled={uploading}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                >
                  <X className="w-3 h-3" /> Cambiar archivo
                </button>
              </div>
            ) : (
              <label htmlFor="file-input" className="cursor-pointer flex flex-col items-center">
                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center mb-3 border border-slate-200 dark:border-slate-700">
                  <Upload className="w-6 h-6 text-slate-400 dark:text-slate-500" />
                </div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Arrastra aquí o haz clic para seleccionar
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-450">
                  Máximo 20MB • Solo archivos PDF
                </p>
              </label>
            )}
          </div>

          {!selectedCourse && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-slate-400" /> Selecciona un curso y periodo primero
            </p>
          )}
        </div>

        {/* Summary & Submit */}
        {selectedCourse && selectedPeriod && selectedFile && (
          <div className="bg-white dark:bg-[#131A2C] border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-card transition-colors duration-200">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 bg-blue-100 dark:bg-blue-950/30 rounded-lg flex items-center justify-center">
                <FileCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">3. Confirmar y subir</h2>
            </div>

            <SummaryCard />

            {/* Validation error */}
            {validationError && (
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-lg p-3 mb-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-300">{validationError}</p>
              </div>
            )}

            {/* Upload status */}
            {uploadStatus && (
              <div className={`rounded-lg p-4 mb-4 border ${
                uploadStatus.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30'
                  : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/30'
              }`}>
                {uploadStatus.loading && (
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 text-blue-500 dark:text-blue-400 animate-spin" />
                    <p className="text-sm text-blue-700 dark:text-blue-305 font-medium">{uploadStatus.message}</p>
                  </div>
                )}
                {uploadStatus.success && !uploadStatus.loading && (
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-emerald-800 dark:text-emerald-305">{uploadStatus.message}</p>
                      <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">
                        Score de confianza: <span className="font-bold">{uploadStatus.score}%</span>
                        {uploadStatus.contextos_sincronizados > 0 && (
                          <> • {uploadStatus.contextos_sincronizados} estudiantes sincronizados</>
                        )}
                      </p>
                    </div>
                  </div>
                )}
                {uploadStatus.error && !uploadStatus.loading && (
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-450 shrink-0" />
                    <p className="text-sm text-red-700 dark:text-red-350">{uploadStatus.message}</p>
                  </div>
                )}
              </div>
            )}

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => navigate('/admin/silabos')}
                disabled={uploading}
                className="px-5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 disabled:opacity-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={uploading}
                className="flex-1 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Procesando...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" /> Subir Sílabo Oficial
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </form>

      {/* Info */}
      <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 transition-colors duration-200">
        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Requisitos del documento</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { icon: FileText, text: 'Formato PDF únicamente' },
            { icon: Clock, text: 'Máximo 20 MB de tamaño' },
            { icon: FileCheck, text: 'Documento legible y estructurado' },
            { icon: GraduationCap, text: 'Contiene objetivos, metodología y evaluación' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-center shrink-0">
                <item.icon className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              </div>
              <span className="text-xs text-slate-600 dark:text-slate-350 font-medium">{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
