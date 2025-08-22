import React, { useState, useEffect } from "react";
import InlineEditable from "./InlineEditable";
import NotesPanel from "./NotesPanel";
import PromptModal from "./PromptModal";
import Toast from "./Toast";
import { patchRecord, ttsOne, listRecords, llmProcessOne } from "../api";

export default function RecordCard({ rec, onChange, apiBase, projectId }) {
  const [openPrompt, setOpenPrompt] = useState(null); // "pregunta" | "respuesta" | null
  const [modalInitialText, setModalInitialText] = useState("");

  const saveField = (field) => async (value) => {
    const updated = { [field]: value };
    // optimistic update so UI shows the latest value immediately
    try {
      // eslint-disable-next-line no-console
      console.debug("RecordCard: optimistic onChange", { field, value, rec });
      onChange({ ...rec, ...updated });
    } catch (e) {
      // ignore optimistic update errors
    }

    try {
      // eslint-disable-next-line no-console
      console.debug("RecordCard: calling patchRecord", { projectId, num: rec.num, updated });
      const res = await patchRecord(projectId, rec.num, updated);
      // eslint-disable-next-line no-console
      console.debug("RecordCard: patchRecord response", res && res.data ? res.data : res);
      // fetch authoritative data from server to avoid any client-side drift
      try {
        // eslint-disable-next-line no-console
        console.debug("RecordCard: fetching listRecords to sync");
        const all = await listRecords(projectId);
        const serverRec = all.data.find((x) => x.num === rec.num);
        if (serverRec) onChange(serverRec);
        else onChange(res.data);
      } catch (err) {
        // fallback to direct response if listRecords fails
        onChange(res.data);
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("RecordCard: Error guardando registro:", e);
    }
  };

  const [toast, setToast] = useState({ text: "", type: "success" });
  const [notesOpen, setNotesOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processingAction, setProcessingAction] = useState(null);
  const gridColsClass = notesOpen ? "md:grid-cols-3" : "md:grid-cols-2";

  // base URLs for audio files (without cache-busting)
  const basePlayUrlP = `${apiBase}/voices/${projectId}/${rec.num}/p${rec.num}.mp3`;
  const basePlayUrlR = `${apiBase}/voices/${projectId}/${rec.num}/r${rec.num}.mp3`;
  // version query params to force browser to reload updated audio
  const [audioVerP, setAudioVerP] = useState(0);
  const [audioVerR, setAudioVerR] = useState(0);
  const playUrlP = audioVerP ? `${basePlayUrlP}?v=${audioVerP}` : basePlayUrlP;
  const playUrlR = audioVerR ? `${basePlayUrlR}?v=${audioVerR}` : basePlayUrlR;

  const regen = async (part, promptText, language = null, accent = null) => {
    setProcessing(true);
    // Añadir idioma y acento al final del prompt si se proporcionan
    let finalPrompt = promptText || "";
    if (language || accent) {
      const langStr = `Idioma: ${language}${accent ? " - " + accent : ""}`;
      finalPrompt = finalPrompt ? `${finalPrompt}\n\n${langStr}` : langStr;
    }

    await ttsOne(projectId, rec.num, { part, prompt_override: finalPrompt });
    // Tras regenerar, volver a comprobar si el audio ya existe
    await checkAll();
    // Forzar recarga del audio en el navegador: actualizar versión sólo para la parte regenerada
    const ts = Date.now();
    if (part === "pregunta") setAudioVerP(ts);
    else if (part === "respuesta") setAudioVerR(ts);
    else if (part === "both") {
      setAudioVerP(ts);
      setAudioVerR(ts);
    }
    setOpenPrompt(null);
    setProcessing(false);
    setToast({ text: "Audio regenerado correctamente.", type: "success" });
  };

  const regenLLM = async (whichPart, mode) => {
    // mode: 'texto' | 'entonacion' | 'both'
    const body = {
      overwrite_texts: mode !== "entonacion",
      overwrite_prompts: mode !== "texto",
      part: whichPart === "pregunta" ? (mode === "both" ? "both" : "pregunta") : mode === "both" ? "both" : "respuesta",
    };
    try {
      setProcessing(true);
      setProcessingAction(`${whichPart}-${mode}`);
      const res = await llmProcessOne(projectId, rec.num, body);
      // actualizar registro con respuesta del servidor
      if (res && res.data && res.data.record) {
        onChange(res.data.record);
        setToast({ text: "Reprocesado por LLM correctamente.", type: "success" });
      }
      setProcessing(false);
      setProcessingAction(null);
    } catch (e) {
      setProcessing(false);
      setProcessingAction(null);
      // eslint-disable-next-line no-console
      console.error("Error al procesar con LLM:", e);
      setToast({ text: "Error al reprocesar con LLM.", type: "error" });
    }
  };

  const [hasAudioP, setHasAudioP] = useState(false);
  const [hasAudioR, setHasAudioR] = useState(false);

  const checkUrl = async (url) => {
    try {
      const res = await fetch(url, { method: "HEAD" });
      return res.ok;
    } catch (err) {
      return false;
    }
  };

  const checkAll = async () => {
    const [p, r] = await Promise.all([checkUrl(playUrlP), checkUrl(playUrlR)]);
    setHasAudioP(p);
    setHasAudioR(r);
  };

  useEffect(() => {
    // comprobar al montar y cuando cambie el record
    checkAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rec.num, apiBase]);

  return (
    <div className="rounded-2xl bg-white shadow p-4 border border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold">Bloque #{rec.num}</h3>
        <div className="flex gap-2 items-center">
          <button className="px-3 py-1 rounded-md bg-white border text-sm" onClick={() => setNotesOpen(!notesOpen)} title="Notas">
            🗒️ Notas
            {rec.notas && rec.notas.length > 0 ? <span className="ml-2 text-xs text-gray-500">•</span> : null}
          </button>
        </div>
      </div>

      <div className={`grid ${gridColsClass} gap-4`}>
        <div className="rounded-xl p-3 bg-gray-50">
          {hasAudioP && (
            <div className="flex items-center gap-2">
              <audio controls src={playUrlP} className="h-8 mt-2 mb-2" />
              <button
                className="px-2 py-1 rounded-xl bg-red-500 text-white text-xs"
                onClick={async () => {
                  // borrar audio pregunta
                  await import("../api").then(({ deleteAudio }) => deleteAudio(projectId, rec.num, "pregunta"));
                  await checkAll();
                }}
                title="Eliminar audio de pregunta">
                Eliminar
              </button>
            </div>
          )}
          <div className="text-xs font-semibold text-gray-500 mb-1">Pregunta</div>
          <InlineEditable value={rec.pregunta} onSave={saveField("pregunta")} />
          <div className="mt-2 text-xs font-medium text-gray-500">Entonación (Q)</div>
          <InlineEditable value={rec.entonacion_p} onSave={saveField("entonacion_p")} />
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium shadow-sm hover:bg-indigo-700 transition-transform transform hover:-translate-y-0.5"
                onClick={() => {
                  setModalInitialText(rec.entonacion_p || "");
                  setOpenPrompt("pregunta");
                }}
                disabled={processing}
                aria-disabled={processing}
                aria-label={`Regenerar audio de la pregunta ${rec.num}`}
                title="Editar prompt y regenerar audio">
                🔁 Regenerar Audio
              </button>
              <button
                className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-white border border-sky-200 text-sky-700 text-sm font-medium shadow-sm hover:bg-sky-50 transition"
                onClick={() => regenLLM("pregunta", "texto")}
                disabled={processing}
                aria-disabled={processing}
                aria-label={`Regenerar texto (limpieza) de la pregunta ${rec.num}`}
                title="Regenerar texto (limpieza)">
                {processingAction === "pregunta-texto" ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>{" "}
                    Procesando…
                  </>
                ) : (
                  "📝 Texto"
                )}
              </button>
              <button
                className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-white border border-violet-200 text-violet-700 text-sm font-medium shadow-sm hover:bg-violet-50 transition"
                onClick={() => regenLLM("pregunta", "entonacion")}
                disabled={processing}
                aria-disabled={processing}
                aria-label={`Regenerar entonación de la pregunta ${rec.num}`}
                title="Regenerar entonación">
                {processingAction === "pregunta-entonacion" ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>{" "}
                    Procesando…
                  </>
                ) : (
                  "🎙️ Entonación"
                )}
              </button>
            </div>
            {/* espacio reservado para acciones de la pregunta (sin notas aquí) */}
            <div className="flex items-center gap-2" />
          </div>
        </div>

        <div className="rounded-xl p-3 bg-gray-50">
          {hasAudioR && (
            <div className="flex items-center gap-2">
              <audio controls src={playUrlR} className="h-8 mt-2 mb-2" />
              <button
                className="px-2 py-1 rounded-xl bg-red-500 text-white text-xs"
                onClick={async () => {
                  // borrar audio respuesta
                  await import("../api").then(({ deleteAudio }) => deleteAudio(projectId, rec.num, "respuesta"));
                  await checkAll();
                }}
                title="Eliminar audio de respuesta">
                Eliminar
              </button>
            </div>
          )}
          <div className="text-xs font-semibold text-gray-500 mb-1">Respuesta</div>
          <InlineEditable value={rec.respuesta} onSave={saveField("respuesta")} previewLines={5} />
          <div className="mt-2 text-xs font-medium text-gray-500">Entonación (R)</div>
          <InlineEditable value={rec.entonacion_r} onSave={saveField("entonacion_r")} />
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium shadow-sm hover:bg-emerald-700 transition-transform transform hover:-translate-y-0.5"
                onClick={() => {
                  setModalInitialText(rec.entonacion_r || "");
                  setOpenPrompt("respuesta");
                }}
                disabled={processing}
                aria-disabled={processing}
                aria-label={`Regenerar audio de la respuesta ${rec.num}`}
                title="Editar prompt y regenerar audio">
                🔁 Regenerar Audio
              </button>
              <button
                className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-white border border-teal-200 text-teal-700 text-sm font-medium shadow-sm hover:bg-teal-50 transition"
                onClick={() => regenLLM("respuesta", "texto")}
                disabled={processing}
                aria-disabled={processing}
                aria-label={`Regenerar texto (limpieza) de la respuesta ${rec.num}`}
                title="Regenerar texto (limpieza)">
                {processingAction === "respuesta-texto" ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>{" "}
                    Procesando…
                  </>
                ) : (
                  "📝 Texto"
                )}
              </button>
              <button
                className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-white border border-amber-200 text-amber-800 text-sm font-medium shadow-sm hover:bg-amber-50 transition"
                onClick={() => regenLLM("respuesta", "entonacion")}
                disabled={processing}
                aria-disabled={processing}
                aria-label={`Regenerar entonación de la respuesta ${rec.num}`}
                title="Regenerar entonación">
                {processingAction === "respuesta-entonacion" ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>{" "}
                    Procesando…
                  </>
                ) : (
                  "🎙️ Entonación"
                )}
              </button>
            </div>
            {/* espacio reservado para acciones de la respuesta (sin notas aquí) */}
            <div className="flex items-center gap-2" />
          </div>
        </div>
        {notesOpen && (
          <div className="rounded-xl p-3 bg-gray-50">
            <NotesPanel open={true} initial={rec.notas || ""} onClose={() => setNotesOpen(false)} onSave={saveField("notas")} />
          </div>
        )}
      </div>

      <PromptModal
        open={!!openPrompt}
        initialText={modalInitialText}
        onClose={() => setOpenPrompt(null)}
        // ahora PromptModal devuelve (text, language, accent)
        onConfirm={(txt, language, accent) => regen(openPrompt, txt, language, accent)}
        title={`Editar prompt TTS – ${openPrompt === "pregunta" ? "Pregunta" : "Respuesta"}`}
      />
      <Toast text={toast.text} type={toast.type} onClose={() => setToast({ text: "", type: "success" })} />
    </div>
  );
}
