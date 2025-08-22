import React, { useEffect, useState } from "react";

export default function Toast({ text, type = "success", duration = 4000, onClose }) {
  const [visible, setVisible] = useState(!!text);

  useEffect(() => {
    setVisible(!!text);
    if (!text) return;
    const t = setTimeout(() => {
      setVisible(false);
      if (typeof onClose === "function") onClose();
    }, duration);
    return () => clearTimeout(t);
  }, [text, duration, onClose]);

  if (!text || !visible) return null;
  const color = type === "error" ? "bg-red-600" : "bg-emerald-600";

  return (
    <div className={`fixed bottom-4 right-4 ${color} text-white px-4 py-2 rounded-xl shadow-lg flex items-center gap-3`} role="status" aria-live="polite">
      <div className="flex-1">{text}</div>
      <button
        className="text-white/90 hover:text-white"
        aria-label="Cerrar"
        onClick={() => {
          setVisible(false);
          if (typeof onClose === "function") onClose();
        }}>
        ✖
      </button>
    </div>
  );
}
