# Backend — Índice

Aquí documentamos todo lo relativo al backend (API, servicios, configuración y estructura de `static/voices`).

Contenido:

- `api.md` — Endpoints, ejemplos request/response.
- `services.md` — Descripción de servicios: `llm_processing`, `tts_service`, `csv_store`, `pdf_parser`.
- `voices.md` — Estructura de `static/voices`, formato `.info` y `entrevista.csv`.
- `config.md` — Variables de entorno y configuración (`config.py`).
- `development.md` — Ejecutar backend en modo desarrollo, tests y linters.

Notas rápidas:

- El código del backend se encuentra en `backend/app/`.
- Revisa `backend/requirements.txt` para dependencias.
- `backend/Dockerfile` contiene la receta para construir la imagen del servidor.
