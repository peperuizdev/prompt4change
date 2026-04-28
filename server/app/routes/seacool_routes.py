"""
SeaCool AI - Rutas del Orquestador Multiagente.
Endpoints para la simulación de economía circular Datacenter ↔ Comunidad costera.
"""

from typing import Optional, List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.agents.seacool_agent import seacool_agent
from app.services.seacool_service import seacool_service
from app.services.scenarios_service import scenario_evaluator

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


class EvaluateScenarioRequest(BaseModel):
    """Request para evaluar escenarios dinámicos."""

    dc_power_mw: float = Field(
        default=50,
        ge=10,
        le=100,
        description="Potencia del datacenter en MW",
        examples=[50],
    )
    latitude: float = Field(
        default=36.7,
        description="Latitud (ej: 36.7 para Almería)",
        examples=[36.7],
    )
    longitude: float = Field(
        default=-2.5,
        description="Longitud (ej: -2.5 para Almería)",
        examples=[-2.5],
    )
    region: str = Field(
        default="almeria",
        description="Región (almeria, zaragoza, murcia, etc)",
        examples=["almeria"],
    )
    mes: Optional[str] = Field(
        default=None,
        description="Mes actual (si None, usa mes actual)",
        examples=["julio"],
    )
    carga_dc_pct: float = Field(
        default=75,
        ge=0,
        le=100,
        description="Carga del datacenter en % (0-100)",
        examples=[75],
    )


class EscenarioImpacto(BaseModel):
    """Información de un escenario de impacto."""

    nombre: str
    agua_pct: int
    calefaccion_pct: int
    agua_litros_dia: int
    hectareas_regadas: int
    hogares_calentados: int
    score_social: int
    justificacion: str
    recomendacion_ia: bool


class EvaluateScenarioResponse(BaseModel):
    """Response de evaluación de escenarios."""

    status: str
    escenarios: List[EscenarioImpacto] = []
    recomendacion_final: Optional[str] = None
    razon_recomendacion: Optional[str] = None
    contexto_usado: Optional[dict] = None


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


# ============================================================================
# NUEVOS ENDPOINTS — Evaluación de Escenarios Dinámicos
# ============================================================================


@router.post(
    "/evaluate-scenarios",
    response_model=EvaluateScenarioResponse,
    summary="Evaluación Multiescenario Inteligente",
    description=(
        "Evalúa 3 escenarios dinámicos de distribución de calor residual "
        "(agua vs calefacción) basados en datos REALES de clima, "
        "estrés hídrico, energía y contexto local. "
        "Usa APIs externas y IA para generar recomendaciones."
    ),
)
async def evaluate_scenarios(request: EvaluateScenarioRequest):
    """
    Endpoint de evaluación de escenarios.
    
    Orquesta:
    1. Obtención de datos reales (Open-Meteo, WRI Aqueduct, Electricity Maps, etc).
    2. Generación de 3 escenarios con diferentes prioridades.
    3. Evaluación IA de cada escenario con score de impacto social.
    4. Recomendación final basada en contexto.
    """
    try:
        result = await scenario_evaluator.evaluate_scenarios(
            dc_power_mw=request.dc_power_mw,
            latitude=request.latitude,
            longitude=request.longitude,
            region=request.region,
            mes=request.mes,
            carga_dc_pct=request.carga_dc_pct,
        )
        return EvaluateScenarioResponse(**result)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error en evaluación de escenarios: {str(e)}",
        )


@router.post(
    "/simulate-with-context",
    response_model=SeaCoolSimulationResponse,
    summary="Simulación Multiagente con Contexto Real",
    description=(
        "Versión mejorada de /simulate que integra datos reales del contexto. "
        "Obtiene clima, agua y energía en tiempo real antes de ejecutar los agentes."
    ),
)
async def simulate_with_context(request: SeaCoolSimulationRequest):
    """
    Simulación mejorada que obtiene contexto real antes de ejecutar.
    """
    try:
        # Aquí se podría hacer fetch de datos reales
        # y pasarlos al servicio
        result = await seacool_service.simulate(
            temp_ext=request.temp_ext,
            carga_dc=request.carga_dc,
            mes=request.mes,
        )
        return SeaCoolSimulationResponse(**result)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error en simulación con contexto: {str(e)}",
        )
