# Frontend — Integración con API

Este archivo documenta las llamadas reales que el frontend hace al backend. Se basó en `frontend/src/api.js`.

Base URL

- El frontend obtiene la base URL de la variable `VITE_API_URL` (import.meta.env.VITE_API_URL). Por defecto se usa `http://localhost:8000`.

Endpoints y ejemplos (extraídos de `frontend/src/api.js`):

- `POST /api/upload` — upload PDF (multipart/form-data)
  - Uso: `uploadPdf(file, project_id)`
  - Ejemplo curl:

```bash
curl -X POST -F "file=@entrevista.pdf" -F "project_id=PROJECT_ID" http://localhost:8000/api/upload
```

- `GET /api/projects` — listar proyectos (`listProjects()`)
- `GET /api/records/:project_id` — listar registros/segmentos (`listRecords(project_id)`)
- `PATCH /api/records/:project_id/:num` — actualizar un registro (`patchRecord`)
- `POST /api/llm/process/:project_id` — procesar LLM en bulk (`llmProcess`)
- `POST /api/llm/process/:project_id/:num` — procesar un registro con LLM (`llmProcessOne`)
- `POST /api/llm/start/:project_id` — iniciar LLM async (`startLlm`)
- `GET /api/llm/check_status/:project_id` — comprobar status LLM (`checkLlmStatus`)
- `GET /api/llm/status_rows/:project_id` — obtener filas de status (`getLlmStatusRows`)
- `POST /api/tts/all/:project_id` — generar TTS para todo el proyecto (`ttsAll`)
- `POST /api/tts/start/:project_id` — iniciar TTS async (`startTtsAll`)
- `GET /api/tts/check_status/:project_id` — comprobar status TTS (`checkTtsStatus`)
- `GET /api/tts/status_rows/:project_id` — obtener filas de status TTS (`getTtsStatusRows`)
- `POST /api/tts/:project_id/:num` — generar TTS para un registro (`ttsOne`)
- `DELETE /api/tts/:project_id/:num/:part` — borrar audio (`deleteAudio`)
- `GET /api/projects/:project_id/info` — obtener project info (`getProjectInfo`)
- `POST /api/projects/:project_id/info` — guardar project info (`saveProjectInfo`)
- `POST /api/projects` — crear proyecto (`createProject`)
- `DELETE /api/projects/:project_id` — borrar proyecto (`deleteProject`)

Errores y buenas prácticas

- Para subidas de archivos: usar timeouts largos y mostrar estado de subida (spinner/progress).
- Para llamadas de TTS/LLM: usar polling con `check_status` endpoints y mostrar progreso al usuario.
- Manejar errores HTTP 4xx/5xx mostrando mensajes claros y logueando respuesta completa para debugging.

Ejemplo de flujo end-to-end (resumido):

1. `createProject` (opcional) para obtener `project_id`.
2. `uploadPdf(file, project_id)` para subir el PDF.
3. Poll con `checkLlmStatus(project_id)` y `checkTtsStatus(project_id)` hasta completado.
4. `listRecords(project_id)` para obtener registros y reproducir mp3 vía `apiBase/voices/...`.

Tips para configurar en desarrollo

- En `frontend/.env` o variables de entorno de Vite, definir `VITE_API_URL=http://localhost:8000`.
- En producción apuntar a la URL pública del backend.
