# Getting started — Guía rápida

Resumen: pasos mínimos para poner el proyecto en marcha en tu máquina (desarrollo) o con Docker.

Prerequisitos:

- Git
- Docker y Docker Compose (recomendado para reproductibilidad)
- Python 3.11+ (si quieres ejecutar solo el backend en local sin Docker)
- Node.js 18+ y npm/yarn (para el frontend en local)

Clonar el repositorio:

```bash
git clone <repo-url>
cd tts_interview_app
```

Levantar con Docker Compose (recomendado):

```bash
docker-compose up --build
```

Comprobar servicios:

- Backend suele quedar expuesto en `http://localhost:8000` (ver `docker-compose.yml`).
- Frontend en `http://localhost:3000` o servido por nginx según configuración.

Ejecutar backend en local (sin Docker):

```bash
# entra a la carpeta backend
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
# ejecutar (según main.py)
python -m app.main
```

Ejecutar frontend en local:

```bash
cd frontend
npm install
npm run dev
```

Primer flujo rápido (smoke test):

1. Accede al frontend.
2. Sube un PDF de ejemplo desde la UI o coloca uno en `backend/static/` según la configuración.
3. Verifica que se genere `entrevista.csv` dentro de `backend/app/static/voices/<VOICE_ID>/` y que aparezcan mp3 en las carpetas por segmento (después de correr el TTS).

Archivos útiles:

- `docker-compose.yml` — orquestación de servicios.
- `backend/` — código del servidor.
- `frontend/` — código cliente.

Si algo falla, revisa los logs de Docker Compose:

```bash
docker-compose logs -f
```
