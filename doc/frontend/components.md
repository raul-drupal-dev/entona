# Frontend — Componentes

Resumen práctico de los componentes existentes en `frontend/src/components/`.

Inline resumen por componente:

### InlineEditable.jsx

- Props: `value` (string), `onSave` (func), `placeholder` (string, opcional), `className` (string), `previewLines` (number)
- Responsabilidad: mostrar texto con modo lectura y edición inline; autosave al blur; soporte "Leer más" cuando hay muchas líneas.
- Comportamiento importante: enfoque automático al entrar en modo edición, llamada a `onSave(text)` si el valor cambia.
- Uso típico: edición de preguntas, respuestas y entonaciones dentro de `RecordCard`.

### LanguageConfigModal.jsx

- Props: `projectId`, `onClose`, `onSaved`.
- Responsabilidad: editar/guardar configuración de idioma, acento y voz para entrevistador/entrevistado; carga y normaliza project info desde API (`getProjectInfo`, `saveProjectInfo`).
- Estado: mantiene `info` con `title`, `description`, `interviewer`, `interviewee`, `project_prompt`.
- Notas: valida longitud de campos y muestra mensajes de error/estado.

### NewProjectModal.jsx

- Props: `open`, `onClose`, `onCreated`.
- Responsabilidad: crear proyectos nuevos; construye body con `title`, `desc`, `project_prompt`, `interviewer`, `interviewee` y llama a `createProject`.
- Validaciones: título obligatorio, límites en descripción y prompt.

### NotesPanel.jsx

- Props: `open`, `initial`, `onClose`, `onSave`.
- Responsabilidad: editor y visor de notas en Markdown; incluye herramientas básicas (bold, italic, listas, enlaces) y preview con `react-markdown` + `remark-gfm`.
- Estado: `editing`, `text`, `status` (idle|saving|saved|error).

### PromptModal.jsx

- Props: `open`, `initialText`, `onClose`, `onConfirm`, `title`.
- Responsabilidad: editar prompt TTS (contexto) y opciones de idioma/acento; limita longitud (600 chars) y llama a `onConfirm(text, language, accent)` para regenerar audio.

### RecordCard.jsx

- Props: `rec` (record object), `onChange` (func), `apiBase` (string), `projectId`.
- Responsabilidad: UI para un segmento (pregunta/respuesta) con edición inline, reproducción de audio, triggers para TTS y LLM (vía `ttsOne`, `llmProcessOne`, `patchRecord`, `listRecords`).
- Comportamiento clave: manejo optimista de updates, comprobación de existencia de audio (HEAD request), forzado de recarga de audio con query param de versión.
- Contiene/usa: `InlineEditable`, `NotesPanel`, `PromptModal`, `Toast`.

### Toast.jsx

- Props: `text`, `type` ("success"|"error"), `duration` (ms), `onClose`.
- Responsabilidad: notificaciones flotantes con auto-dismiss; accesibilidad `aria-live`.

### Uploader.jsx

- Props: `onDone`, `onToast`, `projectId`.
- Responsabilidad: control simple para subir PDFs (`uploadPdf`) y manejar resultado/error; input oculto tipo file y callback a `onDone`.

Notas técnicas y dependencias

- `NotesPanel` requiere `react-markdown` y `remark-gfm` en `frontend` dependencias.
- Convenciones vistas: componentes pequeños y enfocados; separar lógica de UI y llamadas a API (hay un `frontend/src/api.js`).

Recomendaciones rápidas

- Documentar props con PropTypes o migrar a TypeScript para autodedocumentación.
- Añadir tests de integración para `RecordCard` y mocks para `frontend/src/api.js`.
