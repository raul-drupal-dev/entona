# Overview — ¿Qué es este proyecto?

Resumen corto:

Este proyecto es una aplicación para procesar entrevistas en PDF, extraer su contenido, estructurarlo en CSVs y generar audios por voz (TTS) para cada segmento. Combina un backend que hace parsing de PDFs, procesamiento con LLMs y un motor TTS, y un frontend para gestionar proyectos, voces y escuchar los audios generados.

Objetivos:

- Facilitar la digitalización y reproducción de entrevistas en audio.
- Permitir añadir y gestionar múltiples voces y versiones por proyecto.
- Mantener un almacenamiento simple basado en CSVs y una estructura de carpetas en `static/voices`.

Público objetivo:

- Periodistas y productoras que quieran convertir entrevistas escritas a audio.
- Desarrolladores que quieran adaptar el pipeline (parsing -> LLM -> TTS).

Resumen de funcionalidades:

- Subida y parsing de PDFs.
- Procesamiento semántico / resumen / extracción via LLM.
- Generación de archivos CSV por entrevista y por voz.
- Servicio de TTS que produce mp3 por segmento y voz.
- Interfaz web para reproducir y gestionar audios.

Enlaces rápidos:

- `getting-started.md` — cómo levantar el proyecto.
- `architecture.md` — diagrama de componentes.
- `backend/voices.md` — formato y estructura de voces.
