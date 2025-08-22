# Backend — Voces y `static/voices` (prompt guía)

Prompt que debe usarse para generar la documentación completa de voces:

1. Escanea la carpeta real `backend/app/static/voices/` y lista todos los `VOICE_ID` disponibles.
2. Para cada `VOICE_ID` extraer el contenido de `<VOICE_ID>.info` y tomarlo como ejemplo.
3. Definir el esquema exacto de `entrevista.csv`: columnas, tipo de datos, valores permitidos y significado de cada columna (ej. `segment_id: int`, `role: p|r`, `status: pending|ready|error`).
4. Documentar la estructura de carpetas por `VOICE_ID` (subcarpetas numéricas para segmentos y rutas de mp3) y ejemplos de paths.
5. Añadir pasos operativos: crear nueva voz, añadir `.info`, forzar regeneración TTS, restaurar `entrevista.csv` desde `.bak`, y checklist de permisos (owner/group/mode).
6. Incluir ejemplos de `entrevista.csv` y fragmentos reales tomados del repositorio.

Salida esperada: documento con ejemplos reales, esquema CSV formal y pasos accionables para operadores.
