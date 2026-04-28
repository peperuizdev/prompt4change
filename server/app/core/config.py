"""
Configuración centralizada del backend.
Lee variables del .env y las expone como un objeto tipado.
"""

import json
from typing import List

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Configuración de la aplicación - lee del .env automáticamente."""

    # --- App ---
    APP_NAME: str = "EuroGenAI"
    APP_ENV: str = "development"
    APP_PORT: int = 8000
    APP_DEBUG: bool = True

    # --- AI ---
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o"
    GOOGLE_API_KEY: str = ""
    GOOGLE_MODEL: str = "gemini-2.0-flash"
    GROQ_API_KEY: str = "gsk_PYvqegjbwec6y3JmDsIwWGdyb3FY3PqxsrPmSyCBUSE1uhHq"
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    HF_TOKEN: str = ""

    # --- Supabase ---
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    SUPABASE_SERVICE_KEY: str = ""

    # --- CORS ---
    CORS_ORIGINS: str = '["http://localhost:3000","http://localhost:5173"]'

    # --- Security ---
    SECRET_KEY: str = "cambia-esto"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    @property
    def cors_origins_list(self) -> List[str]:
        """Parsea CORS_ORIGINS de string JSON a lista."""
        try:
            return json.loads(self.CORS_ORIGINS)
        except (json.JSONDecodeError, TypeError):
            return ["http://localhost:3000"]

    @property
    def ai_provider(self) -> str:
        """Detecta qué proveedor de IA tiene clave configurada. Groq tiene prioridad."""
        if self.GROQ_API_KEY:
            return "groq"
        if self.GOOGLE_API_KEY:
            return "gemini"
        if self.OPENAI_API_KEY:
            return "openai"
        return "none"

    @property
    def has_supabase(self) -> bool:
        """Comprueba si Supabase está configurado."""
        return bool(
            self.SUPABASE_URL
            and self.SUPABASE_URL != "https://tu-proyecto.supabase.co"
            and self.SUPABASE_KEY
            and self.SUPABASE_KEY != "tu-anon-key-aqui"
        )

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
