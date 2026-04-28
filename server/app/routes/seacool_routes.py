"""
SeaCool AI - Rutas del Orquestador Multiagente.
Endpoints para la simulación de economía circular Datacenter ↔ Comunidad costera.
"""

from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.agents.seacool_agent import seacool_agent
from app.services.seacool_service import seacool_service

router = APIRouter()


# --- Schemas ---


class SeaCoolSimulationRequest(BaseModel):
    """Request para simular el sistema SeaCool."""

    temp_ext: float = Field(
        ...,
        ge=-10,
        le=55,
        description="Temperatura exterior en °C",
        examples=[32.5],
    )
    carga_dc: float = Field(
        ...,
        ge=0,
        le=100,
        description="Carga del datacenter en % (0-100)",
        examples=[75],
    )
    mes: str = Field(
        ...,
        min_length=3,
        max_length=20,
        description="Mes actual en español (ej: 'julio')",
        examples=["julio"],
    )


class MetricasTecnicas(BaseModel):
    agua_generada_litros: int
    ahorro_refrigeracion_kw: int


class Distribucion(BaseModel):
    urbana_porcentaje: int
    agricola_porcentaje: int


class MensajesAgentes(BaseModel):
    agente_distribuidor: str
    agente_alerta: str
    agente_roi: str


class SeaCoolSimulationResponse(BaseModel):
    """Response de la simulación SeaCool."""

    metricas_tecnicas: MetricasTecnicas
    distribucion: Distribucion
    mensajes_agentes: MensajesAgentes


class SeaCoolChatRequest(BaseModel):
    """Request para chat libre con el agente SeaCool."""

    message: str = Field(
        ...,
        min_length=1,
        description="Mensaje del usuario para el agente SeaCool.",
    )


class SeaCoolChatResponse(BaseModel):
    """Response del chat SeaCool."""

    response: str
    agent: str = "SeaCool Orchestrator"


# --- Endpoints ---


@router.post(
    "/simulate",
    response_model=SeaCoolSimulationResponse,
    summary="Simulación Multiagente SeaCool",
    description=(
        "Ejecuta la simulación del sistema de economía circular: "
        "calcula agua dulce generada, ahorro energético, distribución "
        "urbana/agrícola y mensajes de los 3 agentes internos."
    ),
)
async def simulate_seacool(request: SeaCoolSimulationRequest):
    """
    Endpoint principal de simulación.
    Orquesta los 3 agentes (Distribuidor, Alerta, ROI) y devuelve
    la decisión consolidada como JSON.
    """
    try:
        result = await seacool_service.simulate(
            temp_ext=request.temp_ext,
            carga_dc=request.carga_dc,
            mes=request.mes,
        )
        return SeaCoolSimulationResponse(**result)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error en simulación SeaCool: {str(e)}",
        )


@router.post(
    "/chat",
    response_model=SeaCoolChatResponse,
    summary="Chat libre con SeaCool AI",
    description=(
        "Conversa con el agente orquestador SeaCool AI "
        "sobre economía circular, desalinización, "
        "refrigeración por absorción u otros temas relacionados."
    ),
)
async def chat_seacool(request: SeaCoolChatRequest):
    """Chat con el agente SeaCool sin parámetros de simulación."""
    try:
        response = await seacool_agent.process(
            user_input=request.message,
        )
        return SeaCoolChatResponse(response=response)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error del agente SeaCool: {str(e)}",
        )


@router.post(
    "/chat/reset",
    summary="Reset del historial SeaCool",
    description="Limpia el historial de conversación del agente SeaCool.",
)
async def reset_seacool_chat():
    """Limpia el historial del agente SeaCool."""
    seacool_agent.clear_history()
    return {"message": "Historial de SeaCool eliminado"}
