import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { listProjects, listRecords, llmProcess, startTtsAll, checkTtsStatus, getTtsStatusRows, startLlm, checkLlmStatus, getLlmStatusRows } from "./api";
import { deleteProject } from "./api";
import Uploader from "./components/Uploader";
import RecordCard from "./components/RecordCard";
import Toast from "./components/Toast";
import LanguageConfigModal from "./components/LanguageConfigModal";
import PromptModal from "./components/PromptModal";
import NewProjectModal from "./components/NewProjectModal";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function App() {
  const [projects, setProjects] = useState([]);
  const [selected, setSelected] = useState(null); // project_id
  const [records, setRecords] = useState([]);
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyAction, setBusyAction] = useState(null);
  const [processedCount, setProcessedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [showLog, setShowLog] = useState(false);
  const [statusRows, setStatusRows] = useState([]);
  const [showLangModal, setShowLangModal] = useState(false);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [projectPrompt, setProjectPrompt] = useState("");
  const [showNewProject, setShowNewProject] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const ttsIntervalRef = useRef(null);

  const selectedProject = useMemo(() => projects.find((p) => p.id === selected) || null, [projects, selected]);

  const fetchProjects = useCallback(async () => {
    const res = await listProjects();
    setProjects(res.data);
  }, []);

  const fetchRecords = useCallback(async (project_id) => {
    if (!project_id) return;
    const res = await listRecords(project_id);
    setRecords(res.data);
  }, []);

  const onDeleteProject = async () => {
    // attempt delete
    setBusy(true);
    try {
      // clear any ongoing TTS polling to avoid races
      if (ttsIntervalRef.current) {
        clearInterval(ttsIntervalRef.current);
        ttsIntervalRef.current = null;
      }
      await deleteProject(selected);
      notify("Proyecto eliminado");
      setSelected(null);
      await fetchProjects();
    } catch (e) {
      console.error("Error deleting project", e);
      notify("Error eliminando proyecto", "error");
    } finally {
      setBusy(false);
      setShowDeleteModal(false);
      setDeleteText("");
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    if (selected) fetchRecords(selected);
  }, [selected, fetchRecords]);

  // Load project-level prompt when a project is selected
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!selected) return;
      try {
        const res = await (await import("./api")).getProjectInfo(selected);
        if (!mounted) return;
        const d = res.data || {};
        setProjectPrompt(d.project_prompt || d.projectPrompt || "");
      } catch (e) {
        console.warn("No project info", e);
        setProjectPrompt("");
      }
    };
    load();
    return () => (mounted = false);
  }, [selected]);

  // Auto-hide the processing log after a short delay so it doesn't stay permanently visible
  useEffect(() => {
    if (!showLog) return;
    const t = setTimeout(() => setShowLog(false), 8000); // hide after 8s
    return () => clearTimeout(t);
  }, [showLog]);

  const notify = (t, type) => {
    setToast(t);
    setTimeout(() => setToast(""), 2200);
  };

  const stopPolling = (finalProcessed = null, finalTotal = null) => {
    if (ttsIntervalRef.current) {
      clearInterval(ttsIntervalRef.current);
      ttsIntervalRef.current = null;
    }
    if (finalProcessed !== null) setProcessedCount(finalProcessed);
    if (finalTotal !== null) setTotalCount(finalTotal);
    setBusy(false);
    setBusyAction(null);
  };

  const runLLM = async () => {
    // Abrir modal para pedir prompt al usuario
    setShowPromptModal(true);
  };

  const onConfirmPrompt = async (text, language, accent) => {
    // text es el prompt que el usuario escribió
    setShowPromptModal(false);
    // Start LLM processing in background and poll status similar to TTS
    setBusy(true);
    setBusyAction("llm");
    try {
      // clear any previous interval before starting
      if (ttsIntervalRef.current) {
        clearInterval(ttsIntervalRef.current);
        ttsIntervalRef.current = null;
      }
      await startLlm(selected, { overwrite_texts: true, overwrite_prompts: true, project_prompt: text });
      setProcessedCount(0);
      setTotalCount(0);
      const poll = async () => {
        try {
          const res = await checkLlmStatus(selected);
          const { processed, total } = res.data;
          setProcessedCount(processed);
          setTotalCount(total);
          if (total === 0 || processed >= total) {
            // set final values and stop polling reliably
            stopPolling(processed, total);
            notify("Textos y entonaciones generadas");
            try {
              const res2 = await getLlmStatusRows(selected);
              setStatusRows(res2.data.rows || []);
              setShowLog(true);
            } catch (e) {
              console.error("Error fetching LLM status rows", e);
            }
            fetchRecords(selected);
          }
        } catch (err) {
          console.error("Error consultando estado LLM", err);
        }
      };
      const interval = setInterval(poll, 2000);
      ttsIntervalRef.current = interval;
      poll();
    } catch (e) {
      console.error(e);
      notify("Error procesando con LLM", "error");
      setBusy(false);
      setBusyAction(null);
    }
  };

  const genAll = async () => {
    setBusy(true);
    setBusyAction("tts");
    try {
      // clear any previous interval before starting
      if (ttsIntervalRef.current) {
        clearInterval(ttsIntervalRef.current);
        ttsIntervalRef.current = null;
      }
      await startTtsAll(selected);
      setProcessedCount(0);
      setTotalCount(0);
      const poll = async () => {
        try {
          const res = await checkTtsStatus(selected);
          const { processed, total } = res.data;
          setProcessedCount(processed);
          setTotalCount(total);
          if (total === 0 || processed >= total) {
            stopPolling(processed, total);
            notify("Audios generados");
            try {
              const res2 = await getTtsStatusRows(selected);
              setStatusRows(res2.data.rows || []);
              setShowLog(true);
            } catch (e) {
              console.error("Error fetching status rows", e);
            }
            fetchRecords(selected);
          }
        } catch (err) {
          console.error("Error consultando estado TTS", err);
        }
      };
      const interval = setInterval(poll, 2000);
      ttsIntervalRef.current = interval;
      poll();
    } catch (e) {
      console.error(e);
      notify("Error generando audios", "error");
      setBusy(false);
      setBusyAction(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="max-w-6xl mx-auto p-4">
        <header className="flex items-center justify-between py-4">
          <h1 className="text-2xl font-bold">🎙️ Entona - Entrevista → CSV → TTS</h1>
        </header>

        {/* Tabla de proyectos solo si no hay proyecto seleccionado */}
        {!selected && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Proyectos</h2>
              <div>
                <button onClick={() => setShowNewProject(true)} className="px-3 py-2 rounded-2xl bg-emerald-600 text-white">
                  ➕ Nuevo proyecto
                </button>
              </div>
            </div>
            <table className="w-full bg-white rounded-xl shadow">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 text-left">ID</th>
                  <th className="p-2 text-left">Título</th>
                  <th className="p-2 text-left">Descripción</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={p.id}>
                    <td className="p-2">
                      <button className="text-indigo-700 underline" onClick={() => setSelected(p.id)}>
                        {p.id}
                      </button>
                    </td>
                    <td className="p-2">{p.title?.trim() || ""}</td>
                    <td className="p-2">{p.desc?.trim() || ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showNewProject && (
          <NewProjectModal
            open={showNewProject}
            onClose={() => setShowNewProject(false)}
            onCreated={async (project_id) => {
              // refresh projects and auto-select the newly created project
              try {
                await fetchProjects();
                if (project_id) setSelected(project_id);
                setShowNewProject(false);
                notify("Proyecto creado");
              } catch (e) {
                console.error(e);
              }
            }}
          />
        )}

        {/* Uploader y acciones solo si hay proyecto seleccionado */}
        {selected && (
          <>
            {/* Header del proyecto: título y descripción */}
            <div className="flex gap-2 mb-4">
              <button className="px-4 py-2 rounded-2xl bg-gray-300 text-gray-800 hover:bg-gray-400" onClick={() => setSelected(null)}>
                ← Volver a proyectos
              </button>
              <button title="Configurar idioma/voces" aria-label="Configurar idioma, voces y prompt" onClick={() => setShowLangModal(true)} className="px-3 py-2 rounded-2xl bg-white border">
                🎚️
              </button>
              <Uploader onDone={() => fetchRecords(selected)} onToast={notify} projectId={selected} />
              <button onClick={runLLM} className="px-4 py-2 rounded-2xl bg-slate-800 text-white disabled:opacity-50" disabled={busy}>
                {busyAction === "llm" ? (
                  <span className="inline-flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                    </svg>
                    Generando limpieza…
                  </span>
                ) : (
                  "Generar limpieza + entonación"
                )}
              </button>
              <button onClick={genAll} className="px-4 py-2 rounded-2xl bg-emerald-700 text-white disabled:opacity-50" disabled={busy}>
                {busyAction === "tts" ? (
                  <span className="inline-flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                    </svg>
                    Generando audios…
                  </span>
                ) : (
                  "Generar audios (todos)"
                )}
              </button>
              <button
                title="Eliminar proyecto"
                onClick={() => setShowDeleteModal(true)}
                disabled={busy}
                className="ml-auto px-3 py-2 rounded-2xl bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">
                Eliminar proyecto
              </button>
              {(busyAction === "tts" || busyAction === "llm") && (
                <div className="ml-2 text-sm text-gray-700 self-center flex items-center gap-3">
                  <div className="w-48 bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div className="bg-emerald-600 h-2" style={{ width: totalCount ? `${(processedCount / totalCount) * 100}%` : `0%` }} />
                  </div>
                  <div className="text-sm">
                    {processedCount}/{totalCount}
                  </div>
                </div>
              )}
            </div>
            <div className="mb-4 p-4 bg-white rounded-xl shadow flex items-center justify-between">
              <div>
                <div className="text-xl font-bold text-gray-900">{selectedProject?.title || `Proyecto ${selected}`}</div>
                <div className="text-sm text-gray-500 mt-1">{selectedProject?.desc || "Sin descripción"}</div>
              </div>
              <div className="text-xs text-gray-400">ID: {selected}</div>
            </div>

            {showPromptModal && (
              <PromptModal open={showPromptModal} initialText={projectPrompt} onClose={() => setShowPromptModal(false)} onConfirm={onConfirmPrompt} title="Contexto / prompt para el LLM" />
            )}

            <div className="grid gap-4">
              {records.length === 0 ? (
                <div className="text-gray-500">Sube un PDF para comenzar…</div>
              ) : (
                records.map((r) => (
                  <RecordCard key={r.num} rec={r} onChange={(newRec) => setRecords((prev) => prev.map((x) => (x.num === newRec.num ? newRec : x)))} apiBase={API} projectId={selected} />
                ))
              )}
            </div>

            {showLangModal && (
              <LanguageConfigModal
                projectId={selected}
                onClose={() => setShowLangModal(false)}
                onSaved={(info) => {
                  // if backend returned the updated info, propagate project_prompt to local state
                  if (info && info.project_prompt !== undefined) setProjectPrompt(info.project_prompt);
                  notify("Configuración guardada");
                }}
              />
            )}

            {showDeleteModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div className="absolute inset-0 bg-black opacity-40" onClick={() => setShowDeleteModal(false)} />
                <div className="bg-white rounded-xl shadow-lg p-6 z-10 w-96">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl text-red-600">⚠️</div>
                    <div>
                      <h3 className="text-lg font-semibold">Eliminar proyecto</h3>
                      <p className="text-sm text-gray-700 mt-2">Esta acción eliminará todo el proyecto seleccionado, incluidos los audios y datos asociados. Esta operación no se puede deshacer.</p>
                      <p className="text-sm text-gray-700 mt-2 font-medium">Para confirmar, escribe "eliminar" en la caja de abajo.</p>
                      <input
                        autoFocus
                        value={deleteText}
                        onChange={(e) => setDeleteText(e.target.value)}
                        className="mt-3 w-full border rounded px-2 py-1"
                        placeholder='Escribe "eliminar" para confirmar'
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setShowDeleteModal(false);
                        setDeleteText("");
                      }}
                      className="px-3 py-2 rounded bg-gray-100">
                      Cancelar
                    </button>
                    <button
                      disabled={deleteText.trim().toLowerCase() !== "eliminar" || busy}
                      onClick={onDeleteProject}
                      className="px-3 py-2 rounded bg-red-600 text-white flex items-center gap-2 disabled:opacity-50">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                      </svg>
                      Eliminar proyecto
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {showLog && (
          <div className="fixed right-4 bottom-4 w-96 bg-white rounded-xl shadow-lg border">
            <div className="flex items-center justify-between px-4 py-2 border-b">
              <div className="text-sm font-semibold">Log de procesamiento</div>
              <div className="flex items-center gap-2">
                <div className="text-xs text-gray-600">{statusRows.length} filas</div>
                <button onClick={() => setShowLog(false)} title="Cerrar" className="text-gray-500 hover:text-gray-800 px-2">
                  ✖
                </button>
              </div>
            </div>
            <div className="max-h-48 overflow-auto p-3 text-sm text-gray-700">
              {statusRows.length === 0 ? (
                <div className="text-gray-500">Sin entradas recientes</div>
              ) : (
                statusRows.map((r) => (
                  <div key={r.num} className="py-1 border-b">
                    <strong>#{r.num}</strong> — {r.processed ? "ok" : r.failed ? `failed: ${r.error}` : "pending"}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
      <Toast text={toast} />
    </div>
  );
}
