"""
SeaCool AI - Agente Orquestador Multiagente.
Hereda de BaseAgent y delega la lógica al SeaCoolService.
"""

from typing import Any, Dict, Optional

from app.agents.base_agent import BaseAgent
from app.services.seacool_service import SEACOOL_SYSTEM_PROMPT, seacool_service


class SeaCoolAgent(BaseAgent):
    """
    Agente orquestador de SeaCool AI.
    Gestiona el bucle de economía circular:
    Datacenter → Calor residual → Desalinización → Agua dulce → Comunidad costera.
    """

    def __init__(self):
        super().__init__(
            name="SeaCool Orchestrator",
            system_prompt=SEACOOL_SYSTEM_PROMPT,
        )

    async def process(
        self, user_input: str, context: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Procesa una solicitud de simulación SeaCool.

        Si se proporciona contexto con temp_ext, carga_dc y mes,
        ejecuta la simulación multiagente completa.
        Si no, usa el flujo de chat genérico.

        Args:
            user_input: Texto del usuario.
            context: Dict con claves opcionales: temp_ext, carga_dc, mes.

        Returns:
            Respuesta JSON serializada del orquestador.
        """
        import json

        if context and all(k in context for k in ("temp_ext", "carga_dc", "mes")):
            # Simulación multiagente con parámetros concretos
            resultado = await seacool_service.simulate(
                temp_ext=float(context["temp_ext"]),
                carga_dc=float(context["carga_dc"]),
                mes=str(context["mes"]),
            )
            return json.dumps(resultado, ensure_ascii=False, indent=2)

        # Fallback: chat libre con el agente
        from app.services.ai_service import ai_service

        self.add_message("user", user_input)
        response = await ai_service.chat(messages=self.get_messages())
        self.add_message("assistant", response)
        return response


# Instancia singleton
seacool_agent = SeaCoolAgent()
