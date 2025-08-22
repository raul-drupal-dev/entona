# Entrevista TTS App

Herramienta para:

1. extraer P/R de un PDF,
2. limpiar textos y generar prompts de entonación con LLM,
3. editar en un frontend UX-friendly, y
4. generar audios TTS por bloque.

## Decisiones clave

- **LLM**: OpenAI `gpt-4o-mini` para corrección de español y generación de entonaciones.
- **TTS**: OpenAI `gpt-4o-mini-tts` (rápido, voces: `onyx` para masculino, `sage` para femenino). Ajustable vía env.
- **Frontend**: React + Tailwind con tarjetas (cards), edición inline y popups para regenerar audio con prompt custom.
- **Backend**: FastAPI. Persistencia en CSV (`voices/entrevista.csv`) y audios mp3 por bloque (`voices/{n}/p{n}.mp3`, `voices/{n}/r{n}.mp3`).
- **Docker**: `docker-compose` con dos servicios (backend y frontend).

## Requisitos

- Docker y Docker Compose
- Variable de entorno `OPENAI_API_KEY`

```bash
export OPENAI_API_KEY=sk-...
```

Opcional: `OPENAI_API_BASE` si usas Azure OpenAI o proxy compatible.

## Puesta en marcha

```bash
git clone <este_repo>
cd entrevista-tts
docker compose up --build
```

````markdown
# Entrevista TTS App

Aplicación para extraer pares Pregunta/Respuesta (P/R) de un PDF, limpiar y generar prompts de entonación con un LLM, editar el resultado desde un frontend amigable y generar audios TTS por bloque.

## Decisiones clave

- LLM por defecto: `gpt-4o-mini` (configurable via `OPENAI_MODEL_LLM`).
- TTS por defecto: `gpt-4o-mini-tts` (configurable via `OPENAI_MODEL_TTS`). Voces por defecto: `onyx` (preguntas) y `sage` (respuestas). Estos valores están en `backend/app/config.py`.
- Frontend: React + Vite + Tailwind. Edición inline, tarjetas por registro y modales para prompts ad-hoc.
- Backend: FastAPI. Persistencia ligera en CSV dentro de `backend/app/static/voices/` y audios mp3 organizados por bloque.
- Contenedores: Docker Compose (servicios `backend` y `frontend`).

## Requisitos

- Docker y Docker Compose (o Docker Desktop).
- Variable de entorno `OPENAI_API_KEY` con permiso para los modelos que uses.
  ```bash
  export OPENAI_API_KEY="sk-..."
  ```
````

- Opcional: `OPENAI_API_BASE` si usas Azure OpenAI o un proxy compatible.

Variables importantes (valores por defecto en `backend/app/config.py`):

- `OPENAI_MODEL_LLM` (default `gpt-4o-mini`)
- `OPENAI_MODEL_TTS` (default `gpt-4o-mini-tts`)
- `DEFAULT_VOICE_Q` (default `onyx`)
- `DEFAULT_VOICE_R` (default `sage`)

## Puesta en marcha (desarrollo)

Clona el repo y levanta los servicios en modo desarrollo (hot-reload para frontend y backend):

```bash
git clone <este_repo>
cd tts_interview_app
docker compose up --build
```

- Frontend en: http://localhost:5173 (puerto configurable por `VITE_PORT` en `.env`)
- Backend (FastAPI) en: http://localhost:8000
- Documentación del backend (Swagger): http://localhost:8000/docs

Notas:

- El `docker-compose.yml` del repo define el backend con `uvicorn` en modo `--reload` y monta `backend/app/static/voices` como volumen para persistir audios/CSV.
- En desarrollo el frontend usa `Dockerfile.dev` y un volumen para permitir hot-reload.

## Desarrollo local sin Docker (opcional)

Si prefieres ejecutar localmente sin Docker, asegúrate de tener Python 3.11+ y Node 18+.

Backend (ejemplo):

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Frontend (ejemplo):

```bash
cd frontend
npm install
npm run dev -- --host
```

## Despliegue en producción (resumen)

Principales cambios al pasar a producción:

1. En `docker-compose.yml` usar el `Dockerfile` de producción para `frontend` (el que construye y sirve con Nginx) en lugar de `Dockerfile.dev`.
2. Eliminar el volumen que monta `./frontend` en el contenedor frontend.
3. Mapear el puerto 80 si quieres servir en el host: `ports: - "80:80"`.
4. En producción evita `--reload` en `uvicorn` y usa variables de entorno seguras para claves.

Luego reconstruye y levanta:

```bash
docker compose up --build
```

## Flujo de uso

1. Subir PDF → el backend extrae pares P/R y crea/actualiza el CSV en `backend/app/static/voices/{project}/entrevista.csv`.
2. Generar limpieza y entonaciones → UI llama al endpoint del LLM; se completan columnas de entonación en el CSV.
3. Editar en UI → edición inline; los cambios se guardan al perder foco (`blur`).
4. Generar audios → por tarjeta o global; los MP3 quedan en `backend/app/static/voices/{project}/{n}/`.

## Formato del CSV

Cabeceras esperadas (ejemplo):

```
num,pregunta,respuesta,entonacion_p,entonacion_r,voice_q,voice_r,...
```

Cada fila representa un bloque P/R. En `backend/app/static/voices/` se crean carpetas por proyecto/voz donde se almacenan los MP3.

## Notas de voces e idioma

- Por defecto: Preguntas → `DEFAULT_VOICE_Q` (`onyx`), Respuestas → `DEFAULT_VOICE_R` (`sage`).
- El LLM y los prompts están orientados a Español (España) por defecto. Puedes cambiarlo en los prompts si necesitas otra variante.

## Estructura relevante del proyecto

- `backend/app/` : código FastAPI (routers, servicios, utils, static/voices)
- `frontend/` : app React (Vite + Tailwind)
- `docker-compose.yml` : orquesta frontend + backend

## Extensiones futuras (ideas)

- Soporte para múltiples proyectos/PDFs y gestión de proyectos.
- Versionado/auditoría del CSV.
- Integración con otros proveedores TTS (Coqui, ElevenLabs) en `backend/app/services/tts_service.py`.

---

Si quieres, puedo:

- Ajustar el README para añadir ejemplos concretos de `.env` y variables.
- Añadir una sección de contribución y comandos de test si quieres que incluya tests mínimos.

```

```
