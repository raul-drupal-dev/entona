import React, { useState, useRef, useEffect } from "react";
// Render Markdown preview. Requires `react-markdown` and `remark-gfm` in the frontend dependencies.
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function NotesPanel({ open = false, initial = "", onClose = () => {}, onSave = null }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(initial || "");
  const [status, setStatus] = useState("idle"); // idle | saving | saved | error
  const taRef = useRef(null);

  useEffect(() => setText(initial || ""), [initial]);

  useEffect(() => {
    if (editing && taRef.current) taRef.current.focus();
  }, [editing]);

  if (!open) return null;

  const applyWrap = (before, after = before) => {
    if (!taRef.current) return;
    const el = taRef.current;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = text.substring(start, end) || "texto";
    const newText = text.substring(0, start) + before + selected + after + text.substring(end);
    setText(newText);
    // restore selection roughly inside the inserted wrapper
    requestAnimationFrame(() => {
      const pos = start + before.length + selected.length + after.length;
      el.setSelectionRange(pos, pos);
      el.focus();
    });
  };

  const insertList = () => {
    if (!taRef.current) return;
    const el = taRef.current;
    const start = el.selectionStart;
    // find start of current line
    const before = text.substring(0, start);
    const lastNl = before.lastIndexOf("\n");
    const lineStart = lastNl + 1;
    const newText = text.substring(0, lineStart) + "- " + text.substring(lineStart);
    setText(newText);
    requestAnimationFrame(() => {
      const pos = start + 2; // after the '- '
      el.setSelectionRange(pos, pos);
      el.focus();
    });
  };

  const save = async () => {
    setStatus("saving");
    try {
      if (typeof onSave === "function") await onSave(text);
      // small simulated delay for UI
      await new Promise((r) => setTimeout(r, 200));
      setStatus("saved");
      setEditing(false);
      setTimeout(() => setStatus("idle"), 1200);
    } catch (e) {
      setStatus("error");
    }
  };

  const containerClass = editing ? "shadow rounded-xl bg-white border border-gray-100 p-3 h-full" : "rounded-xl h-full";

  return (
    <div className="w-full">
      <div className={containerClass}>
        {/* Closed preview header: no title, just Edit button to the right */}
        <div className="flex items-start justify-end mb-2">
          <div className="flex items-center gap-2">
            {!editing && (
              <button
                className="text-xs text-gray-500 hover:text-gray-700"
                onClick={() => {
                  setEditing(true);
                  setTimeout(() => taRef.current && taRef.current.focus(), 50);
                }}>
                Editar
              </button>
            )}
          </div>
        </div>

        {!editing ? (
          <div className="prose text-sm text-gray-800 max-h-64 overflow-auto">
            {text ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]} linkTarget="_blank">
                {text}
              </ReactMarkdown>
            ) : (
              <div className="text-gray-400">No hay notas aún. Pulsa "Editar" para agregar.</div>
            )}
          </div>
        ) : (
          <div>
            <div className="flex gap-2 mb-2">
              <button className="px-2 py-1 rounded bg-gray-100 text-sm" onClick={() => applyWrap("**", "**")} title="Negrita">
                B
              </button>
              <button className="px-2 py-1 rounded bg-gray-100 text-sm" onClick={() => applyWrap("*", "*")} title="Cursiva">
                I
              </button>
              <button className="px-2 py-1 rounded bg-gray-100 text-sm" onClick={insertList} title="Lista">
                •
              </button>
              <button className="px-2 py-1 rounded bg-gray-100 text-sm" onClick={() => applyWrap("[", "](https://)")} title="Enlace">
                🔗
              </button>
            </div>
            <textarea ref={taRef} value={text} onChange={(e) => setText(e.target.value)} className="w-full p-2 rounded border border-gray-200 focus:outline-none focus:ring text-sm" rows={8} />

            <div className="mt-2 flex items-center justify-between">
              <div className="text-xs text-gray-500">
                {status === "idle" && "Sin guardar"}
                {status === "saving" && "Guardando…"}
                {status === "saved" && "Guardado"}
                {status === "error" && "Error al guardar"}
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="px-3 py-1 bg-white border rounded text-sm"
                  onClick={() => {
                    setText(initial || "");
                    setEditing(false);
                    setStatus("idle");
                  }}>
                  Cancelar
                </button>
                <button className="px-3 py-1 bg-indigo-600 text-white rounded text-sm" onClick={save}>
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
