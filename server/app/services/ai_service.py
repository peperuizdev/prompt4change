"""
Servicio de IA unificado.
Soporta OpenAI y Google Gemini - detecta automáticamente cuál usar.
"""

from typing import Dict, List, Optional

from app.core.config import settings


class AIService:
    """
    Servicio wrapper para proveedores de IA.
    Detecta automáticamente qué API key está configurada y usa ese proveedor.
    """

    def __init__(self):
        self.provider = settings.ai_provider
        self._openai_client = None
        self._gemini_client = None

    def _get_openai_client(self):
        """Inicializa el cliente de OpenAI (lazy)."""
        if self._openai_client is None:
            from openai import AsyncOpenAI

            self._openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        return self._openai_client

    def _get_gemini_client(self):
        """Inicializa el cliente de Gemini (lazy)."""
        if self._gemini_client is None:
            from google import genai

            self._gemini_client = genai.Client(api_key=settings.GOOGLE_API_KEY)
        return self._gemini_client

    async def chat(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2000,
    ) -> str:
        """
        Envía mensajes al proveedor de IA y devuelve la respuesta.

        Args:
            messages: Lista de mensajes [{"role": "...", "content": "..."}]
            model: Modelo a usar (usa el del .env si no se especifica).
            temperature: Creatividad (0.0 - 1.0).
            max_tokens: Máximo de tokens en la respuesta.

        Returns:
            Texto de respuesta de la IA.
        """
        if self.provider == "openai":
            return await self._chat_openai(messages, model, temperature, max_tokens)
        elif self.provider == "gemini":
            return await self._chat_gemini(messages, model, temperature, max_tokens)
        else:
            return (
                "⚠️ No hay proveedor de IA configurado. "
                "Añade OPENAI_API_KEY o GOOGLE_API_KEY en el .env"
            )

    async def _chat_openai(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str],
        temperature: float,
        max_tokens: int,
    ) -> str:
        """Chat con OpenAI."""
        client = self._get_openai_client()
        response = await client.chat.completions.create(
            model=model or settings.OPENAI_MODEL,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content or ""

    async def _chat_gemini(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str],
        temperature: float,
        max_tokens: int,
    ) -> str:
        """Chat con Google Gemini."""
        client = self._get_gemini_client()

        # Extraer system prompt y construir contenido para Gemini
        system_instruction = None
        contents = []

        for msg in messages:
            if msg["role"] == "system":
                system_instruction = msg["content"]
            else:
                role = "user" if msg["role"] == "user" else "model"
                contents.append({"role": role, "parts": [{"text": msg["content"]}]})

        config = {
            "temperature": temperature,
            "max_output_tokens": max_tokens,
        }
        if system_instruction:
            config["system_instruction"] = system_instruction

        response = await client.aio.models.generate_content(
            model=model or settings.GOOGLE_MODEL,
            contents=contents,
            config=config,
        )
        return response.text or ""

    async def simple_prompt(
        self,
        prompt: str,
        system_prompt: str = "Eres un asistente experto en desarrollo sostenible y ODS.",
        temperature: float = 0.7,
    ) -> str:
        """
        Atajo para un prompt simple sin historial.
        Útil para análisis rápidos, clasificación, etc.
        """
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ]
        return await self.chat(messages, temperature=temperature)


# Instancia singleton
ai_service = AIService()
