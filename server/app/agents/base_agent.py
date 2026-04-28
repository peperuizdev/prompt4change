"""
Agente base para IA.
Todos los agentes específicos heredan de aquí.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional


class BaseAgent(ABC):
    """
    Clase base para agentes de IA.
    Cada agente tiene un system prompt y puede procesar mensajes.
    """

    def __init__(self, name: str, system_prompt: str):
        self.name = name
        self.system_prompt = system_prompt
        self.conversation_history: List[Dict[str, str]] = []

    def add_message(self, role: str, content: str):
        """Añade un mensaje al historial."""
        self.conversation_history.append({"role": role, "content": content})

    def get_messages(self) -> List[Dict[str, str]]:
        """Devuelve el historial con el system prompt incluido."""
        return [
            {"role": "system", "content": self.system_prompt},
            *self.conversation_history,
        ]

    def clear_history(self):
        """Limpia el historial de conversación."""
        self.conversation_history = []

    @abstractmethod
    async def process(self, user_input: str, context: Optional[Dict[str, Any]] = None) -> str:
        """
        Procesa un input del usuario y devuelve la respuesta.
        Override en cada agente específico.
        """
        pass
