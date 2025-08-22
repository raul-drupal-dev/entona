# Arquitectura — Visión general

Este documento describe la arquitectura de alto nivel del sistema.

Secciones:

- Frontend (UI)
- Backend (APIs, services)
- Almacenamiento (filesystem para `static/voices`, CSVs)
- Integraciones externas (LLM, servicios TTS externos si aplica)

Diagrama (Mermaid):

```mermaid
flowchart TB
	subgraph FE [Frontend]
		A[UI (React)]
		A -->|API calls| B[API Client (axios)]
	end

	subgraph BE [Backend]
		C[API Gateway / Routers]
		C --> D[PDF Parser Service]
		C --> E[LLM Processing Service]
		C --> F[TTS Service]
		C --> G[CSV Store Service]
		C --> H[Project Info / Config]
	end

	subgraph EXT [External]
		I[OpenAI / LLM Provider]
		J[TTS Provider (optional external)]
	end

	subgraph STORAGE [Storage]
		K[Filesystem: static/voices/]
		L[Backups: entrevista.csv.bak*]
	end

	B -->|/api/*| C
	D -->|text segments| E
	E -->|rows / prompts| G
	E -->|prompts| F
	F -->|mp3 files| K
	G -->|CSV files| K
	E -->|calls| I
	F -->|if external| J
	C -->|reads/writes| K
	K -->|backup sync| L

```

Fallback (SVG):

If your Markdown renderer doesn't support Mermaid blocks, use the generated SVG instead:

![Arquitectura](./diagrams/architecture.svg)

## Documentación del Backend

Este documento proporciona una visión general de la arquitectura del backend.

### Secciones:

- APIs
- Servicios
- Integraciones

## Documentación del Frontend

Este documento proporciona una visión general de la arquitectura del frontend.

### Secciones:

- Componentes de UI
- Estado de la aplicación
- Integraciones con el backend

## Documentación Global

Este documento proporciona una visión general de la arquitectura del sistema completo.

### Secciones:

- Resumen de la arquitectura
- Consideraciones de seguridad
- Estrategias de escalabilidad
