import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSyllabus } from '../../contexts/SyllabusContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Button from '../../components/ui/Button';
import { ArrowLeft, FileText, CheckCircle2, ShieldAlert, Users, Calendar, AlertTriangle, XCircle, ChevronRight, Lock, Unlock } from 'lucide-react';

export default function SyllabusDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getSyllabusDetail, syllabusDetail, loading } = useSyllabus();

  useEffect(() => {
    if (id) {
      getSyllabusDetail(parseInt(id));
    }
  }, [id]);

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!syllabusDetail) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Documento no encontrado</h2>
        <p className="text-slate-500 mb-6">El sílabo que intentas inspeccionar no existe o ha sido eliminado.</p>
        <Button onClick={() => navigate('/admin/silabos')} variant="outline">
          Volver al repositorio
        </Button>
      </div>
    );
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const getEstadoBadge = (estado) => {
    if (estado === 'APROBADO') return <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4"/> Aprobado</span>;
    if (estado === 'RECHAZADO') return <span className="px-3 py-1 bg-red-50 text-red-700 border border-red-200 rounded-full text-xs font-bold flex items-center gap-1.5"><XCircle className="w-4 h-4"/> Rechazado</span>;
    return <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-bold flex items-center gap-1.5"><AlertTriangle className="w-4 h-4"/> Pendiente</span>;
  };

  const getAmbitoBadge = (ambito) => {
    if (ambito === 'PUBLICADO') return <span className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-xs font-bold flex items-center gap-1.5"><Unlock className="w-3.5 h-3.5"/> Público</span>;
    return <span className="px-3 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-full text-xs font-bold flex items-center gap-1.5"><Lock className="w-3.5 h-3.5"/> Privado</span>;
  };

  return (
    <div className="max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/admin/silabos')}
          className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-medium mb-4 group transition-colors"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Volver al repositorio
        </button>
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono text-sm font-bold bg-slate-200 text-slate-700 px-3 py-1 rounded-lg border border-slate-300">
                {syllabusDetail.codigo_curso}
              </span>
              {getEstadoBadge(syllabusDetail.estado_validacion)}
              {getAmbitoBadge(syllabusDetail.ambito_uso)}
            </div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{syllabusDetail.nombre_curso}</h1>
            <p className="text-slate-500 font-medium mt-1">ID Sílabo: {syllabusDetail.id_silabo} • Subido el {formatDate(syllabusDetail.fecha_subida)}</p>
          </div>
          
          <div className="flex items-center gap-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm shrink-0">
            <div className="text-center px-4 border-r border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Score IA</p>
              <p className={`text-2xl font-bold ${syllabusDetail.score >= 70 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {syllabusDetail.score}%
              </p>
            </div>
            <div className="text-center px-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Estudiantes</p>
              <p className="text-2xl font-bold text-indigo-600 flex items-center justify-center gap-1.5">
                <Users className="w-5 h-5" /> {syllabusDetail.estudiantes_asignados || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Meta */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" /> Metadatos
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Archivo Original</p>
                <p className="font-medium text-slate-800 break-all">{syllabusDetail.nombre_archivo}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Período Académico</p>
                <p className="font-medium text-slate-800 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-slate-400" /> {syllabusDetail.periodo}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Cargado Por</p>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="font-semibold text-slate-800">{syllabusDetail.subido_por?.nombre || 'Sistema Admin'}</p>
                  <p className="text-sm text-slate-500">{syllabusDetail.subido_por?.email || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-indigo-600" /> Diagnóstico RAG
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Validación de Período</p>
                {syllabusDetail.coincidencia_periodo ? (
                  <span className="text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md inline-flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Coincide
                  </span>
                ) : (
                  <span className="text-sm font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md inline-flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" /> Desajuste
                  </span>
                )}
              </div>
              {syllabusDetail.observaciones_validacion && (
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Observaciones</p>
                  <p className="text-sm text-slate-700 bg-amber-50 p-3 rounded-xl border border-amber-100 font-medium">
                    {syllabusDetail.observaciones_validacion}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Data */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 overflow-hidden flex flex-col h-[500px]">
            <div className="bg-slate-800 px-6 py-4 border-b border-slate-700 flex justify-between items-center shrink-0">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Estructura JSON (Base Vectorial)
              </h2>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded border border-emerald-400/20">
                formulas_detectadas
              </span>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              {syllabusDetail.reglas_json ? (
                <pre className="text-sm text-emerald-300 font-mono whitespace-pre-wrap break-words leading-relaxed">
                  {JSON.stringify(syllabusDetail.reglas_json, null, 2)}
                </pre>
              ) : (
                <p className="text-slate-500 italic">No hay estructuras JSON detectadas.</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[500px]">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 shrink-0">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                Texto Crudo Extraído (Chunks)
              </h2>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              {syllabusDetail.texto_extraido ? (
                <div className="text-sm text-slate-600 font-mono whitespace-pre-wrap break-words leading-relaxed selection:bg-indigo-100 selection:text-indigo-900">
                  {syllabusDetail.texto_extraido}
                </div>
              ) : (
                <p className="text-slate-400 italic">Texto no disponible.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
