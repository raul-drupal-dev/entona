from fastapi import APIRouter, HTTPException, BackgroundTasks
from ..services import csv_store
from ..services import project_info
from ..services.tts_service import synthesize_block, synthesize
from ..models import TTSOneRequest
from ..utils import get_project_dir
from pathlib import Path
from app.services.project_logger import log

router = APIRouter(prefix="/api", tags=["tts"]) 


def run_tts_all_background(project_id: str) -> None:
    """Worker that runs the TTS bulk and updates status CSV."""
    log(project_id, "run_tts_all_background started")
    status_path = csv_store.init_status_csv(project_id)
    log(project_id, f"Status CSV initialized at {status_path}")
    # Read project defaults (.info) once at start
    info = project_info.read_info(project_id)
    try:
        for num, row in csv_store.iter_records(project_id):
            try:
                # pass voices from info when synthesizing
                synthesize_block(
                    project_id,
                    num,
                    row["pregunta"],
                    row["respuesta"],
                    entonacion_p=row.get("entonacion_p"),
                    entonacion_r=row.get("entonacion_r"),
                    voice_q=info.get("voices", {}).get("interviewer"),
                    voice_r=info.get("voices", {}).get("interviewee"),
                )
                log(project_id, f"synthesized block num={num}")
                csv_store.mark_status_processed(project_id, num)
            except Exception as e:
                # mark failed with a short error message
                log(project_id, f"synthesis failed num={num}: {e}", level="ERROR")
                csv_store.mark_status_failed(project_id, num, error=str(e))
    finally:
        log(project_id, "run_tts_all_background finished")
        # Eliminar el CSV de estado si todas las filas fueron procesadas o marcadas como fallidas
        status = csv_store.read_status(project_id)
        processed = status.get("processed", 0)
        failed = status.get("failed", 0)
        total = status.get("total", 0)
        if total > 0 and (processed + failed) >= total:
            csv_store.remove_status_csv(project_id)
            log(project_id, f"run_tts_all_background: all done processed={processed} failed={failed} total={total} - status CSV removed")
        else:
            log(project_id, f"run_tts_all_background: not removing status CSV processed={processed} failed={failed} total={total}")


@router.post("/tts/start/{project_id}")
def tts_start(project_id: str, background_tasks: BackgroundTasks):
    """Start bulk TTS in background. Returns immediately. Frontend should poll `/tts/check_status` and `/tts/status_rows` for log."""
    # initialize status csv immediately
    csv_store.init_status_csv(project_id)
    log(project_id, "tts_start called - background TTS scheduled")
    background_tasks.add_task(run_tts_all_background, project_id)
    return {"ok": True}


@router.get('/projects/{project_id}/info')
def get_project_info(project_id: str):
    log(project_id, "get_project_info called")
    return project_info.read_info(project_id)


@router.post('/projects/{project_id}/info')
def post_project_info(project_id: str, body: dict):
    # write and return the final saved content so caller can confirm what was persisted
    log(project_id, "post_project_info called - updating project info")
    final = project_info.write_info(project_id, body)
    return {"ok": True, "saved": final}


@router.get("/tts/check_status/{project_id}")
def tts_check_status(project_id: str):
    """Devuelve el número procesado y total leyendo el CSV temporal de estado.

    Respuesta: {processed: int, total: int}
    """
    log(project_id, "tts_check_status called")
    return csv_store.read_status(project_id)


@router.get("/tts/status_rows/{project_id}")
def tts_status_rows(project_id: str):
    """Return the status rows for a project: list of {num, processed, failed, error}.
    Useful as a final log."""
    log(project_id, "tts_status_rows called")
    return {"rows": csv_store.get_status_rows(project_id)}

@router.post("/tts/{project_id}/{num}")
def tts_one(project_id: str, num: int, body: TTSOneRequest):
    log(project_id, f"tts_one called num={num} part={body.part}")
    df = csv_store.read_csv(project_id)
    idx = df.index[df["num"] == num]
    if len(idx) == 0:
        raise HTTPException(404, "Registro no encontrado")
    row = df.loc[idx[0]]

    part = body.part.lower()
    if part not in ("pregunta", "respuesta"):
        raise HTTPException(400, "part debe ser 'pregunta' o 'respuesta'")

    voice = body.voice_override
    if not voice:
        voice = "onyx" if part == "pregunta" else "sage"

    text = row[part]
    out_dir = get_project_dir(project_id) / str(num)
    out_dir.mkdir(parents=True, exist_ok=True)
    out_file = out_dir / (f"p{num}.mp3" if part == "pregunta" else f"r{num}.mp3")

    # En lugar de concatenar guidance+texto, pasamos `input` e `instructions` separados
    guidance = (body.prompt_override or row["entonacion_p" if part == "pregunta" else "entonacion_r"]) or None

    # synthesize ahora acepta (input_text, out_path, voice, instructions=None)
    try:
        log(project_id, f"synthesizing one file num={num} out={out_file} voice={voice}")
        synthesize(text, out_file, voice, instructions=guidance)
        log(project_id, f"tts_one completed num={num} file={out_file}")
    except Exception as e:
        log(project_id, f"tts_one failed num={num}: {e}", level="ERROR")
        raise HTTPException(500, str(e))

    return {"ok": True, "file": str(out_file)}


@router.delete("/tts/{project_id}/{num}/{part}")
def tts_delete(project_id: str, num: int, part: str):
    """Eliminar los archivos de audio de un bloque.

    part: 'pregunta' | 'respuesta' | 'all'
    """
    p = part.lower()
    if p not in ("pregunta", "respuesta", "all"):
        raise HTTPException(400, "part debe ser 'pregunta', 'respuesta' o 'all'")

    out_dir = get_project_dir(project_id) / str(num)
    removed = []

    if p in ("pregunta", "all"):
        f = out_dir / f"p{num}.mp3"
        if f.exists():
            try:
                f.unlink()
                removed.append(str(f))
                log(project_id, f"tts_delete removed file {f}")
            except Exception:
                log(project_id, f"tts_delete failed to remove file {f}", level="ERROR")
                pass

    if p in ("respuesta", "all"):
        f = out_dir / f"r{num}.mp3"
        if f.exists():
            try:
                f.unlink()
                removed.append(str(f))
                log(project_id, f"tts_delete removed file {f}")
            except Exception:
                log(project_id, f"tts_delete failed to remove file {f}", level="ERROR")
                pass

    # intentar borrar el directorio si queda vacío
    try:
        if out_dir.exists() and not any(out_dir.iterdir()):
            out_dir.rmdir()
            log(project_id, f"tts_delete removed dir {out_dir}")
    except Exception:
        log(project_id, f"tts_delete failed to remove dir {out_dir}", level="ERROR")
        pass

    return {"ok": True, "removed": removed}
