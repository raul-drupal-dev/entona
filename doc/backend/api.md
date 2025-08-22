# Backend — API (prompt guía)

Prompt para generar la documentación completa de la API:

- Path: `/api/v1/projects`
- Método: `GET`
- Descripción: Listar proyectos
- Respuesta (200):

```json
{
  "projects": [{ "id": "abc", "name": "Proyecto 1" }]
}
```

Formato final esperado:

- Tabla de endpoints con columnas: Path | Método | Descripción | Auth | Ejemplo de request | Ejemplo de response
