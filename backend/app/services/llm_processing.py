from __future__ import annotations
from openai import OpenAI
from ..config import settings
from .csv_store import read_csv, write_csv
from .project_info import read_info
from pydantic import BaseModel
import json
from app.services.project_logger import log

SYSTEM_PROMPT = (
    "Eres un asistente que corrige y normaliza texto y sugiere pautas de entonación para TTS. "
    "Para cada par pregunta/respuesta, devuelve versiones limpiadas y naturales del texto y una sugerencia de entonación orientada a TTS. "
    "Las sugerencias deben ser concisas, indicar ritmo, pausas, tono y cualquier marca relevante para la voz TTS. "
    "Mantén el idioma y las variantes del texto original a menos que el contexto del proyecto indique lo contrario. "
    "Usa el contexto si se proporciona para darle más precisión a las sugerencias."
)

# Plantilla breve para entonación – se puede editar en UI
ENTONACION_Q = (
    "Pauta breve para la pregunta (entrevistador): indica tono, ritmo, pausas y marcas expresivas (por ejemplo: nervioso, enérgico, calmado). "
    "Adáptala según la configuración del proyecto (idioma, acento y voz)."
)
ENTONACION_R = (
    "Pauta breve para la respuesta (entrevistada): indica tono, ritmo, pausas y marcas expresivas (por ejemplo: solemne, sereno, emocional). "
    "Adáptala según la configuración del proyecto (idioma, acento y voz)."
)

def get_client() -> OpenAI:
    if settings.OPENAI_API_BASE:
        return OpenAI(api_key=settings.OPENAI_API_KEY, base_url=settings.OPENAI_API_BASE)
    return OpenAI(api_key=settings.OPENAI_API_KEY)

def process_all(project_id: str, overwrite_texts: bool = True, overwrite_prompts: bool = True, project_prompt: str | None = None) -> int:
    """Recorre el CSV del `project_id` y reescribe pregunta/respuesta y/o entonaciones con el LLM.

    project_prompt: texto opcional proporcionado por el usuario que se incluirá como contexto adicional
    para que el LLM tenga en cuenta durante la generación de limpieza y entonaciones.
    """
    log(project_id, f"process_all called overwrite_texts={overwrite_texts} overwrite_prompts={overwrite_prompts}")
    df = read_csv(project_id)
    if df.empty:
        log(project_id, "process_all: CSV vacío, nada que procesar")
        return 0

    client = get_client()

    for i, row in df.iterrows():
        pregunta = row["pregunta"]
        respuesta = row["respuesta"]

        # Pedimos al modelo que devuelva JSON compacto
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
        ]

        # Añadimos contexto adicional proporcionado por el usuario si existe
        # Importante: el prompt del proyecto se manda como role:"user" (contexto), no como system
        
        try:
            info = read_info(project_id) or {}
            interviewer = info.get("interviewer", {})
            interviewee = info.get("interviewee", {})
            lang = interviewer.get("language") or interviewee.get("language") or "es"
            acc = interviewer.get("accent") or interviewee.get("accent") or ""
            v_int = interviewer.get("voice", "")
            v_intv = interviewee.get("voice", "")
            proj_ctx = (
                f"idioma={lang}, acento={acc}. "
                f"Voz entrevistador={v_int}, voz entrevistada={v_intv}. "
                "Ten en cuenta este contexto (idioma, acento y voces) al proponer entonaciones y adaptar la pronunciación."
            )
        except Exception:
            proj_ctx = ""

        messages.append(
            {
                "role": "user",
                "content": f"""
                Devuelve JSON con las claves: 
                {{
                "pregunta_limpia": string,
                "respuesta_limpia": string,
                "entonacion_p": string,
                "entonacion_r": string
                }}

                CONTEXTO (puede estar vacío):
                {project_prompt}
                {proj_ctx}

                TEXTO ORIGINAL:
                PREGUNTA: {pregunta}
                RESPUESTA: {respuesta}
                """,
            }
        )

        class LLMOutput(BaseModel):
            pregunta_limpia: str
            respuesta_limpia: str
            entonacion_p: str
            entonacion_r: str

        # Usamos Responses API (client.responses.create) para estructura JSON
        # Log the exact input sent to the LLM for this project (daily project logs)
        log(project_id, f"LLM input: {json.dumps(messages, ensure_ascii=False)}", level="DEBUG")

        try:
            resp = client.responses.parse(
                model=settings.OPENAI_MODEL_LLM,
                input=messages,
                text_format=LLMOutput,
            )
        except Exception as e:
            log(project_id, f"LLM call failed for record index={i}: {e}", level="ERROR")
            raise

        try:
            data = resp.output_parsed  # SDK >=1.40
            if not isinstance(data, dict):
                # Fallback: extraer texto
                txt = resp.output[0].content[0].text or "{}"
                data = json.loads(txt)
        except Exception:
            # Fallback robusto
            txt = getattr(resp, "output_text", "{}")
            data = json.loads(txt or "{}")

        if overwrite_texts and data.get("pregunta_limpia"):
            df.at[i, "pregunta"] = data["pregunta_limpia"]
        if overwrite_texts and data.get("respuesta_limpia"):
            df.at[i, "respuesta"] = data["respuesta_limpia"]

        if overwrite_prompts:
            df.at[i, "entonacion_p"] = data.get("entonacion_p", ENTONACION_Q)
            df.at[i, "entonacion_r"] = data.get("entonacion_r", ENTONACION_R)

    write_csv(df, project_id)
    log(project_id, f"process_all completed - wrote {len(df)} records back to CSV")
    return len(df)


