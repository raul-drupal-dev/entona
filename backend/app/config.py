import os
from pydantic import BaseModel

class Settings(BaseModel):
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_API_BASE: str | None = os.getenv("OPENAI_API_BASE")
    OPENAI_MODEL_LLM: str = os.getenv("OPENAI_MODEL_LLM", "gpt-4o-mini")
    OPENAI_MODEL_TTS: str = os.getenv("OPENAI_MODEL_TTS", "gpt-4o-mini-tts")
    DEFAULT_VOICE_Q: str = os.getenv("DEFAULT_VOICE_Q", "onyx")
    DEFAULT_VOICE_R: str = os.getenv("DEFAULT_VOICE_R", "sage")
    BASE_URL: str = os.getenv("BASE_URL", "http://localhost")
    PORT: int = int(os.getenv("PORT", "8000"))

settings = Settings()
