
from fastapi import APIRouter, HTTPException
from ..services import csv_store
from ..models import Record, UpdateRecord, LLMProcessRequest, LLMProcessOneRequest
from ..services.llm_processing import process_all
from ..services.llm_processing import process_one
from ..services.project_info import read_info
from ..utils import get_csv_path, list_projects, BASE_VOICES_DIR
import pandas as pd
from app.services.project_logger import log
import logging

router = APIRouter(prefix="/api", tags=["records"]) 

# Endpoint para listar proyectos
@router.get("/projects")
def get_projects():
    return list_projects()


@router.post('/projects')
def post_create_project(body: dict):
    """Create a new project. Body may contain title, desc, interviewer, interviewee, project_prompt."""
    try:
        # create project id
        from ..utils import create_project
        from ..services import project_info
        pid = create_project(None)
        # write initial info (project_info.write_info will normalize)
        saved = project_info.write_info(pid, body or {})
        return {"ok": True, "project_id": pid, "saved": saved}
    except Exception as e:
        log("<create_project>", f"post_create_project failed: {e}", level="ERROR")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete('/projects/{project_id}')
def delete_project(project_id: str):
    """Eliminar un proyecto y su carpeta de datos (audios, csv, .info).
    Devuelve 404 si no existe. Registra la operación en el logger del proyecto.
    """
    try:
        proj_dir = BASE_VOICES_DIR / project_id
        if not proj_dir.exists():
            raise HTTPException(status_code=404, detail="Project not found")
        import shutil
        shutil.rmtree(proj_dir)
        return {"ok": True}
    except HTTPException:
        raise
    except Exception as e:
        log(project_id, f"delete_project failed: {e}", level="ERROR")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/records/{project_id}")
def list_records(project_id: str):
    try:
        log(project_id, "list_records called")
        df = csv_store.read_csv(project_id)
        # Reemplaza NaN, pd.NA e infinitos por None para compatibilidad JSON
        df = df.replace({pd.NA: None, float('nan'): None, float('inf'): None, float('-inf'): None})
        df = df.where(pd.notnull(df), None)
        records = df.to_dict(orient="records")
        return records
    except Exception as e:
        # Devuelve el error en la respuesta para depuración
        raise HTTPException(status_code=500, detail=f"Error al procesar records: {e}")

@router.patch("/records/{project_id}/{num}")
def patch_record(project_id: str, num: int, body: UpdateRecord):
    try:
        log(project_id, f"patch_record called num={num} updates={list(body.model_dump(exclude_none=True).keys())}")
        rec = csv_store.update_record(project_id, num, **body.model_dump(exclude_none=True))
    except Exception as e:
        log(project_id, f"patch_record failed num={num}: {e}", level="ERROR")
        raise HTTPException(status_code=400, detail=str(e))
    return rec

@router.get("/csv/{project_id}")
def get_csv_path_api(project_id: str):
    return {"path": str(get_csv_path(project_id))}

@router.post("/llm/process/{project_id}")
def llm_process(project_id: str, body: LLMProcessRequest):
    """Reprocesa todo el CSV. opcionalmente acepta `project_prompt` que se enviará
    al LLM como contexto adicional para guiar la limpieza y las entonaciones.
    """
    log(project_id, "llm_process called - process_all start")
    n = process_all(project_id, body.overwrite_texts, body.overwrite_prompts, project_prompt=body.project_prompt)
    log(project_id, f"llm_process completed - processed={n}")
    return {"processed": n}


@router.post("/llm/process/{project_id}/{num}")
def llm_process_one(project_id: str, num: int, body: LLMProcessOneRequest):
    """Procesa un solo registro con el LLM. El body permite controlar si se sobreescribe texto/prompts y qué parte.
    """
    try:
        log(project_id, f"llm_process_one called num={num} part={body.part}")
        # read project-level prompt from .info and pass it to the processing function
        try:
            info = read_info(project_id) or {}
            project_prompt = info.get("project_prompt")
        except Exception:
            project_prompt = None

        updated = process_one(project_id, num, body.overwrite_texts, body.overwrite_prompts, part=body.part, project_prompt=project_prompt)
        log(project_id, f"llm_process_one completed num={num}")
    except Exception as e:
        log(project_id, f"llm_process_one failed num={num}: {e}", level="ERROR")
        raise HTTPException(status_code=400, detail=str(e))
    return {"ok": True, "record": updated}
