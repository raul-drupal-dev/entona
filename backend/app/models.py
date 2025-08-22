from pydantic import BaseModel, Field
from typing import Optional

class Record(BaseModel):
    num: int
    pregunta: str
    respuesta: str
    entonacion_p: str = Field(default="")
    entonacion_r: str = Field(default="")
    notas: str = Field(default="")

class UpdateRecord(BaseModel):
    pregunta: Optional[str] = None
    respuesta: Optional[str] = None
    entonacion_p: Optional[str] = None
    entonacion_r: Optional[str] = None
    notas: Optional[str] = None

class GenerateRequest(BaseModel):
    overwrite: bool = False

class TTSOneRequest(BaseModel):
    part: str  # "pregunta" | "respuesta"
    prompt_override: str | None = None
    voice_override: str | None = None

class LLMProcessRequest(BaseModel):
    # Permite reprocesar todo el CSV con el LLM
    overwrite_texts: bool = True
    overwrite_prompts: bool = True
    project_prompt: str | None = None


class LLMProcessOneRequest(BaseModel):
    overwrite_texts: bool = True
    overwrite_prompts: bool = True
    part: str = "both"  # 'pregunta' | 'respuesta' | 'both'
