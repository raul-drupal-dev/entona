from __future__ import annotations
import re
from typing import List, Tuple
from app.services.project_logger import log

PR_BLOCK_RE = re.compile(
    r"Pregunta:\s*(.*?)\s*Respuesta:\s*(.*?)(?=(?:\n\s*Pregunta:)|\Z)",
    re.DOTALL | re.IGNORECASE,
)

def extract_pairs(text: str) -> List[Tuple[str, str]]:
    """Extrae pares (pregunta, respuesta) del texto usando regex robusto.
    - Captura hasta la siguiente 'Pregunta:' o fin del documento.
    - Limpia espacios raros y saltos múltiples.
    """
    pairs = []
    for m in PR_BLOCK_RE.finditer(text):
        q = normalize(m.group(1))
        r = normalize(m.group(2))
        if q or r:
            pairs.append((q, r))
    # try to log if possible: not all callers send project_id, so keep this passive
    # Callers can log the number of pairs after calling extract_pairs
    return pairs

def normalize(s: str) -> str:
    s = s.replace("\u00ad", "")  # soft hyphen
    s = re.sub(r"\s+", " ", s).strip()
    return s
