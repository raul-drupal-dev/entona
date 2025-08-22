import React, { useState, useEffect, useRef } from "react";

export default function InlineEditable({ value, onSave, placeholder = "", className = "", previewLines }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value || "");
  const [expanded, setExpanded] = useState(false);
  const ref = useRef(null);

  useEffect(() => setText(value || ""), [value]);
  useEffect(() => {
    if (editing && ref.current) ref.current.focus();
  }, [editing]);

  // Save handler
  const save = async () => {
    setEditing(false);
    if (text !== value) {
      try {
        // debug log to verify save is triggered
        // eslint-disable-next-line no-console
        console.debug("InlineEditable: save() calling onSave", { text, value, onSaveType: typeof onSave });
        if (typeof onSave === "function") {
          await onSave(text);
        } else {
          // eslint-disable-next-line no-console
          console.error("InlineEditable: onSave is not a function", { onSave });
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("InlineEditable: onSave error", e);
      }
    }
  };

  // Heuristic to decide whether to show "Leer más" toggle
  const shouldShowToggle = () => {
    if (!previewLines) return false;
    const lines = (text || "").split("\n").length;
    const approxChars = previewLines * 80; // rough chars per line
    return lines > previewLines || (text || "").length > approxChars + 40;
  };

  const clampStyle =
    previewLines && !expanded
      ? {
          display: "-webkit-box",
          WebkitLineClamp: previewLines,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }
      : {};

  return (
    <div className={`w-full ${className}`}>
      {editing ? (
        <textarea
          ref={ref}
          className="w-full p-2 rounded-xl border border-gray-300 focus:outline-none focus:ring"
          rows={Math.min(12, Math.max(2, Math.ceil((text?.length || 10) / 80)))}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={save}
        />
      ) : (
        <div className="w-full p-2 rounded-xl bg-gray-50 hover:bg-gray-100 cursor-text" onClick={() => setEditing(true)}>
          <div className="whitespace-pre-wrap text-sm text-gray-800" style={clampStyle}>
            {text || <span className="text-gray-400">{placeholder}</span>}
          </div>

          {shouldShowToggle() && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
              className="mt-2 text-sm text-indigo-600 hover:underline"
              aria-expanded={expanded}>
              {expanded ? "Leer menos" : "Leer más"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