def process_one(project_id: str, num: int, overwrite_texts: bool = True, overwrite_prompts: bool = True, part: str = "both", project_prompt: str | None = None) -> dict:
    """Procesa un único registro identificado por `num`.

    part: 'pregunta' | 'respuesta' | 'both' – decide qué campos actualizar.
    Devuelve el diccionario del registro actualizado.
    """
    log(project_id, f"process_one called num={num} part={part} overwrite_texts={overwrite_texts} overwrite_prompts={overwrite_prompts}")
    df = read_csv(project_id)
    if df.empty:
        log(project_id, "process_one failed - CSV vacío o proyecto no encontrado", level="ERROR")
        raise ValueError("CSV vacío o proyecto no encontrado")

    idx = df.index[df["num"] == num]
    if len(idx) == 0:
        raise ValueError("Registro no encontrado")

    i = idx[0]
    pregunta = df.at[i, "pregunta"]
    respuesta = df.at[i, "respuesta"]

    client = get_client()

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
    ]

    # include project context (lang/accent/voices) and optional project-level prompt
    try:
        info = read_info(project_id) or {}
        interviewer = info.get("interviewer", {})
        interviewee = info.get("interviewee", {})
        lang = interviewer.get("language") or interviewee.get("language") or "es"
        acc = interviewer.get("accent") or interviewee.get("accent") or ""
        v_int = interviewer.get("voice", "")
        v_intv = interviewee.get("voice", "")
        proj_ctx = (
            f"idioma={lang}, acento={acc}. "
            f"Voz entrevistador={v_int}, voz entrevistada={v_intv}. "
            "Ten en cuenta este contexto (idioma, acento y voces) al proponer entonaciones y adaptar la pronunciación."
        )
    except Exception:
        proj_ctx = ""

    messages.append(
        {
            "role": "user",
            "content": f"""
                Devuelve JSON con las claves: 
                {{
                "pregunta_limpia": string,
                "respuesta_limpia": string,
                "entonacion_p": string,
                "entonacion_r": string
                }}

                CONTEXTO (puede estar vacío):
                {project_prompt or ''}
                {proj_ctx}

                TEXTO ORIGINAL:
                PREGUNTA: {pregunta}
                RESPUESTA: {respuesta}
                """,
        }
    )

    class LLMOutput(BaseModel):
        pregunta_limpia: str
        respuesta_limpia: str
        entonacion_p: str
        entonacion_r: str

    # Log the exact input sent to the LLM for this project (daily project logs)
    log(project_id, f"LLM input: {json.dumps(messages, ensure_ascii=False)}", level="DEBUG")

    try:
        resp = client.responses.parse(
            model=settings.OPENAI_MODEL_LLM,
            input=messages,
            text_format=LLMOutput,
        )
    except Exception as e:
        log(project_id, f"LLM call failed for num={num}: {e}", level="ERROR")
        raise


    try:
        data = resp.output_parsed
        if not isinstance(data, dict):
            txt = resp.output[0].content[0].text or "{}"
            data = json.loads(txt)
    except Exception:
        txt = getattr(resp, "output_text", "{}")
        data = json.loads(txt or "{}")

    # Aplicar cambios respetando el parámetro `part`
    if part in ("pregunta", "both") and overwrite_texts and data.get("pregunta_limpia"):
        df.at[i, "pregunta"] = data["pregunta_limpia"]
    if part in ("respuesta", "both") and overwrite_texts and data.get("respuesta_limpia"):
        df.at[i, "respuesta"] = data["respuesta_limpia"]

    if part in ("pregunta", "both") and overwrite_prompts:
        df.at[i, "entonacion_p"] = data.get("entonacion_p", ENTONACION_Q)
    if part in ("respuesta", "both") and overwrite_prompts:
        df.at[i, "entonacion_r"] = data.get("entonacion_r", ENTONACION_R)

    write_csv(df, project_id)

    return df.loc[i].to_dict()
