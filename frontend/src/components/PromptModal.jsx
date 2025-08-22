import React, { useState, useEffect } from "react";

const ACCENTS = {
  Español: ["España", "Latinoamérica", "México"],
  English: ["US", "UK", "Australia"],
};

export default function PromptModal({ open, initialText, onClose, onConfirm, title = "Editar prompt TTS" }) {
  const MAX_PROMPT = 600;
  const [text, setText] = useState(initialText || "");
  const [language, setLanguage] = useState("Español");
  const [accent, setAccent] = useState(ACCENTS["Español"][0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Sincronizar el valor cuando el modal se abra o cambie la prop initialText
  useEffect(() => {
    if (open) setText(initialText || "");
  }, [open, initialText]);

  // cuando cambie idioma, seleccionar un acento por defecto
  useEffect(() => {
    const opts = ACCENTS[language] || [];
    setAccent(opts[0] || "");
  }, [language]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white w-full max-w-2xl rounded-2xl p-4 shadow-xl">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-semibold">{title}</h3>
          <button className="px-3 py-1 rounded-lg bg-gray-100" onClick={onClose}>
            Cerrar
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <label className="text-xs font-medium text-gray-600">Idioma</label>
          <label className="text-xs font-medium text-gray-600">Acento</label>
          <select value={language} onChange={(e) => setLanguage(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-300" disabled={loading} aria-disabled={loading}>
            <option value="Español">Español</option>
            <option value="English">English</option>
          </select>

          <select value={accent} onChange={(e) => setAccent(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-300" disabled={loading} aria-disabled={loading}>
            {(ACCENTS[language] || []).map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-2 text-sm text-gray-500">
          <p>Introduce el contexto adicional para mejorar la generación de voz.</p>
        </div>
        <textarea
          className={`w-full p-3 rounded-xl border min-h-[160px] ${text.length >= MAX_PROMPT ? "border-red-400" : "border-gray-300"}`}
          value={text}
          maxLength={MAX_PROMPT}
          onChange={(e) => {
            const v = e.target.value;
            setText(v.length > MAX_PROMPT ? v.slice(0, MAX_PROMPT) : v);
          }}
          disabled={loading}
          aria-disabled={loading}
          placeholder="Escribe tu contexto aquí..."
        />
        <div className="flex items-center justify-between mt-1">
          <div />
          <div className="text-xs">
            <span className={`${text.length >= MAX_PROMPT ? "text-red-600 font-medium" : "text-gray-500"}`}>{Math.max(0, MAX_PROMPT - text.length)} caracteres restantes</span>
          </div>
        </div>
        {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
        <div className="mt-4 flex gap-2 justify-end items-center">
          <button className={`px-4 py-2 rounded-xl ${loading ? "bg-gray-300 text-gray-600" : "bg-gray-200"}`} onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white ${loading ? "bg-emerald-400 cursor-wait" : "bg-emerald-600 hover:bg-emerald-700"} ${
              text.length > MAX_PROMPT ? "opacity-50 cursor-not-allowed" : ""
            }`}
            onClick={async () => {
              setError("");
              try {
                setLoading(true);
                // await the parent's onConfirm which should perform the async regen
                await onConfirm(text, language, accent);
                // don't call onClose here; parent typically closes after successful regen
              } catch (e) {
                console.error(e);
                setError("Error al regenerar. Comprueba la conexión o revisa la consola del servidor.");
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading || text.length > MAX_PROMPT}
            aria-busy={loading}>
            {loading ? (
              // simple animated dots
              <span className="flex items-center">
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                </svg>
                <span className="ml-2">Procesando…</span>
              </span>
            ) : (
              "Guardar y regenerar"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
