"""
SeaCool AI - Rutas del Orquestador Multiagente.
Endpoints para la simulación de economía circular Datacenter ↔ Comunidad costera.
"""

from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.agents.seacool_agent import seacool_agent
from app.services.seacool_service import seacool_service, KG_CO2_POR_KWH
from app.services.scenarios_service import scenario_evaluator
from app.services.api_connectors import (
    OpenMeteoConnector,
    ElectricityMapsConnector,
    CopernicusConnector,
)

_MESES_ES = {
    1: "enero", 2: "febrero", 3: "marzo", 4: "abril",
    5: "mayo", 6: "junio", 7: "julio", 8: "agosto",
    9: "septiembre", 10: "octubre", 11: "noviembre", 12: "diciembre",
}

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
    # Loop circular completo
    calor_residual_mw: float = Field(
        ..., description="Calor recuperable del DC (MW térmicos)"
    )
    agua_total_litros: int = Field(
        ..., description="Agua total desalinizada por MED (L/día)"
    )
    agua_refrigeracion_litros: int = Field(
        ..., description="Agua consumida para refrigerar el DC (cierre del bucle)"
    )
    agua_generada_litros: int = Field(
        ..., description="Excedente distribuible a la comunidad (L/día)"
    )
    ahorro_refrigeracion_kw: int = Field(
        ..., description="Ahorro eléctrico por chiller de absorción (kW)"
    )
    co2_evitado_kg_dia: int = Field(
        ..., description="CO₂ evitado diario por ahorro en refrigeración (kg)"
    )
    eficiencia_loop_pct: float = Field(
        ..., description="Fracción del agua producida que vuelve al DC (%)"
    )
    # Derivados de distribución
    hogares_abastecidos: Optional[int] = Field(
        default=None, description="Hogares abastecidos con el excedente urbano"
    )
    hectareas_regadas: Optional[int] = Field(
        default=None, description="Hectáreas regadas con el excedente agrícola"
    )


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


class SimulateWithContextRequest(BaseModel):
    """Request para simulación con datos reales del sitio."""

    carga_dc: float = Field(
        ..., ge=0, le=100, description="Carga del datacenter en %", examples=[75]
    )
    latitude: float = Field(
        36.7, description="Latitud del datacenter (para clima real y temperatura del mar)"
    )
    longitude: float = Field(
        -2.5, description="Longitud del datacenter"
    )
    country_code: str = Field(
        "", max_length=2,
        description="Código ISO-2 del país (para intensidad de carbono real). "
                    "Si se omite, se estima por latitud.",
        examples=["ES"],
    )
    # Opcionales — si se omiten se usan datos reales de Open-Meteo / Copernicus
    temp_ext: Optional[float] = Field(
        None, ge=-10, le=55,
        description="Temperatura exterior en °C. Si se omite, se obtiene de Open-Meteo.",
    )
    mes: Optional[str] = Field(
        None, min_length=3, max_length=20,
        description="Mes en español. Si se omite, se usa el mes actual.",
    )


class SimulateWithContextResponse(SeaCoolSimulationResponse):
    """Response enriquecida con el contexto real usado."""
    contexto_real: dict = Field(default_factory=dict)


@router.post(
    "/simulate-with-context",
    response_model=SimulateWithContextResponse,
    summary="Simulación con datos reales del sitio",
    description=(
        "Obtiene temperatura real (Open-Meteo), temperatura del mar (Copernicus) "
        "e intensidad de carbono de la red (IEA por país) antes de ejecutar el loop. "
        "El resultado refleja la física real del emplazamiento, no valores genéricos."
    ),
)
async def simulate_with_context(request: SimulateWithContextRequest):
    """
    Flujo:
    1. Temperatura exterior → Open-Meteo (real) o parámetro manual.
    2. Temperatura del mar → Copernicus (estimada por latitud + mes).
    3. Intensidad de carbono → IEA por código de país.
    4. Simula el loop circular con esos valores reales.
    """
    try:
        # Paso 1: clima real en paralelo con temperatura del mar y carbono
        weather_task = OpenMeteoConnector.get_climate_data(request.latitude, request.longitude)
        sea_task     = CopernicusConnector.get_soil_and_sea_data(request.latitude, request.longitude)
        grid_task    = ElectricityMapsConnector.get_grid_carbon_intensity(
            request.latitude, request.longitude, country_code=request.country_code
        )

        import asyncio
        weather, sea, grid = await asyncio.gather(weather_task, sea_task, grid_task)

        # Paso 2: resolver temp_ext y mes
        temp_ext = request.temp_ext
        if temp_ext is None:
            temp_ext = (weather or {}).get("current_temp", 22.0)

        mes = request.mes or _MESES_ES[datetime.now().month]

        # Paso 3: parámetros contextuales para el loop
        sea_surface_temp = (sea or {}).get("sea_surface_temp", 20.0)
        carbon_g_kwh     = (grid or {}).get("carbon_intensity", KG_CO2_POR_KWH * 1000)
        carbon_kg_kwh    = carbon_g_kwh / 1000.0

        # Paso 4: simulación con datos reales
        result = await seacool_service.simulate(
            temp_ext=temp_ext,
            carga_dc=request.carga_dc,
            mes=mes,
            carbon_intensity_kg_kwh=carbon_kg_kwh,
            sea_surface_temp_c=sea_surface_temp,
        )

        return SimulateWithContextResponse(
            **result,
            contexto_real={
                "temp_ext_usada": temp_ext,
                "mes_usado": mes,
                "sea_surface_temp_c": sea_surface_temp,
                "carbon_intensity_g_kwh": carbon_g_kwh,
                "carbon_source": (grid or {}).get("source", "estimado"),
                "weather_source": "Open-Meteo (real)" if weather else "fallback",
            },
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error en simulación con contexto: {str(e)}",
        )
