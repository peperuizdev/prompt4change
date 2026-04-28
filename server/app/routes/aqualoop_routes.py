"""
AquaLoop AI — Endpoints del frontend.

Endpoints claros para el cliente React:

  POST /api/aqualoop/chat              ← Chatbot principal (historial de sesión)
  POST /api/aqualoop/analyze           ← Análisis completo (todos los agentes + informe)
  GET  /api/aqualoop/report/{id}       ← Descarga del informe de la sesión
  GET  /api/aqualoop/history/{id}      ← Historial de chat de la sesión
  DELETE /api/aqualoop/session/{id}    ← Limpia la sesión
  GET  /api/aqualoop/agents/status     ← Estado de los agentes disponibles
"""

import uuid
from typing import Optional, List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.session_service import session_service
from app.services.agent_orchestrator import orchestrate, detect_agents_for_message
from app.services.report_generator import report_generator
from app.services.ai_service import ai_service

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000, description="Mensaje del usuario")
    session_id: Optional[str] = Field(None, description="ID de sesión (se crea si no se envía)")
    latitude: float = Field(36.7, description="Latitud del datacenter")
    longitude: float = Field(-2.5, description="Longitud del datacenter")
    region: str = Field("almeria", description="Región (almeria, zaragoza, murcia)")
    dc_power_mw: float = Field(50, ge=10, le=100, description="Potencia del datacenter en MW")
    carga_dc_pct: float = Field(75, ge=0, le=100, description="Carga actual en %")


class ChatResponse(BaseModel):
    session_id: str
    reply: str
    agents_used: List[str] = []
    charts_data: dict = {}
    has_report: bool = False


class AnalyzeRequest(BaseModel):
    session_id: Optional[str] = None
    latitude: float = Field(36.7, description="Latitud del datacenter")
    longitude: float = Field(-2.5, description="Longitud del datacenter")
    region: str = Field("almeria", description="Región")
    dc_power_mw: float = Field(50, ge=10, le=100)
    carga_dc_pct: float = Field(75, ge=0, le=100)
    user_context: str = Field("", description="Contexto adicional del usuario")


class AnalyzeResponse(BaseModel):
    session_id: str
    report: Optional[dict] = None
    agents_results: dict = {}
    charts_data: dict = {}


class HistoryResponse(BaseModel):
    session_id: str
    history: list = []
    message_count: int = 0


# ── System prompt del chatbot (compacto para ahorrar tokens) ──────────────────

_CHAT_SYSTEM = """Eres AquaLoop AI, asistente de impacto social especializado en reutilización del calor residual de datacenters.
Cuando el usuario describa un problema hídrico o climático, responde con datos concretos si los tienes.
Respuestas cortas y directas (máximo 4 frases). Propón ejecutar un análisis completo si el usuario quiere datos detallados.
Idioma: español."""


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post(
    "/chat",
    response_model=ChatResponse,
    summary="Chat con AquaLoop AI",
    description=(
        "Endpoint principal del chatbot. Detecta automáticamente qué agentes "
        "son relevantes para el mensaje, los ejecuta en paralelo, y genera "
        "una respuesta contextualizada. Mantiene historial de sesión en memoria."
    ),
)
async def chat(req: ChatRequest):
    """
    Flujo:
    1. Detecta agentes relevantes por palabras clave del mensaje.
    2. Ejecuta esos agentes en paralelo (sin LLM, solo fetch de datos).
    3. Inyecta el contexto compacto en el historial de la sesión.
    4. Hace UNA llamada al LLM para generar la respuesta.
    5. Guarda la respuesta en el historial.
    """
    session_id = req.session_id or str(uuid.uuid4())
    session = session_service.get_or_create(session_id)

    # Detectar y ejecutar agentes relevantes (sin LLM)
    relevant_agents = detect_agents_for_message(req.message)
    agents_data = await orchestrate(
        latitude=req.latitude,
        longitude=req.longitude,
        region=req.region,
        agents_to_run=relevant_agents,
    )

    # Contexto compacto para no explotar los tokens del LLM
    context_snippet = _build_context_snippet(agents_data)

    # Construir mensajes: system + últimos 6 del historial + mensaje actual con contexto
    messages = [{"role": "system", "content": _CHAT_SYSTEM}]
    messages.extend(session.recent_history(n=6))
    messages.append({
        "role": "user",
        "content": f"{req.message}\n\n[Datos en tiempo real: {context_snippet}]",
    })

    try:
        reply = await ai_service.chat(messages=messages, temperature=0.55, max_tokens=350)
    except Exception as e:
        reply = f"Error al generar respuesta: {str(e)}"

    # Guardar en historial (sin el snippet de contexto para no contaminar el historial)
    session.add_message("user", req.message)
    session.add_message("assistant", reply)
    session.agents_context = agents_data

    return ChatResponse(
        session_id=session_id,
        reply=reply,
        agents_used=agents_data.get("agents_called", []),
        charts_data=_extract_charts(agents_data),
        has_report=session.report_data is not None,
    )


