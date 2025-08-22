import React, { useEffect, useState } from "react";
import { getProjectInfo, saveProjectInfo } from "../api";

const DEFAULT = {
  // nuevo: título obligatorio y descripción opcional (max 500)
  title: "",
  description: "",
  interviewer: { language: "es", accent: "es-ES", voice: "alloy" },
  interviewee: { language: "es", accent: "es-ES", voice: "ash" },
  project_prompt: "",
};

const AVAILABLE_VOICES = ["alloy", "ash", "ballad", "coral", "echo", "fable", "nova", "onyx", "sage", "shimmer"];
const MAX_PROMPT = 600;

export default function LanguageConfigModal({ projectId, onClose, onSaved }) {
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState(DEFAULT);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await getProjectInfo(projectId);
        if (!mounted) return;
        if (res.data && Object.keys(res.data).length) {
          // normalize to new shape if legacy
          const d = res.data;
          const out = { ...DEFAULT };
          if (d.interviewer || d.interviewee) {
            out.interviewer = { ...out.interviewer, ...(d.interviewer || {}) };
            out.interviewee = { ...out.interviewee, ...(d.interviewee || {}) };
          } else {
            // legacy: top-level language/accent + voices
            const lang = d.language || out.interviewer.language;
            const acc = d.accent || out.interviewer.accent;
            out.interviewer = { ...out.interviewer, language: lang, accent: acc };
            out.interviewee = { ...out.interviewee, language: lang, accent: acc };
            if (d.voices) {
              out.interviewer.voice = d.voices.interviewer || out.interviewer.voice;
              out.interviewee.voice = d.voices.interviewee || out.interviewee.voice;
            }
          }
          // copy any global prompt (project-level) if present (support a couple of key names)
          out.project_prompt = d.project_prompt || d.projectPrompt || out.project_prompt || "";
          // copy title/description if present in stored project info
          out.title = d.title || d.name || out.title || "";
          out.description = d.description || d.desc || out.description || "";
          setInfo(out);
        }
      } catch (e) {
        // no info yet or error: keep defaults
        console.warn("No project info or error", e);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => (mounted = false);
  }, [projectId]);

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    try {
      await saveProjectInfo(projectId, info);
      onSaved && onSaved(info);
      onClose();
    } catch (e) {
      console.error("Error saving project info", e);
      setError("Error guardando configuración");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/30 z-50 p-4">
      <div className="bg-white rounded-xl p-5 w-full max-w-2xl shadow-xl ring-1 ring-black/5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🎚️</div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Configuración de idioma y voces</h3>
              <p className="text-sm text-slate-500">Define idioma, acento y voz para entrevistador y entrevistado. Guarda para aplicarlo al bulk.</p>
            </div>
          </div>
          <button className="text-slate-400 hover:text-slate-600" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>

        {loading ? (
          <div className="mt-6 text-center text-slate-500">Cargando…</div>
        ) : (
          <div className="mt-4 space-y-4">
            {/* Título y descripción del proyecto (al principio, título obligatorio) */}
            <div>
              <div>
                <label className="block text-xs text-slate-600">
                  Título del proyecto <span className="text-red-600">*</span>
                </label>
                <input
                  className="w-full border rounded p-2 mt-1 text-sm"
                  value={info.title || ""}
                  onChange={(e) => setInfo({ ...info, title: e.target.value })}
                  placeholder="Un nombre descriptivo para el proyecto"
                />
              </div>

              <div className="mt-2">
                <label className="block text-xs text-slate-600">Descripción (opcional)</label>
                <textarea
                  className={`w-full border rounded p-2 mt-1 text-sm h-20 ${(info.description || "").length >= 500 ? "border-red-400" : "border-slate-200"}`}
                  value={info.description || ""}
                  maxLength={500}
                  onChange={(e) => setInfo({ ...info, description: e.target.value.slice(0, 500) })}
                  placeholder="Breve descripción (máx. 500 caracteres)"></textarea>
                <div className="flex items-center justify-between mt-1">
                  <div className="text-xs text-slate-400">Descripción opcional que se guardará con la configuración del proyecto.</div>
                  <div className="text-xs text-slate-500 font-medium">{Math.max(0, 500 - (info.description || "").length)} caracteres restantes</div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Interviewer card */}
              <div className="p-4 rounded-lg border border-slate-100 bg-sky-50">
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-xl">🎙️</div>
                  <div>
                    <div className="text-sm font-medium text-slate-700">Entrevistador</div>
                    <div className="text-xs text-slate-500">Voz y localización para quien pregunta</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="block text-xs text-slate-600">Idioma</label>
                    <select
                      className="w-full border rounded p-2 mt-1 text-sm"
                      value={info.interviewer.language}
                      onChange={(e) => setInfo({ ...info, interviewer: { ...info.interviewer, language: e.target.value } })}>
                      <option value="es">Español</option>
                      <option value="en">Inglés</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-600">Acento</label>
                    <select
                      className="w-full border rounded p-2 mt-1 text-sm"
                      value={info.interviewer.accent}
                      onChange={(e) => setInfo({ ...info, interviewer: { ...info.interviewer, accent: e.target.value } })}>
                      <option value="es-ES">Español (España)</option>
                      <option value="es-419">Español (Latam)</option>
                      <option value="en-US">English (US)</option>
                      <option value="en-GB">English (UK)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-600">Voz</label>
                    <select
                      className="w-full border rounded p-2 mt-1 text-sm"
                      value={info.interviewer.voice}
                      onChange={(e) => setInfo({ ...info, interviewer: { ...info.interviewer, voice: e.target.value } })}>
                      {AVAILABLE_VOICES.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                    <div className="text-xs text-slate-400 mt-1">
                      Prueba voces como <span className="font-medium">alloy</span> o <span className="font-medium">onyx</span>.
                    </div>
                  </div>
                </div>
              </div>

              {/* Interviewee card */}
              <div className="p-4 rounded-lg border border-slate-100 bg-emerald-50">
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-xl">🗣️</div>
                  <div>
                    <div className="text-sm font-medium text-slate-700">Entrevistado</div>
                    <div className="text-xs text-slate-500">Voz y localización para quien responde</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="block text-xs text-slate-600">Idioma</label>
                    <select
                      className="w-full border rounded p-2 mt-1 text-sm"
                      value={info.interviewee.language}
                      onChange={(e) => setInfo({ ...info, interviewee: { ...info.interviewee, language: e.target.value } })}>
                      <option value="es">Español</option>
                      <option value="en">Inglés</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-600">Acento</label>
                    <select
                      className="w-full border rounded p-2 mt-1 text-sm"
                      value={info.interviewee.accent}
                      onChange={(e) => setInfo({ ...info, interviewee: { ...info.interviewee, accent: e.target.value } })}>
                      <option value="es-ES">Español (España)</option>
                      <option value="es-419">Español (Latam)</option>
                      <option value="en-US">English (US)</option>
                      <option value="en-GB">English (UK)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-600">Voz</label>
                    <select
                      className="w-full border rounded p-2 mt-1 text-sm"
                      value={info.interviewee.voice}
                      onChange={(e) => setInfo({ ...info, interviewee: { ...info.interviewee, voice: e.target.value } })}>
                      {AVAILABLE_VOICES.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                    <div className="text-xs text-slate-400 mt-1">Puedes elegir voces femeninas o masculinas según necesites.</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Project-level prompt */}
            <div className="mt-3">
              <label className="block text-xs text-slate-600">Prompt por defecto (contexto global)</label>
              <textarea
                className={`w-full border rounded p-2 mt-1 text-sm h-28 ${(info.project_prompt || "").length >= MAX_PROMPT ? "border-red-400" : "border-slate-200"}`}
                value={info.project_prompt || ""}
                maxLength={MAX_PROMPT}
                onChange={(e) => {
                  const v = e.target.value;
                  setInfo({ ...info, project_prompt: v.length > MAX_PROMPT ? v.slice(0, MAX_PROMPT) : v });
                }}
                placeholder="Contexto por defecto que se usará al generar entonación y limpieza (opcional)"></textarea>
              <div className="flex items-center justify-between mt-1">
                <div className="text-xs text-slate-400">Este prompt se guardará en el archivo .info y se usará como valor por defecto al abrir el generador de LLM.</div>
                <div className="text-xs">
                  <span className={`${(info.project_prompt || "").length >= MAX_PROMPT ? "text-red-600 font-medium" : "text-slate-500 font-medium"}`}>
                    {Math.max(0, MAX_PROMPT - (info.project_prompt || "").length)} caracteres restantes
                  </span>
                </div>
              </div>
            </div>

            {error && <div className="text-red-600 text-sm">{error}</div>}

            {/* título obligatorio: si vacío deshabilitar guardar */}
            {(!info.title || !(info.title || "").trim()) && <div className="text-sm text-red-600">El título es obligatorio. Rellénalo para poder guardar.</div>}

            <div className="flex justify-end gap-2 mt-3">
              <button className="px-4 py-2 rounded bg-white border text-slate-700 hover:bg-slate-50" onClick={onClose} disabled={loading}>
                Cancelar
              </button>
              <button
                className={`px-4 py-2 rounded ${
                  !info.title || !(info.title || "").trim() || loading ? "bg-slate-300 text-slate-500 cursor-not-allowed" : "bg-emerald-600 text-white hover:bg-emerald-700"
                } transition`}
                onClick={handleSave}
                disabled={loading || !info.title || !(info.title || "").trim()}>
                Guardar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
