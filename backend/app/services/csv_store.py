from __future__ import annotations
import pandas as pd
from pathlib import Path
from . import pdf_parser
from ..utils import get_csv_path
from app.services.project_logger import log

COLUMNS = ["num", "pregunta", "respuesta", "entonacion_p", "entonacion_r", "notas"]

STATUS_COLUMNS = ["num", "processed", "failed", "error"]

def create_csv_from_text(raw_text: str, project_id: str, overwrite: bool = False) -> Path:
    csv_path = get_csv_path(project_id)
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    log(project_id, f"create_csv_from_text called (overwrite={overwrite}) for {csv_path}")
    if csv_path.exists() and not overwrite:
        log(project_id, f"CSV already exists and overwrite=False -> returning {csv_path}")
        return csv_path
    pairs = pdf_parser.extract_pairs(raw_text)
    log(project_id, f"Extracted {len(pairs)} pairs from raw_text")
    rows = [
        {
            "num": i + 1,
            "pregunta": q,
            "respuesta": r,
            "entonacion_p": "",
            "entonacion_r": "",
            "notas": "",
        }
        for i, (q, r) in enumerate(pairs)
    ]
    df = pd.DataFrame(rows, columns=COLUMNS)
    df.to_csv(csv_path, index=False)
    log(project_id, f"Wrote CSV with {len(df)} rows to {csv_path}")
    return csv_path

def read_csv(project_id: str) -> pd.DataFrame:
    csv_path = get_csv_path(project_id)
    log(project_id, f"read_csv called for {csv_path}")
    if not csv_path.exists():
        log(project_id, f"CSV not found at {csv_path}, returning empty DataFrame")
        return pd.DataFrame(columns=COLUMNS)
    df = pd.read_csv(csv_path)
    # ensure notas column exists for backward compatibility
    if "notas" not in df.columns:
        df["notas"] = ""
    log(project_id, f"read_csv loaded {len(df)} rows from {csv_path}")
    return df

def write_csv(df: pd.DataFrame, project_id: str) -> None:
    csv_path = get_csv_path(project_id)
    log(project_id, f"write_csv called - writing {len(df)} rows to {csv_path}")
    # Ensure all expected columns exist
    for c in COLUMNS:
        if c not in df.columns:
            df[c] = ""
    df[COLUMNS].to_csv(csv_path, index=False)
    log(project_id, f"write_csv completed for {csv_path}")

def update_record(project_id: str, num: int, **updates) -> dict:
    df = read_csv(project_id)
    log(project_id, f"update_record called for num={num} updates={list(updates.keys())}")
    if df.empty:
        log(project_id, "update_record failed - CSV aún no existe", level="ERROR")
        raise ValueError("CSV aún no existe")
    idx = df.index[df["num"] == num]
    if len(idx) == 0:
        log(project_id, f"update_record failed - registro num={num} no encontrado", level="ERROR")
        raise ValueError(f"Registro num={num} no encontrado")
    for k, v in updates.items():
        if v is not None and k in df.columns:
            df.at[idx[0], k] = v
    write_csv(df, project_id)
    # convert pandas NA / nan to None for JSON serialization
    row = df.loc[idx[0]]
    row = row.where(pd.notnull(row), None)
    result = row.to_dict()
    log(project_id, f"update_record succeeded for num={num}")
    return result

def iter_records(project_id: str):
    log(project_id, "iter_records called")
    df = read_csv(project_id)
    for _, row in df.iterrows():
        yield int(row["num"]), row


def init_status_csv(project_id: str) -> Path:
    """Create a temporary status CSV with columns (num, processed=False) for all records.

    Returns the path to the status CSV.
    """
    csv_path = get_csv_path(project_id)
    status_path = csv_path.parent / (csv_path.stem + ".status.csv")
    df = read_csv(project_id)
    rows = [
        {"num": int(r["num"]), "processed": False, "failed": False, "error": ""}
        for _, r in df.iterrows()
    ]
    import pandas as pd

    status_df = pd.DataFrame(rows, columns=STATUS_COLUMNS)
    status_path.parent.mkdir(parents=True, exist_ok=True)
    status_df.to_csv(status_path, index=False)
    log(project_id, f"init_status_csv created {status_path} with {len(status_df)} rows")
    return status_path


