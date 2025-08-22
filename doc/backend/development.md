# Backend — Desarrollo

Guía práctica y reproducible para desarrollar y probar el backend.

1. Requisitos

- Python 3.11+
- pip
- Docker y Docker Compose (opcional para desarrollo con contenedores)

2. Crear entorno virtual e instalar dependencias

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

3. Ejecutar la aplicación localmente

```bash
# opción simple
python -m app.main

# o con uvicorn si aplica
uvicorn app.main:app --reload --port 8000
```

4. Ejecutar en Docker Compose (modo desarrollo)

```bash
docker-compose up --build
# para logs en vivo
docker-compose logs -f
```

5. Tests y linters (si existen)

```bash
# pytest
# flake8 .
# black .
```

6. Debugging y logging

- Revisar `backend/app/project_logger.py` para configuración de logging.
- Usar `docker-compose logs <service>` o `docker-compose logs -f` para seguir eventos.

7. Añadir un nuevo router/service

1) Crear archivo en `backend/app/routers/` o `backend/app/services/`.
2) Importar y registrar el router en `backend/app/main.py`.
3) Añadir tests básicos y ejemplos de `curl` para comprobar.

8. Ejemplo rápido de `curl` para probar endpoint de health

```bash
curl -v http://localhost:8000/health
```

9. Notas de desarrollo

- Mantener `static/voices` en un volumen persistente si se usa Docker.
- Añadir variables de entorno en un `.env` durante el desarrollo y no commitearlas.
