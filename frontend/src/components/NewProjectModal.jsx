import React, { useState } from "react";
import { createProject } from "../api";

const AVAILABLE_VOICES = ["alloy", "ash", "ballad", "coral", "echo", "fable", "nova", "onyx", "sage", "shimmer"];

export default function NewProjectModal({ open = true, onClose, onCreated }) {
  const MAX_DESC = 500;
  const MAX_PROMPT = 600;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [projectPrompt, setProjectPrompt] = useState("");
  const [interviewer, setInterviewer] = useState({ language: "es", accent: "es-ES", voice: "alloy" });
  const [interviewee, setInterviewee] = useState({ language: "es", accent: "es-ES", voice: "ash" });

  const handleSave = async () => {
    if (!isValid()) return;
    setLoading(true);
    setError(null);
    try {
      const body = {
        title: title || "",
        desc: desc || "",
        project_prompt: projectPrompt || "",
        interviewer,
        interviewee,
      };
      const res = await createProject(body);
      const pid = res.data?.project_id;
      onCreated && onCreated(pid, res.data?.saved);
      onClose && onClose();
    } catch (e) {
      console.error("Error creating project", e);
      setError("Error creando proyecto");
    } finally {
      setLoading(false);
    }
  };

  const isValid = () => {
    return title.trim().length > 0 && desc.length <= MAX_DESC && projectPrompt.length <= MAX_PROMPT;
  };

  if (!open) return null;

  const reachedMax = desc.length >= MAX_DESC;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/30 z-50 p-4">
      <div className="bg-white rounded-xl p-5 w-full max-w-2xl shadow-xl ring-1 ring-black/5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="text-2xl">✨</div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Crear nuevo proyecto</h3>
              <p className="text-sm text-slate-500">Crea un espacio para subir tu PDF y generar audios. Puedes cambiar esto luego.</p>
            </div>
          </div>
          <button className="text-slate-400 hover:text-slate-600" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-xs text-slate-600">
              Título <span className="text-red-600">*</span>
            </label>
            <input className="w-full border rounded p-2 mt-1 text-sm" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Entrevista a Lacerta" />
          </div>

          <div>
            <label className="block text-xs text-slate-600">Descripción</label>
            <textarea
              className={`w-full border rounded p-2 mt-1 text-sm h-20 ${reachedMax ? "border-red-400" : "border-slate-200"}`}
              value={desc}
              maxLength={MAX_DESC}
              onChange={(e) => {
                const v = e.target.value;
                setDesc(v.length > MAX_DESC ? v.slice(0, MAX_DESC) : v);
              }}
              placeholder="Breve descripción del proyecto (máx. 1-3 párrafos)"
            />

            <div className="flex items-center justify-between mt-1">
              <div className="text-xs">
                <span className={`font-medium ${reachedMax ? "text-red-600" : "text-slate-500"}`}>{Math.max(0, MAX_DESC - desc.length)} caracteres restantes</span>
              </div>
              {reachedMax && <div className="text-xs text-red-600">Has alcanzado el límite de 500 caracteres</div>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 rounded-lg border bg-sky-50">
              <div className="flex items-center gap-3 mb-3">
                <div className="text-xl">🎙️</div>
                <div>
                  <div className="text-sm font-medium text-slate-700">Entrevistador</div>
                  <div className="text-xs text-slate-500">Idioma, acento y voz por defecto</div>
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <label className="block text-xs text-slate-600">Idioma</label>
                  <select className="w-full border rounded p-2 mt-1 text-sm" value={interviewer.language} onChange={(e) => setInterviewer({ ...interviewer, language: e.target.value })}>
                    <option value="es">Español</option>
                    <option value="en">Inglés</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-600">Acento</label>
                  <select className="w-full border rounded p-2 mt-1 text-sm" value={interviewer.accent} onChange={(e) => setInterviewer({ ...interviewer, accent: e.target.value })}>
                    <option value="es-ES">Español (España)</option>
                    <option value="es-419">Español (Latam)</option>
                    <option value="en-US">English (US)</option>
                    <option value="en-GB">English (UK)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-600">Voz</label>
                  <select className="w-full border rounded p-2 mt-1 text-sm" value={interviewer.voice} onChange={(e) => setInterviewer({ ...interviewer, voice: e.target.value })}>
                    {AVAILABLE_VOICES.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg border bg-emerald-50">
              <div className="flex items-center gap-3 mb-3">
                <div className="text-xl">🗣️</div>
                <div>
                  <div className="text-sm font-medium text-slate-700">Entrevistado</div>
                  <div className="text-xs text-slate-500">Idioma, acento y voz por defecto</div>
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <label className="block text-xs text-slate-600">Idioma</label>
                  <select className="w-full border rounded p-2 mt-1 text-sm" value={interviewee.language} onChange={(e) => setInterviewee({ ...interviewee, language: e.target.value })}>
                    <option value="es">Español</option>
                    <option value="en">Inglés</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-600">Acento</label>
                  <select className="w-full border rounded p-2 mt-1 text-sm" value={interviewee.accent} onChange={(e) => setInterviewee({ ...interviewee, accent: e.target.value })}>
                    <option value="es-ES">Español (España)</option>
                    <option value="es-419">Español (Latam)</option>
                    <option value="en-US">English (US)</option>
                    <option value="en-GB">English (UK)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-600">Voz</label>
                  <select className="w-full border rounded p-2 mt-1 text-sm" value={interviewee.voice} onChange={(e) => setInterviewee({ ...interviewee, voice: e.target.value })}>
                    {AVAILABLE_VOICES.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-600">Prompt por defecto (contexto global)</label>
            <textarea
              className={`w-full border rounded p-2 mt-1 text-sm h-24 ${projectPrompt.length >= MAX_PROMPT ? "border-red-400" : "border-slate-200"}`}
              value={projectPrompt}
              maxLength={MAX_PROMPT}
              onChange={(e) => {
                const v = e.target.value;
                setProjectPrompt(v.length > MAX_PROMPT ? v.slice(0, MAX_PROMPT) : v);
              }}
              placeholder="Contexto que se usará al generar entonación y limpieza (opcional)"
            />

            <div className="flex items-center justify-between mt-1">
              <div className="text-xs">
                <span className={`font-medium ${projectPrompt.length >= MAX_PROMPT ? "text-red-600" : "text-slate-500"}`}>{Math.max(0, MAX_PROMPT - projectPrompt.length)} caracteres restantes</span>
              </div>
              {projectPrompt.length >= MAX_PROMPT && <div className="text-xs text-red-600">Has alcanzado el límite de 600 caracteres</div>}
            </div>
          </div>

          {error && <div className="text-red-600 text-sm">{error}</div>}

          <div className="flex justify-end gap-2 mt-3 items-center">
            <button
              className={`px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700 ${!isValid() || loading ? "opacity-50 cursor-not-allowed" : ""}`}
              onClick={handleSave}
              disabled={!isValid() || loading}>
              {loading ? "Creando…" : "Crear proyecto"}
            </button>
            <button className="px-4 py-2 rounded bg-white border text-slate-700 hover:bg-slate-50" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
