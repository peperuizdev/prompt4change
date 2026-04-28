"""
Gestión de sesiones en memoria para AquaLoop AI.
Cada sesión almacena historial de chat, contexto de agentes e informe generado.
Expiración automática a las 2 horas de inactividad.
"""

import time
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field


SESSION_TTL = 7200  # 2 horas en segundos
MAX_HISTORY_MESSAGES = 20  # Máximo de mensajes que guardamos por sesión


@dataclass
class Session:
    session_id: str
    history: List[Dict[str, str]] = field(default_factory=list)
    agents_context: Dict[str, Any] = field(default_factory=dict)
    report_data: Optional[Dict] = None
    last_activity: float = field(default_factory=time.time)

    def add_message(self, role: str, content: str):
        self.history.append({"role": role, "content": content})
        if len(self.history) > MAX_HISTORY_MESSAGES:
            # Descarta los más antiguos pero siempre conserva el primero (contexto inicial)
            self.history = [self.history[0]] + self.history[-(MAX_HISTORY_MESSAGES - 1):]
        self.last_activity = time.time()

    def recent_history(self, n: int = 6) -> List[Dict[str, str]]:
        """Devuelve los últimos n mensajes (para no inflar el contexto del LLM)."""
        return self.history[-n:] if self.history else []

    def is_expired(self) -> bool:
        return time.time() - self.last_activity > SESSION_TTL


class SessionService:
    def __init__(self):
        self._sessions: Dict[str, Session] = {}

    def get_or_create(self, session_id: str) -> Session:
        self._cleanup_expired()
        if session_id not in self._sessions:
            self._sessions[session_id] = Session(session_id=session_id)
        else:
            self._sessions[session_id].last_activity = time.time()
        return self._sessions[session_id]

    def get(self, session_id: str) -> Optional[Session]:
        return self._sessions.get(session_id)

    def delete(self, session_id: str):
        self._sessions.pop(session_id, None)

    def list_active(self) -> List[str]:
        self._cleanup_expired()
        return list(self._sessions.keys())

    def _cleanup_expired(self):
        expired = [sid for sid, s in self._sessions.items() if s.is_expired()]
        for sid in expired:
            del self._sessions[sid]


# Singleton compartido por toda la app
session_service = SessionService()
