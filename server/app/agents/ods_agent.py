"""
Agente ODS genérico.
Especializado en los Objetivos de Desarrollo Sostenible.
Adapta el system_prompt al reto específico de la hackathon.
"""

from typing import Any, Dict, Optional

from app.agents.base_agent import BaseAgent
from app.services.ai_service import ai_service
from app.utils.prompts import ODS_SYSTEM_PROMPT


class ODSAgent(BaseAgent):
    """
    Agente experto en ODS y desarrollo sostenible local.
    Usa el proveedor de IA configurado (OpenAI/Gemini).
    """

    def __init__(self):
        super().__init__(
            name="ODS Agent",
            system_prompt=ODS_SYSTEM_PROMPT,
        )

    async def process(self, user_input: str, context: Optional[Dict[str, Any]] = None) -> str:
        """
        Procesa la consulta del usuario sobre ODS.

        Args:
            user_input: Texto del usuario.
            context: Contexto adicional (datos del proyecto, ubicación, etc.).

        Returns:
            Respuesta generada por la IA.
        """
        # Enriquecer el input con contexto si existe
        enriched_input = user_input
        if context:
            context_str = "\n".join(f"- {k}: {v}" for k, v in context.items())
            enriched_input = f"Contexto adicional:\n{context_str}\n\nPregunta del usuario: {user_input}"

        self.add_message("user", enriched_input)

        # Llamar al servicio de IA
        response = await ai_service.chat(messages=self.get_messages())

        self.add_message("assistant", response)

        return response


# Instancia singleton para usar en toda la app
ods_agent = ODSAgent()


# =============================================
# CREA MÁS AGENTES SEGÚN EL RETO:
#
# class MiAgenteEspecifico(BaseAgent):
#     def __init__(self):
#         super().__init__(
#             name="Mi Agente",
#             system_prompt="Eres un experto en...",
#         )
#
#     async def process(self, user_input, context=None):
#         ...
# =============================================
