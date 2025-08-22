# TODOs y Ideas — Entona

Fecha: 2025-08-22

Este archivo centraliza los TODOs, ideas y mejoras para el proyecto. Usa esto como lista viva: crea issues a partir de las entradas, prioriza y asigna responsables.

## Requerimientos/Ideas del usuario (originales)

1. Hacer customizable el uso del LLM desde el frontend

   - Permitir al usuario elegir proveedor (OpenAI, Anthropic, Mistral, local LLM proxy, etc.).
   - Exponer opciones de temperatura, max_tokens, prompt templates y contexto.

2. Poder elegir el patrón de la entrevista (ahora está fijo con "pregunta" | "respuesta") o crear un analizador previo con LLM que adapte la entrevista al formato requerido.

   - Añadir un selector de plantilla/patrón en el frontend.
   - Opcional: pipeline de preprocesamiento que use un LLM para transformar transcripciones/archivos al esquema esperado.

3. Poder agregar una Base de Datos.

   - Diseñar migraciones y una abstracción de almacenamiento (SQLite para dev, Postgres para prod).
   - Repositorio/DAO para entrevistas, registros de TTS, metadatos de voces, usuarios y permisos.

4. Agregar más LLM (ahora solo está disponible OpenAI) y otras APIs para generar audio.

   - Implementar adaptadores/providers (strategy pattern) para cada API.
   - Soportar proveedores de TTS (ElevenLabs, Google Cloud TTS, Coqui, AWS Polly, servidores TTS locales).

5. Poder crear un servicio contenedor nuevo con un TTS para ejecutarlo de forma local.
   - Plantilla Docker + Compose para un servicio TTS local (ej. Coqui/torch o TTS rápido en C++)
   - Documentación de cómo enlazarlo con la app (endpoints, autenticación mínima).

## Ideas adicionales 

- API de autenticación y permisos (mínimo: API key o JWT).
- Pipeline de almacenamiento de audio: almacenamiento en disco vs S3 (configurable).
- Cache de respuestas LLM para evitar gasto repetido (TTL configurable).
- Sistema de métricas y logging estructurado (Prometheus + Grafana o logs JSON).
- Tests automáticos: unitarios y de integración para rutas principales y services.
- CI/CD: GitHub Actions para tests, lint y despliegue de imágenes Docker.
- Documentación de contribución (CONTRIBUTING.md) y reglas de formato (prettier/eslint/black/isort).
- Internationalization (i18n) y accesibilidad en el frontend.
- Web UI: vista previa de audio, batch uploads, gestión de voces por proyecto.
- Versionado del proyecto (CHANGELOG.md) y releases semánticos.
- Soporte offline limitado: permitir TTS local y cola de trabajos cuando no hay Internet.
- Estrategia de secrets: Vault / GitHub Secrets para despliegues.
- Export/import de proyectos (JSON/CSV) y snapshots de entrevistas.
- Scheduler/Worker (Celery/RQ/Sidekiq) para tareas pesadas como generación de audio, transcripción y análisis LLM.
- Crear un sistema de colas (queue) para gestionar jobs de forma asíncrona: encolar trabajos de generación de audio/LLM, seguimiento de estados, retries y priorización. Tecnologías sugeridas:    Redis + RQ/Celery, RabbitMQ + Celery o un broker ligero según el entorno.
- Limites y rate limiting para proteger APIs de terceros.
- UX: modo de edición colaborativa, comentarios por registro, timeline de QA.
- Contador de tokens usados, para tener una visualización real.

## Contrato pequeño (inputs/outputs/errores)

- Inputs: transcripciones, audio, plantillas de entrevista, configuración de provider, metadatos del proyecto.
- Outputs: archivos de audio, CSVs de entrevista, logs/estados, entradas persistidas en DB.
- Errores: proveer estados claros (pendiente, en_progreso, error, completado) y mensajes legibles.

## Prioridad propuesta (rápido impacto / coste)

1. Alta impacto, bajo coste

   - Añadir adaptador para otro TTS cloud sencillo (ej. ElevenLabs).
   - Soporte básico para elegir LLM provider desde frontend (UI + switch backend).
   - Agregar archivo de TODO (ya hecho).

2. Medio

   - Migración a BD (Postgres) con modelos mínimos.
   - Cache básico para respuestas LLM.
   - Tests unitarios básicos.

3. Alto coste
   - Servicio TTS local con GPU/CPU optimizado.
   - Pipeline LLM avanzado para analizar y transformar entrevistas.

## Siguientes pasos sugeridos

- Crear issues a partir de las entradas prioritarias.
- Implementar un endpoint y UI para seleccionar proveedor LLM (básico) — 1 PR pequeño.
- Añadir GitHub Action para test y lint básicos.

## Notas operativas

- Asumir que el repositorio ya usa Python (backend) y React (frontend). Mantener consistencia con las dependencias y estilo actuales.
- Para cualquier cambio que añada nuevas dependencias, incluir tests pequeños y actualizar `requirements.txt` o `package.json`.
