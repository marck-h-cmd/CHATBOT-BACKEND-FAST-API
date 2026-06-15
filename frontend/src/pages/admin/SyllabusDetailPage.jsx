import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSyllabus } from '../../contexts/SyllabusContext';
import {
  getSilaboChunks,
  updateSilaboChunk,
  updateSilaboReglasJson,
  regenerarChunksSilabo,
} from '../../api/syllabus';

// ─── Small helpers ────────────────────────────────────────────────────────────
const TABS = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'chunks', label: 'Chunks RAG' },
  { id: 'reglas', label: 'Reglas / JSON' },
  { id: 'texto', label: 'Texto Extraído' },
];

function Badge({ children, color = 'slate' }) {
  const map = {
    green: 'bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-900/40',
    yellow: 'bg-yellow-100 dark:bg-yellow-950/30 text-yellow-800 dark:text-yellow-400 border-yellow-200 dark:border-yellow-900/40',
    red: 'bg-red-100 dark:bg-red-950/30 text-red-800 dark:text-red-400 border-red-200 dark:border-red-900/40',
    blue: 'bg-blue-100 dark:bg-blue-950/30 text-blue-800 dark:text-blue-400 border-blue-200 dark:border-blue-900/40',
    purple: 'bg-purple-100 dark:bg-purple-950/30 text-purple-800 dark:text-purple-400 border-purple-200 dark:border-purple-900/40',
    slate: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${map[color] || map.slate}`}>
      {children}
    </span>
  );
}

function InfoRow({ label, children }) {
  return (
    <div className="flex justify-between items-start py-3 border-b border-slate-100 dark:border-slate-800/80 last:border-0">
      <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mr-4 mt-0.5 shrink-0">{label}</span>
      <span className="text-sm text-slate-800 dark:text-slate-200 font-medium text-right">{children}</span>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" />
    </div>
  );
}

// ─── Chunk Edit Card ──────────────────────────────────────────────────────────
function ChunkCard({ chunk, silaboId, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [titulo, setTitulo] = useState(chunk.titulo || '');
  const [contenido, setContenido] = useState(chunk.contenido || '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const tipoColors = {
    SUMILLA: 'blue',
    COMPETENCIAS: 'purple',
    CONTENIDOS: 'green',
    EVALUACION: 'yellow',
    TUTORIA: 'slate',
  };
  const color = tipoColors[chunk.tipo_seccion] || 'slate';

  const handleSave = async () => {
    setSaving(true);
    setMsg(null);
    try {
      await updateSilaboChunk(silaboId, chunk.id_chunk, { titulo, contenido });
      setMsg({ type: 'ok', text: 'Guardado ✓' });
      setEditing(false);
      onSaved?.();
    } catch (e) {
      setMsg({ type: 'err', text: 'Error al guardar: ' + (e?.response?.data?.detail || e.message) });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setTitulo(chunk.titulo || '');
    setContenido(chunk.contenido || '');
    setEditing(false);
    setMsg(null);
  };

  return (
    <div className="bg-white dark:bg-[#131A2C] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge color={color}>{chunk.tipo_seccion}</Badge>
          {chunk.metadata_json?.unidad && (
            <Badge color="slate">{chunk.metadata_json.unidad}</Badge>
          )}
          {chunk.metadata_json?.tiene_sesiones === false && (
            <Badge color="red">⚠ Sin sesiones</Badge>
          )}
        </div>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60 hover:bg-blue-100 dark:hover:bg-blue-900/40 font-semibold transition-colors"
          >
            Editar
          </button>
        )}
      </div>

      {/* Title */}
      {editing ? (
        <input
          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={titulo}
          onChange={e => setTitulo(e.target.value)}
          placeholder="Título del chunk"
        />
      ) : (
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">{chunk.titulo || '(sin título)'}</h3>
      )}

      {/* Content */}
      {editing ? (
        <textarea
          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
          rows={10}
          value={contenido}
          onChange={e => setContenido(e.target.value)}
        />
      ) : (
        <pre className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap break-words font-mono bg-slate-50 dark:bg-slate-900/60 rounded-lg p-3 max-h-48 overflow-y-auto">
          {chunk.contenido}
        </pre>
      )}

      {/* Actions */}
      {editing && (
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors disabled:opacity-60"
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
          <button
            onClick={handleCancel}
            disabled={saving}
            className="px-4 py-1.5 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-semibold transition-colors"
          >
            Cancelar
          </button>
          {msg && (
            <span className={`text-xs font-semibold ${msg.type === 'ok' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
              {msg.text}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SyllabusDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getSyllabusDetail, syllabusDetail, loading } = useSyllabus();

  const [activeTab, setActiveTab] = useState('resumen');
  const [chunks, setChunks] = useState([]);
  const [chunksLoading, setChunksLoading] = useState(false);
  const [chunksError, setChunksError] = useState(null);

  const [reglasText, setReglasText] = useState('');
  const [reglasSaving, setReglasSaving] = useState(false);
  const [reglasMsg, setReglasMsg] = useState(null);
  const [reglasJsonError, setReglasJsonError] = useState(null);

  const [regenerating, setRegenerating] = useState(false);
  const [regenMsg, setRegenMsg] = useState(null);

  const silaboId = parseInt(id);

  useEffect(() => {
    if (id) getSyllabusDetail(silaboId);
  }, [id]);

  useEffect(() => {
    if (syllabusDetail?.reglas_json) {
      setReglasText(JSON.stringify(syllabusDetail.reglas_json, null, 2));
    }
  }, [syllabusDetail]);

  const loadChunks = useCallback(async () => {
    setChunksLoading(true);
    setChunksError(null);
    try {
      const data = await getSilaboChunks(silaboId);
      setChunks(data);
    } catch (e) {
      setChunksError('No se pudieron cargar los chunks: ' + (e?.response?.data?.detail || e.message));
    } finally {
      setChunksLoading(false);
    }
  }, [silaboId]);

  useEffect(() => {
    if (activeTab === 'chunks') loadChunks();
  }, [activeTab, loadChunks]);

  const handleRegenerarChunks = async () => {
    if (!window.confirm('¿Regenerar todos los chunks? Esto eliminará y recreará el contenido RAG del sílabo.')) return;
    setRegenerating(true);
    setRegenMsg(null);
    try {
      const res = await regenerarChunksSilabo(silaboId);
      setRegenMsg({ type: 'ok', text: `✓ ${res.chunks_creados} chunks regenerados` });
      if (activeTab === 'chunks') await loadChunks();
    } catch (e) {
      setRegenMsg({ type: 'err', text: 'Error: ' + (e?.response?.data?.detail || e.message) });
    } finally {
      setRegenerating(false);
    }
  };

  const handleSaveReglas = async () => {
    setReglasJsonError(null);
    let parsed;
    try {
      parsed = JSON.parse(reglasText);
    } catch {
      setReglasJsonError('JSON inválido. Corrija los errores antes de guardar.');
      return;
    }
    setReglasSaving(true);
    setReglasMsg(null);
    try {
      await updateSilaboReglasJson(silaboId, parsed);
      setReglasMsg({ type: 'ok', text: 'Reglas guardadas ✓' });
    } catch (e) {
      setReglasMsg({ type: 'err', text: 'Error al guardar: ' + (e?.response?.data?.detail || e.message) });
    } finally {
      setReglasSaving(false);
    }
  };

  // ── Formatting helpers ────────────────────────────────────────────────────
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const estadoColor = { APROBADO: 'green', PENDIENTE_CONFIRMACION: 'yellow', RECHAZADO: 'red' };
  const ambitoColor = { PUBLICADO: 'blue', COMPARTIBLE: 'purple', PRIVADO: 'slate' };

  // ── Loading / not found ───────────────────────────────────────────────────
  if (loading && !syllabusDetail) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F19] flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!syllabusDetail) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F19] p-6">
        <div className="max-w-4xl mx-auto">
          <button onClick={() => navigate('/admin/silabos')} className="text-blue-600 dark:text-blue-400 hover:underline mb-6 font-semibold">
            ← Volver
          </button>
          <div className="bg-white dark:bg-[#131A2C] border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center">
            <p className="text-slate-500 dark:text-slate-400">Sílabo no encontrado</p>
          </div>
        </div>
      </div>
    );
  }

  const hasIncidents = syllabusDetail.incidentes?.length > 0;
  const activeIncidents = syllabusDetail.incidentes?.filter(i => i.estado === 'ACTIVO') || [];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F19] transition-colors duration-200">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">

        {/* Breadcrumb */}
        <div>
          <button
            onClick={() => navigate('/admin/silabos')}
            className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1.5 text-sm font-semibold mb-3"
          >
            ← Volver a Sílabos
          </button>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{syllabusDetail.nombre_curso}</h1>
              <p className="text-slate-500 dark:text-slate-400 font-mono text-sm mt-1">{syllabusDetail.codigo_curso} · {syllabusDetail.periodo}</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Badge color={estadoColor[syllabusDetail.estado_validacion] || 'slate'}>
                {syllabusDetail.estado_validacion?.replace('_', ' ')}
              </Badge>
              <Badge color={ambitoColor[syllabusDetail.ambito_uso] || 'slate'}>
                {syllabusDetail.ambito_uso}
              </Badge>
            </div>
          </div>
        </div>

        {/* Incident Banner */}
        {activeIncidents.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-800/60 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <span className="text-xl">⚠️</span>
              <div>
                <p className="font-bold text-amber-900 dark:text-amber-300 text-sm">
                  {activeIncidents.length} incidente{activeIncidents.length > 1 ? 's' : ''} activo{activeIncidents.length > 1 ? 's' : ''}
                </p>
                <ul className="mt-1 space-y-1">
                  {activeIncidents.map(inc => (
                    <li key={inc.id_incidente_servicio} className="text-xs text-amber-800 dark:text-amber-400">
                      <span className="font-semibold">[{inc.tipo_incidente}]</span> {inc.descripcion}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">

          {/* Left: tabbed content */}
          <div className="lg:col-span-3 space-y-4">

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-900/60 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all duration-150 ${
                    activeTab === tab.id
                      ? 'bg-white dark:bg-[#131A2C] text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-slate-700'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                  {tab.id === 'chunks' && chunks.length > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded text-[10px] font-bold">
                      {chunks.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab: Resumen */}
            {activeTab === 'resumen' && (
              <div className="space-y-4">
                <div className="bg-white dark:bg-[#131A2C] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white mb-3">Información Básica</h2>
                  <InfoRow label="Archivo">{syllabusDetail.nombre_archivo}</InfoRow>
                  <InfoRow label="Período">{syllabusDetail.periodo}</InfoRow>
                  <InfoRow label="Tipo">{syllabusDetail.tipo_silabo?.replace('_', ' ').toLowerCase()}</InfoRow>
                  <InfoRow label="Fecha Carga">{formatDate(syllabusDetail.fecha_subida)}</InfoRow>
                  <InfoRow label="Coincidencia Período">
                    <Badge color={syllabusDetail.coincidencia_periodo ? 'green' : 'red'}>
                      {syllabusDetail.coincidencia_periodo ? '✓ Sí' : '✗ No'}
                    </Badge>
                  </InfoRow>
                </div>

                <div className="bg-white dark:bg-[#131A2C] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white mb-3">Confianza y Estado</h2>
                  <InfoRow label="Estado de Validación">
                    <Badge color={estadoColor[syllabusDetail.estado_validacion] || 'slate'}>
                      {syllabusDetail.estado_validacion?.replace('_', ' ')}
                    </Badge>
                  </InfoRow>
                  <InfoRow label="Ámbito">
                    <Badge color={ambitoColor[syllabusDetail.ambito_uso] || 'slate'}>
                      {syllabusDetail.ambito_uso}
                    </Badge>
                  </InfoRow>
                  <div className="py-3 border-b border-slate-100 dark:border-slate-800/80 last:border-0">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Puntaje de Confianza</span>
                      <span className="font-bold text-slate-900 dark:text-white text-sm">{syllabusDetail.score}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${syllabusDetail.score >= 70 ? 'bg-emerald-500' : syllabusDetail.score >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${syllabusDetail.score}%` }}
                      />
                    </div>
                  </div>
                  <InfoRow label="Estudiantes Asignados">
                    <span className="text-xl font-bold text-blue-600 dark:text-blue-400">{syllabusDetail.estudiantes_asignados || 0}</span>
                  </InfoRow>
                </div>

                <div className="bg-white dark:bg-[#131A2C] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white mb-3">Subido Por</h2>
                  <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 p-3.5 rounded-xl">
                    <p className="text-slate-900 dark:text-slate-100 font-semibold text-sm">{syllabusDetail.subido_por?.nombre || '—'}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{syllabusDetail.subido_por?.email}</p>
                  </div>
                </div>

                {syllabusDetail.observaciones_validacion && (
                  <div className="bg-white dark:bg-[#131A2C] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white mb-3">Observaciones</h2>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{syllabusDetail.observaciones_validacion}</p>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Chunks RAG */}
            {activeTab === 'chunks' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Chunks RAG
                    {chunks.length > 0 && <span className="ml-2 text-slate-400 font-normal text-sm">({chunks.length} chunks)</span>}
                  </h2>
                  <button
                    onClick={loadChunks}
                    className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-semibold transition-colors"
                  >
                    ↺ Recargar
                  </button>
                </div>
                {chunksLoading ? <Spinner /> : chunksError ? (
                  <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-xl p-4 text-sm text-red-700 dark:text-red-400">
                    {chunksError}
                  </div>
                ) : chunks.length === 0 ? (
                  <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center text-slate-400 dark:text-slate-500">
                    <p className="text-3xl mb-2">📦</p>
                    <p className="font-semibold">Sin chunks generados</p>
                    <p className="text-xs mt-1">Usa "Regenerar Chunks" en el panel lateral.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {chunks.map(chunk => (
                      <ChunkCard
                        key={chunk.id_chunk}
                        chunk={chunk}
                        silaboId={silaboId}
                        onSaved={loadChunks}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab: Reglas JSON */}
            {activeTab === 'reglas' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Reglas / Estructura JSON</h2>
                  <div className="flex items-center gap-2">
                    {reglasMsg && (
                      <span className={`text-xs font-semibold ${reglasMsg.type === 'ok' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                        {reglasMsg.text}
                      </span>
                    )}
                    <button
                      onClick={handleSaveReglas}
                      disabled={reglasSaving}
                      className="px-4 py-1.5 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors disabled:opacity-60"
                    >
                      {reglasSaving ? 'Guardando…' : 'Guardar JSON'}
                    </button>
                  </div>
                </div>
                {reglasJsonError && (
                  <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-xl p-3 text-xs text-red-700 dark:text-red-400 font-mono">
                    {reglasJsonError}
                  </div>
                )}
                <div className="bg-white dark:bg-[#131A2C] border border-slate-200 dark:border-slate-800 rounded-2xl p-1 overflow-hidden">
                  <textarea
                    className="w-full bg-slate-950 dark:bg-slate-950 text-green-400 font-mono text-xs p-4 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[520px]"
                    value={reglasText}
                    onChange={e => { setReglasText(e.target.value); setReglasJsonError(null); setReglasMsg(null); }}
                    spellCheck={false}
                  />
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  ⚠ Guardar el JSON no regenera los chunks automáticamente. Usa "Regenerar Chunks" después.
                </p>
              </div>
            )}

            {/* Tab: Texto Extraído */}
            {activeTab === 'texto' && (
              <div className="space-y-4">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Texto Extraído del PDF</h2>
                {syllabusDetail.texto_extraido ? (
                  <div className="bg-white dark:bg-[#131A2C] border border-slate-200 dark:border-slate-800 rounded-2xl p-1 overflow-hidden">
                    <pre className="bg-slate-50 dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-300 font-mono whitespace-pre-wrap break-words p-4 rounded-xl max-h-[600px] overflow-y-auto">
                      {syllabusDetail.texto_extraido}
                    </pre>
                  </div>
                ) : (
                  <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center text-slate-400">
                    Sin texto extraído
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Sidebar */}
          <div className="space-y-4">

            {/* Quick stats */}
            <div className="bg-white dark:bg-[#131A2C] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Resumen</h3>
              <div className="text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">ID</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">{syllabusDetail.id_silabo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Código</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">{syllabusDetail.codigo_curso}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Estudiantes</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">{syllabusDetail.estudiantes_asignados || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Incidentes</span>
                  <Badge color={activeIncidents.length > 0 ? 'red' : 'green'}>
                    {activeIncidents.length > 0 ? `${activeIncidents.length} activo${activeIncidents.length > 1 ? 's' : ''}` : '0 activos'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white dark:bg-[#131A2C] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Acciones</h3>

              <button
                onClick={() => navigate('/admin/silabos')}
                className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm"
              >
                ← Volver a Lista
              </button>

              <button
                onClick={() => { setActiveTab('chunks'); loadChunks(); }}
                className="w-full px-4 py-2.5 bg-blue-50 dark:bg-blue-950/20 text-blue-800 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60 rounded-xl font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors text-sm"
              >
                ✏️ Editar Chunks RAG
              </button>

              <button
                onClick={() => setActiveTab('reglas')}
                className="w-full px-4 py-2.5 bg-purple-50 dark:bg-purple-950/20 text-purple-800 dark:text-purple-400 border border-purple-200 dark:border-purple-800/60 rounded-xl font-semibold hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors text-sm"
              >
                ⚙️ Editar Reglas JSON
              </button>

              <button
                onClick={handleRegenerarChunks}
                disabled={regenerating}
                className="w-full px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 rounded-xl font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors text-sm disabled:opacity-60"
              >
                {regenerating ? '⏳ Regenerando…' : '🔄 Regenerar Chunks'}
              </button>

              {regenMsg && (
                <p className={`text-xs font-semibold text-center px-2 ${regenMsg.type === 'ok' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                  {regenMsg.text}
                </p>
              )}
            </div>

            {/* System info */}
            <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-150 dark:border-slate-800 rounded-xl p-4 text-xs text-slate-500 dark:text-slate-400 space-y-1.5">
              <p className="font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider text-[10px] mb-2">Sistema</p>
              <p>ID Período: {syllabusDetail.id_periodo}</p>
              <p>ID Curso: {syllabusDetail.id_curso}</p>
              <p>ID Sílabo: {syllabusDetail.id_silabo}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
