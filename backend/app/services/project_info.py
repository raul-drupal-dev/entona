from pathlib import Path
import json
from ..utils import get_info_path
from app.services.project_logger import log

DEFAULT = {
    "interviewer": {"language": "es", "accent": "es-ES", "voice": "alloy"},
    "interviewee": {"language": "es", "accent": "es-ES", "voice": "ash"},
    # metadata
    "title": "",
    "description": "",
}


def read_info(project_id: str) -> dict:
    p = get_info_path(project_id)
    try:
        log(project_id, "read_info called")
        if not p.exists():
            log(project_id, "read_info: info file not found, returning DEFAULT")
            return DEFAULT.copy()
        with p.open("r", encoding="utf-8") as fh:
            data = json.load(fh) or {}
            # Support legacy format where language/accent are top-level
            out = DEFAULT.copy()
            # If legacy keys exist, apply to both roles
            if "language" in data or "accent" in data:
                lang = data.get("language", "es")
                acc = data.get("accent", "es-ES")
                out = {
                    "interviewer": {"language": lang, "accent": acc, "voice": out["interviewer"]["voice"]},
                    "interviewee": {"language": lang, "accent": acc, "voice": out["interviewee"]["voice"]},
                }
            # New format: per-role objects
            if "interviewer" in data and isinstance(data["interviewer"], dict):
                out["interviewer"] = {**out.get("interviewer", {}), **data["interviewer"]}
            if "interviewee" in data and isinstance(data["interviewee"], dict):
                out["interviewee"] = {**out.get("interviewee", {}), **data["interviewee"]}
            # Backwards compat: also accept voices:{ interviewer, interviewee }
            if "voices" in data and isinstance(data["voices"], dict):
                if "interviewer" in data["voices"]:
                    out["interviewer"]["voice"] = data["voices"]["interviewer"]
                if "interviewee" in data["voices"]:
                    out["interviewee"]["voice"] = data["voices"]["interviewee"]
            # project-level prompt (new)
            if "project_prompt" in data:
                out["project_prompt"] = data.get("project_prompt") or ""
            # title/description (allow desc/name backwards compat)
            if "title" in data or "name" in data:
                out["title"] = data.get("title") or data.get("name") or ""
            if "description" in data or "desc" in data:
                # prefer full 'description' but accept 'desc'
                out["description"] = data.get("description") or data.get("desc") or ""
            log(project_id, f"read_info: loaded info for project, interviewer={out.get('interviewer')}, interviewee={out.get('interviewee')}")
            return out
    except Exception:
        log(project_id, "read_info: failed to read info, returning DEFAULT", level="ERROR")
        return DEFAULT.copy()


def write_info(project_id: str, data: dict) -> None:
    log(project_id, "write_info called")
    p = get_info_path(project_id)
    p.parent.mkdir(parents=True, exist_ok=True)
    tmp = p.with_suffix(".tmp")

    # Read existing raw content (preserve unrelated keys)
    existing_raw = {}
    try:
        if p.exists():
            with p.open("r", encoding="utf-8") as fh:
                existing_raw = json.load(fh) or {}
    except Exception:
        existing_raw = {}

    # Build normalized per-role object from existing file (keeps sensible defaults)
    current = read_info(project_id)

    # Normalize incoming data into per-role partial updates
    updates = {}
    if "interviewer" in data and isinstance(data["interviewer"], dict):
        updates.setdefault("interviewer", {})
        updates["interviewer"].update(data["interviewer"])
    if "interviewee" in data and isinstance(data["interviewee"], dict):
        updates.setdefault("interviewee", {})
        updates["interviewee"].update(data["interviewee"])

    # legacy top-level language/accent -> apply to both roles if provided
    if "language" in data or "accent" in data:
        lang = data.get("language")
        acc = data.get("accent")
        updates.setdefault("interviewer", {})
        updates.setdefault("interviewee", {})
        if lang is not None:
            updates["interviewer"]["language"] = lang
            updates["interviewee"]["language"] = lang
        if acc is not None:
            updates["interviewer"]["accent"] = acc
            updates["interviewee"]["accent"] = acc

    # legacy voices:{ interviewer, interviewee }
    if "voices" in data and isinstance(data["voices"], dict):
        v = data["voices"]
        if "interviewer" in v:
            updates.setdefault("interviewer", {})
            updates["interviewer"]["voice"] = v["interviewer"]
        if "interviewee" in v:
            updates.setdefault("interviewee", {})
            updates["interviewee"]["voice"] = v["interviewee"]

    # Merge updates into current per-role config
    merged_roles = {
        "interviewer": {**current.get("interviewer", {}), **updates.get("interviewer", {})},
        "interviewee": {**current.get("interviewee", {}), **updates.get("interviewee", {})},
    }

    # Prepare normalized_updates: include any extra top-level keys from the incoming body
    normalized_updates = {k: v for k, v in (data or {}).items() if k not in ("interviewer", "interviewee", "voices", "language", "accent")}

    # handle project_prompt if provided in incoming data (allow empty string)
    if "project_prompt" in data:
        normalized_updates["project_prompt"] = data.get("project_prompt")

    # Put the merged per-role values into the normalized updates so they replace the roles
    normalized_updates["interviewer"] = merged_roles["interviewer"]
    normalized_updates["interviewee"] = merged_roles["interviewee"]

    # Preserve 'voices' if provided
    if "voices" in data:
        normalized_updates["voices"] = data["voices"]

    # Final is existing merged with the normalized updates (deep-merge)
    final = merge_info(existing_raw if isinstance(existing_raw, dict) else {}, normalized_updates)

    with tmp.open("w", encoding="utf-8") as fh:
        json.dump(final, fh, ensure_ascii=False, indent=2)
    tmp.replace(p)

    log(project_id, "Información del proyecto actualizada")
    # Return the final merged object for callers that want to confirm what was saved
    return final


def read_raw(project_id: str) -> dict:
    """Return the raw JSON object stored in the project's .info file (or {})."""
    p = get_info_path(project_id)
    try:
        log(project_id, "read_raw called")
        if not p.exists():
            log(project_id, "read_raw: file not found, returning {}")
            return {}
        with p.open("r", encoding="utf-8") as fh:
            data = json.load(fh) or {}
            log(project_id, f"read_raw: loaded raw info keys={list(data.keys())}")
            return data
    except Exception:
        log(project_id, "read_raw: failed to read raw info", level="ERROR")
        return {}


def merge_info(existing: dict, updates: dict) -> dict:
    """Deep-merge two dicts: values in updates replace or extend existing.

    This helper is kept for potential future uses; write_info currently handles
    the sensible per-role normalization and writes the merged result.
    """
    if not isinstance(existing, dict):
        return updates
    out = dict(existing)
    for k, v in (updates or {}).items():
        if k in out and isinstance(out[k], dict) and isinstance(v, dict):
            out[k] = merge_info(out[k], v)
        else:
            out[k] = v
    return out
