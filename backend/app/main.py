from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .routers import parsing, records, tts, llm
from .utils import BASE_VOICES_DIR

app = FastAPI(title="Entrevista TTS API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"]
    ,allow_headers=["*"]
)

app.include_router(parsing.router)
app.include_router(records.router)
app.include_router(tts.router)
app.include_router(llm.router)

# Servimos /voices estáticamente para reproducir mp3 desde el frontend
app.mount("/voices", StaticFiles(directory=str(BASE_VOICES_DIR)), name="voices")

@app.get("/")
def root():
    return {"ok": True}


# Middleware adicional para asegurar que las respuestas siempre incluyan
# las cabeceras CORS necesarias. Esto cubre casos donde algún manejador
# (p.ej. StaticFiles o proxies inesperados) no coloque la cabecera.
@app.middleware("http")
async def ensure_cors_headers(request, call_next):
    response = await call_next(request)
    # Si por alguna razón no está presente, añadimos un Access-Control-Allow-Origin
    # para evitar el error de CORS en el frontend.
    if "access-control-allow-origin" not in {k.lower() for k in response.headers.keys()}:
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Credentials"] = "true"
        # añadir métodos y headers comunes en caso de preflight
        response.headers.setdefault("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD")
        response.headers.setdefault("Access-Control-Allow-Headers", "*")
    return response