@router.post(
    "/analyze",
    response_model=AnalyzeResponse,
    summary="Análisis completo: todos los agentes + informe LLM",
    description=(
        "Ejecuta los 4 agentes (WeatherAgent, WaterAgent, CopernicusAgent, GridAgent) "
        "en paralelo y genera un informe ejecutivo estructurado con UNA llamada al LLM. "
        "El informe queda guardado en la sesión para descarga posterior."
    ),
)
async def analyze(req: AnalyzeRequest):
    """
    Flujo:
    1. Ejecuta los 4 agentes en paralelo.
    2. Genera informe con UNA llamada al LLM (report_generator).
    3. Guarda informe en la sesión.
    4. Devuelve informe + datos para gráficos.
    """
    session_id = req.session_id or str(uuid.uuid4())
    session = session_service.get_or_create(session_id)

    # Todos los agentes en paralelo
    agents_data = await orchestrate(
        latitude=req.latitude,
        longitude=req.longitude,
        region=req.region,
    )

    # UNA llamada al LLM para el informe completo
    report = await report_generator.generate(
        agents_data=agents_data,
        dc_power_mw=req.dc_power_mw,
        carga_pct=req.carga_dc_pct,
        region=req.region,
        user_context=req.user_context,
    )

    # Guardar en sesión
    session.agents_context = agents_data
    session.report_data = report

    charts = _extract_charts(agents_data)
    if report:
        if "escenarios" in report:
            charts["escenarios"] = report["escenarios"]
        if "metricas_clave" in report:
            charts["metricas_clave"] = report["metricas_clave"]
        if "hallazgos" in report:
            charts["hallazgos"] = report["hallazgos"]

    return AnalyzeResponse(
        session_id=session_id,
        report=report,
        agents_results={
            k: {
                "source": v.get("source", ""),
                "real_data": v.get("real_data", False),
                "data": v.get("data", {}),
            }
            for k, v in agents_data.get("results", {}).items()
        },
        charts_data=charts,
    )


@router.get(
    "/report/{session_id}",
    summary="Obtener informe de la sesión",
    description="Devuelve el último informe generado en la sesión. Útil para descarga PDF desde el frontend.",
)
async def get_report(session_id: str):
    session = session_service.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    if not session.report_data:
        raise HTTPException(status_code=404, detail="No hay informe generado en esta sesión. Llama primero a /analyze")
    return {
        "session_id": session_id,
        "report": session.report_data,
    }


@router.get(
    "/history/{session_id}",
    response_model=HistoryResponse,
    summary="Historial de chat de la sesión",
)
async def get_history(session_id: str):
    session = session_service.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Sesión no encontrada o expirada")
    return HistoryResponse(
        session_id=session_id,
        history=session.history,
        message_count=len(session.history),
    )


@router.delete(
    "/session/{session_id}",
    summary="Eliminar sesión y su historial",
)
async def delete_session(session_id: str):
    session_service.delete(session_id)
    return {"message": f"Sesión {session_id} eliminada"}


