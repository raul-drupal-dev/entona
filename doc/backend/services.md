# Backend — Servicios (prompt guía)

Prompt para generar documentación completa de servicios del backend:

- Enumerar cada módulo en `backend/app/services/` y describir su responsabilidad principal.
- Para cada servicio incluir: API pública (funciones/métodos expuestos), entradas esperadas, salidas, formatos (JSON/CSV), y errores comunes.
- Incluir ejemplos de uso (snippets) y tiempos aproximados de ejecución.
- Documentar dependencias externas (APIs LLM, proveedores TTS) y parámetros de configuración relevantes.
- Añadir recomendaciones de retry/backoff y límites de concurrencia si aplica.

Salida esperada: un bloque por servicio con contrato (input/output), ejemplos y notas operacionales.

Continuar creando archivos prompts faltantes.
