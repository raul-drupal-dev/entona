from __future__ import annotations

from pathlib import Path
from openai import OpenAI
import logging
from ..config import settings
from ..utils import get_project_dir
from app.services.project_logger import log

MALE_DEFAULT = lambda: settings.DEFAULT_VOICE_Q  # onyx
FEMALE_DEFAULT = lambda: settings.DEFAULT_VOICE_R  # sage

def get_client() -> OpenAI:
    if settings.OPENAI_API_BASE:
        return OpenAI(api_key=settings.OPENAI_API_KEY, base_url=settings.OPENAI_API_BASE)
    return OpenAI(api_key=settings.OPENAI_API_KEY)

def synthesize(input_text: str, out_path: Path, voice: str, instructions: str | None = None) -> Path:
    """Synthesize speech.

    - input_text: el texto que se envía como `input` al SDK.
    - instructions: si se proporciona, se envía como `instructions` separado.
    """
    out_path.parent.mkdir(parents=True, exist_ok=True)
    client = get_client()

    # Construir kwargs para evitar pasar instructions cuando sea None
    kwargs = {
        "model": settings.OPENAI_MODEL_TTS,
        "voice": voice,
        "input": input_text,
        "response_format": "mp3",
    }
    # Incluir la clave `instructions` incluso si es una cadena vacía.
    if instructions is not None:
        kwargs["instructions"] = instructions

    # Loggear los kwargs que vamos a pasar al cliente OpenAI para debugging.
    # Note: synthesize may be called outside a project context; callers should log with project_id when available.
    try:
        # truncar el campo 'input' para no loggear textos enormes
        safe_kwargs = {k: (v if k != "input" else (v[:200] + "...") if v and len(v) > 200 else v) for k, v in kwargs.items()}
    except Exception:
        safe_kwargs = {k: type(v).__name__ for k, v in kwargs.items()}

    # OpenAI Audio TTS – MP3
    # The actual network call is left as-is; callers can capture start/end via project_logger
    with client.audio.speech.with_streaming_response.create(**kwargs) as resp:
        resp.stream_to_file(str(out_path))

    return out_path

def synthesize_block(
    project_id: str,
    num: int,
    pregunta: str,
    respuesta: str,
    entonacion_p: str | None = None,
    entonacion_r: str | None = None,
    voice_q: str | None = None,
    voice_r: str | None = None,
) -> dict:
    """Sintetiza pregunta y respuesta por separado, pasando las entonaciones como `instructions`.

    entonacion_p / entonacion_r: se usan como `instructions` si están presentes.
    """
    voice_q = voice_q or MALE_DEFAULT()
    voice_r = voice_r or FEMALE_DEFAULT()

    log(project_id, f"synthesize_block called num={num} voice_q={voice_q} voice_r={voice_r}")
    d = get_project_dir(project_id) / str(num)
    p_out = d / f"p{num}.mp3"
    r_out = d / f"r{num}.mp3"

    try:
        synthesize(pregunta, p_out, voice_q, instructions=(entonacion_p or None))
        synthesize(respuesta, r_out, voice_r, instructions=(entonacion_r or None))
        log(project_id, f"synthesize_block completed for num={num} outputs p={p_out} r={r_out}")
    except Exception as e:
        log(project_id, f"synthesize_block failed for num={num}: {e}", level="ERROR")
        raise
    return {"p": str(p_out), "r": str(r_out)}
