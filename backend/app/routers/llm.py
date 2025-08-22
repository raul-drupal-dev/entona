from fastapi import APIRouter, BackgroundTasks
from ..services import csv_store
from ..services import llm_processing
from app.services.project_logger import log

router = APIRouter(prefix="/api", tags=["llm"])


def run_llm_all_background(project_id: str, overwrite_texts: bool = True, overwrite_prompts: bool = True, project_prompt: str | None = None) -> None:
    """Worker that runs the LLM processing per-row and updates status CSV."""
    log(project_id, "run_llm_all_background started")
    status_path = csv_store.init_status_csv(project_id)
    log(project_id, f"LLM status CSV initialized at {status_path}")
    try:
        for num, _ in csv_store.iter_records(project_id):
            try:
                # process_one updates the main CSV per-row
                llm_processing.process_one(project_id, num, overwrite_texts=overwrite_texts, overwrite_prompts=overwrite_prompts, project_prompt=project_prompt)
                log(project_id, f"llm processed num={num}")
                csv_store.mark_status_processed(project_id, num)
            except Exception as e:
                log(project_id, f"llm failed num={num}: {e}", level="ERROR")
                csv_store.mark_status_failed(project_id, num, error=str(e))
    finally:
        log(project_id, "run_llm_all_background finished")
        status = csv_store.read_status(project_id)
        processed = status.get("processed", 0)
        failed = status.get("failed", 0)
        total = status.get("total", 0)
    # Keep the status CSV after completion so frontend polling can read processed==total
    log(project_id, f"run_llm_all_background: finished processed={processed} failed={failed} total={total} - status CSV kept for frontend")


@router.post("/llm/start/{project_id}")
def llm_start(project_id: str, background_tasks: BackgroundTasks, body: dict | None = None):
    """Start bulk LLM processing in background. Frontend should poll `/llm/check_status` and `/llm/status_rows` for progress."""
    body = body or {}
    overwrite_texts = bool(body.get("overwrite_texts", True))
    overwrite_prompts = bool(body.get("overwrite_prompts", True))
    project_prompt = body.get("project_prompt")

    # initialize status csv immediately
    csv_store.init_status_csv(project_id)
    log(project_id, f"llm_start called - background LLM scheduled overwrite_texts={overwrite_texts} overwrite_prompts={overwrite_prompts}")
    background_tasks.add_task(run_llm_all_background, project_id, overwrite_texts, overwrite_prompts, project_prompt)
    return {"ok": True}


@router.get("/llm/check_status/{project_id}")
def llm_check_status(project_id: str):
    log(project_id, "llm_check_status called")
    return csv_store.read_status(project_id)


@router.get("/llm/status_rows/{project_id}")
def llm_status_rows(project_id: str):
    log(project_id, "llm_status_rows called")
    return {"rows": csv_store.get_status_rows(project_id)}