def mark_status_processed(project_id: str, num: int) -> None:
    """Mark a given num as processed=True in the status CSV if it exists."""
    csv_path = get_csv_path(project_id)
    status_path = csv_path.parent / (csv_path.stem + ".status.csv")
    if not status_path.exists():
        log(project_id, f"mark_status_processed: status CSV not found at {status_path}")
        return
    import pandas as pd

    df = pd.read_csv(status_path)
    idx = df.index[df["num"] == int(num)]
    if len(idx) == 0:
        log(project_id, f"mark_status_processed: no row for num={num} in {status_path}")
        return
    df.at[idx[0], "processed"] = True
    df.at[idx[0], "failed"] = False
    df.at[idx[0], "error"] = ""
    df.to_csv(status_path, index=False)
    log(project_id, f"mark_status_processed: marked num={num} processed in {status_path}")


def mark_status_failed(project_id: str, num: int, error: str | None = None) -> None:
    """Mark a given num as failed=True and store error message."""
    csv_path = get_csv_path(project_id)
    status_path = csv_path.parent / (csv_path.stem + ".status.csv")
    if not status_path.exists():
        log(project_id, f"mark_status_failed: status CSV not found at {status_path}")
        return
    import pandas as pd

    df = pd.read_csv(status_path)
    idx = df.index[df["num"] == int(num)]
    if len(idx) == 0:
        log(project_id, f"mark_status_failed: no row for num={num} in {status_path}")
        return
    df.at[idx[0], "failed"] = True
    df.at[idx[0], "processed"] = False
    df.at[idx[0], "error"] = str(error)[:1000] if error else ""
    df.to_csv(status_path, index=False)
    log(project_id, f"mark_status_failed: marked num={num} failed in {status_path} error={str(error)[:200]}")


def read_status(project_id: str) -> dict:
    """Return a dict {processed: n, total: m} reading the status CSV. If missing, return total=0."""
    csv_path = get_csv_path(project_id)
    status_path = csv_path.parent / (csv_path.stem + ".status.csv")
    if not status_path.exists():
        # fallback: count records in main CSV
        df = read_csv(project_id)
        total = len(df)
        log(project_id, f"read_status: no status CSV, fallback total={total}")
        return {"processed": 0, "total": total}
    import pandas as pd

    df = pd.read_csv(status_path)
    processed = int(df[df["processed"] == True].shape[0])
    failed = int(df[df["failed"] == True].shape[0])
    total = int(df.shape[0])
    log(project_id, f"read_status: processed={processed} failed={failed} total={total} from {status_path}")
    return {"processed": processed, "failed": failed, "total": total}


def get_status_rows(project_id: str) -> list[dict]:
    csv_path = get_csv_path(project_id)
    status_path = csv_path.parent / (csv_path.stem + ".status.csv")
    if not status_path.exists():
        log(project_id, f"get_status_rows: status CSV not found at {status_path}")
        return []
    import pandas as pd

    df = pd.read_csv(status_path)
    rows = []
    for _, r in df.iterrows():
        rows.append({"num": int(r["num"]), "processed": bool(r["processed"]), "failed": bool(r.get("failed", False)), "error": str(r.get("error", ""))})
    log(project_id, f"get_status_rows: returning {len(rows)} rows from {status_path}")
    return rows


def remove_status_csv(project_id: str) -> None:
    csv_path = get_csv_path(project_id)
    status_path = csv_path.parent / (csv_path.stem + ".status.csv")
    try:
        if status_path.exists():
            status_path.unlink()
            log(project_id, f"remove_status_csv: removed {status_path}")
    except Exception:
        log(project_id, f"remove_status_csv: failed to remove {status_path}", level="ERROR")
        pass
