import React, { useRef } from "react";
import { uploadPdf } from "../api";

export default function Uploader({ onDone, onToast, projectId }) {
  const ref = useRef();
  const onChange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      await uploadPdf(f, projectId);
      onToast("PDF procesado y CSV creado");
      onDone?.();
    } catch (e) {
      console.error(e);
      onToast("Error al subir/procesar PDF", "error");
    } finally {
      ref.current.value = "";
    }
  };
  return (
    <label className="inline-flex items-center gap-3 cursor-pointer px-4 py-2 rounded-2xl bg-indigo-600 text-white shadow">
      <span>Subir PDF</span>
      <input ref={ref} type="file" className="hidden" accept="application/pdf" onChange={onChange} />
    </label>
  );
}
