from pathlib import Path
import datetime
import threading
from typing import Optional, Dict

from ..utils import get_project_dir

"""Simple project-scoped logger.

Features:
- Creates a `.log` directory inside the project's folder (project id determines folder).
- Writes logs to daily files named `YYYY-MM-DD.log`.
- Exposes `ProjectLogger` and a convenience `log(project_id, message, level)` function.

Usage:
    from app.services.project_logger import ProjectLogger, log
    logger = ProjectLogger(project_id)
    logger.log("mensaje")

    # or quick call
    log(project_id, "mensaje rapido")

This implementation keeps a per-project threading.Lock to avoid interleaved writes.
"""

LOG_DIR_NAME = ".log"

# Per-project locks to ensure atomic append writes
_locks: Dict[str, threading.Lock] = {}


def _get_lock(project_id: str) -> threading.Lock:
    # Use setdefault to initialise a lock per project
    if project_id not in _locks:
        _locks[project_id] = threading.Lock()
    return _locks[project_id]


class ProjectLogger:
    def __init__(self, project_id: str):
        self.project_id = project_id
        # project base directory (e.g. backend/app/static/voices/<project_id>)
        self.project_dir: Path = get_project_dir(project_id)
        self.log_dir: Path = self.project_dir / LOG_DIR_NAME
        self.log_dir.mkdir(parents=True, exist_ok=True)

    def _daily_path(self, when: Optional[datetime.datetime] = None) -> Path:
        if when is None:
            when = datetime.datetime.now(datetime.timezone.utc)
        return self.log_dir / f"{when.strftime('%Y-%m-%d')}.log"

    def log(self, message: str, level: str = "INFO") -> None:
        """Append a timestamped line to today's log file."""
        now = datetime.datetime.now(datetime.timezone.utc)
        ts = now.replace(microsecond=0).isoformat() + "Z"
        line = f"{ts} [{level}] {message}\n"
        path = self._daily_path(now)
        lock = _get_lock(self.project_id)
        with lock:
            # Open in append mode so concurrent processes can still append (OS will serialize)
            with path.open("a", encoding="utf-8") as fh:
                fh.write(line)

    def read(self, date: Optional[datetime.date] = None) -> str:
        """Return the contents of a day's log. If date is None, read today's log."""
        if date is None:
            date = datetime.datetime.now(datetime.timezone.utc).date()
        path = self.log_dir / f"{date.strftime('%Y-%m-%d')}.log"
        if not path.exists():
            return ""
        try:
            with path.open("r", encoding="utf-8") as fh:
                return fh.read()
        except Exception:
            return ""


def log(project_id: str, message: str, level: str = "INFO") -> None:
    """Convenience function to append a log line for project_id."""
    logger = ProjectLogger(project_id)
    logger.log(message, level=level)


def list_log_files(project_id: str) -> list:
    """Return a sorted list of log filenames (strings) for the project."""
    d = get_project_dir(project_id) / LOG_DIR_NAME
    if not d.exists():
        return []
    files = [p.name for p in d.iterdir() if p.is_file() and p.suffix == ".log"]
    files.sort()
    return files
