# Backend — Configuración (prompt guía)

Prompt para generar la documentación completa de configuración del backend. Usa la información sacada de `backend/app/config.py` y amplía con ejemplos operativos.

Variables detectadas (extraídas de `backend/app/config.py`):

- `OPENAI_API_KEY` — clave API para el servicio LLM/OpenAI. Valor por defecto: `""` (vacío). Sensible: sí.
- `OPENAI_API_BASE` — URL base alternativa para la API OpenAI (opcional). Sensible: sí/depende.
- `OPENAI_MODEL_LLM` — modelo LLM por defecto. Valor por defecto: `gpt-4o-mini`.
- `OPENAI_MODEL_TTS` — modelo TTS por defecto. Valor por defecto: `gpt-4o-mini-tts`.
- `DEFAULT_VOICE_Q` — voice id por defecto para el presentador (Q). Valor por defecto: `onyx`.
- `DEFAULT_VOICE_R` — voice id por defecto para el entrevistado (R). Valor por defecto: `sage`.
- `BASE_URL` — URL base del servicio (uso en links y callbacks). Valor por defecto: `http://localhost`.
- `PORT` — puerto en el que corre el backend. Valor por defecto: `8000`.

Tareas que el generador de docs debe realizar cuando ejecute este prompt:

1. Verificar en el repositorio si hay más variables de configuración en otros módulos y añadirlas a la lista.
2. Para cada variable: documentar propósito, tipo (string/int/bool), valor por defecto, ejemplo válido y si es sensible.
3. Proponer mecanismos seguros para inyectar secretos en producción (Docker secrets, Vault, environment variables en el host) y mostrar ejemplos de `docker-compose.yml` con `env_file` o `secrets`.
4. Generar un `example.env` para desarrollo con valores no sensibles y notas sobre cuándo cambiarlos para producción.
5. Indicar rutas críticas relacionadas con configuración (por ejemplo `STATIC_VOICES_PATH`) y recomendaciones de permisos.

Ejemplo de `example.env` (sugerido para desarrollo):

```
OPENAI_API_KEY=
OPENAI_API_BASE=
OPENAI_MODEL_LLM=gpt-4o-mini
OPENAI_MODEL_TTS=gpt-4o-mini-tts
DEFAULT_VOICE_Q=onyx
DEFAULT_VOICE_R=sage
BASE_URL=http://localhost
PORT=8000
```

Formato final esperado del documento:

- Tabla con todas las variables (nombre, tipo, default, ejemplo, sensible Y/N).
- Sección con recomendaciones de seguridad para secretos.
- Ejemplo `docker-compose` snippet mostrando cómo cargar el `env_file` y/o secrets.
- Notas operacionales sobre permisos de archivos y rutas de volúmenes.