@router.get(
    "/agents/status",
    summary="Estado de los agentes disponibles",
    description="Lista los agentes, su fuente de datos y si usan datos reales o simulados.",
)
async def agents_status():
    return {
        "agents": [
            {
                "id": "weather",
                "name": "WeatherAgent",
                "source": "Open-Meteo API",
                "real_data": True,
                "description": "Temperatura actual, lluvia histórica 30 días, humedad del suelo",
                "status": "active",
            },
            {
                "id": "water",
                "name": "WaterAgent",
                "source": "WRI Aqueduct",
                "real_data": True,
                "description": "Índice de estrés hídrico, severidad de sequía, agotamiento de acuíferos",
                "status": "active",
            },
            {
                "id": "copernicus",
                "name": "CopernicusAgent",
                "source": "Copernicus ESA (simulado)",
                "real_data": False,
                "description": "Humedad del suelo, temperatura superficial del mar, NDVI",
                "status": "active",
            },
            {
                "id": "grid",
                "name": "GridAgent",
                "source": "Electricity Maps (simulado)",
                "real_data": False,
                "description": "Intensidad de carbono de la red, % renovables, % fósiles",
                "status": "active",
            },
        ]
    }


# ── Helpers ───────────────────────────────────────────────────────────────────

def _build_context_snippet(agents_data: dict) -> str:
    """Contexto compacto en texto plano para inyectar en el prompt del chat."""
    results = agents_data.get("results", {})
    parts = []

    w = results.get("weather", {}).get("data", {})
    if w:
        parts.append(f"Temp={w.get('current_temp')}°C, lluvia30d={w.get('total_rain_30d')}mm")

    wa = results.get("water", {}).get("data", {})
    if wa:
        parts.append(f"EstrésHídrico={wa.get('water_stress_index')}/5, sequía={wa.get('drought_severity')}")

    cop = results.get("copernicus", {}).get("data", {})
    if cop:
        parts.append(f"HumedadSuelo={cop.get('soil_moisture_index')}%, TempMar={cop.get('sea_surface_temp')}°C")

    grid = results.get("grid", {}).get("data", {})
    if grid:
        parts.append(f"Carbono={grid.get('carbon_intensity')}gCO2/kWh, Renovables={grid.get('renewable_percentage')}%")

    return " | ".join(parts) if parts else "sin datos de agentes"


def _extract_charts(agents_data: dict) -> dict:
    """Extrae y formatea los datos de agentes para los gráficos del frontend."""
    results = agents_data.get("results", {})
    charts = {}

    w = results.get("weather", {}).get("data", {})
    if w:
        charts["climate"] = {
            "current_temp": w.get("current_temp"),
            "total_rain_30d": w.get("total_rain_30d"),
            "avg_temp_30d": w.get("avg_temp_30d"),
            "heat_stress": w.get("heat_stress"),
            "soil_moisture": w.get("soil_moisture"),
        }

    wa = results.get("water", {}).get("data", {})
    if wa:
        charts["water_stress"] = {
            "index": wa.get("water_stress_index"),
            "urgency": wa.get("urgency_score"),
            "drought": wa.get("drought_severity"),
            "groundwater": wa.get("groundwater_depletion"),
        }

    grid = results.get("grid", {}).get("data", {})
    if grid:
        charts["grid"] = {
            "carbon_intensity": grid.get("carbon_intensity"),
            "renewable_pct": grid.get("renewable_percentage"),
            "fossil_pct": grid.get("fossil_percentage"),
            "status": grid.get("grid_status"),
        }

    cop = results.get("copernicus", {}).get("data", {})
    if cop:
        charts["soil"] = {
            "moisture": cop.get("soil_moisture_index"),
            "sea_temp": cop.get("sea_surface_temp"),
            "ndvi": cop.get("vegetation_index"),
            "sea_anomaly": cop.get("sea_anomaly"),
        }

    return charts
