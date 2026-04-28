"""
AquaLoop AI — Orquestador de Agentes Especializados.

Cada agente es independiente: solo OBTIENE datos, no llama al LLM.
Los LLM calls ocurren una sola vez en el generador de informes.

Agentes disponibles:
  - WeatherAgent   → Open-Meteo API (real, sin API key)
  - WaterAgent     → WRI Aqueduct (datos regionales reales + índice)
  - CopernicusAgent→ Copernicus ESA (simulado con valores mediterráneos realistas)
  - GridAgent      → Electricity Maps (simulado con mix España real ~50% renovables)
"""

import asyncio
from typing import Dict, Any, List, Optional

from app.services.api_connectors import (
    OpenMeteoConnector,
    WRIAqueductConnector,
    ElectricityMapsConnector,
    CopernicusConnector,
)

# ── Detección de intención por palabras clave ─────────────────────────────────

_AGENT_KEYWORDS: Dict[str, List[str]] = {
    "weather": [
        "temperatura", "lluvia", "clima", "calor", "frío", "sequía",
        "precipitación", "meteo", "tiempo", "ola de calor",
    ],
    "water": [
        "agua", "hídrico", "sequía", "estrés", "acuífero", "río",
        "riego", "escasez", "desalinización", "desalación",
    ],
    "copernicus": [
        "satélite", "suelo", "vegetación", "humedad", "ndvi",
        "cobertura", "cultivo", "campo",
    ],
    "grid": [
        "energía", "electricidad", "carbono", "renovable", "red eléctrica",
        "co2", "emisiones", "solar", "eólica", "fotovoltaica",
    ],
}


def detect_agents_for_message(message: str) -> List[str]:
    """
    Detecta qué agentes son relevantes para el mensaje del usuario.
    Si no se detecta ninguno concreto, devuelve todos (análisis completo).
    """
    msg = message.lower()
    agents = {
        agent
        for agent, keywords in _AGENT_KEYWORDS.items()
        if any(kw in msg for kw in keywords)
    }
    return list(agents) if agents else list(_AGENT_KEYWORDS.keys())


# ── Funciones de cada agente ──────────────────────────────────────────────────

async def run_weather_agent(latitude: float, longitude: float) -> Dict[str, Any]:
    """
    WeatherAgent — Open-Meteo API.
    Datos reales: temperatura actual, lluvia 30 días, humedad del suelo.
    """
    data = await OpenMeteoConnector.get_climate_data(latitude, longitude)
    return {
        "agent_id": "weather",
        "agent_name": "WeatherAgent",
        "source": "Open-Meteo API",
        "real_data": True,
        "data": data or _weather_fallback(),
    }


async def run_water_agent(region: str) -> Dict[str, Any]:
    """
    WaterAgent — WRI Aqueduct.
    Índice de estrés hídrico, severidad de sequía, tasa de agotamiento de acuíferos.
    """
    data = await WRIAqueductConnector.get_water_stress(region)
    return {
        "agent_id": "water",
        "agent_name": "WaterAgent",
        "source": "WRI Aqueduct (datos regionales)",
        "real_data": True,
        "data": data or _water_fallback(region),
    }


async def run_copernicus_agent(latitude: float, longitude: float) -> Dict[str, Any]:
    """
    CopernicusAgent — Copernicus ESA (simulado).
    Humedad del suelo, temperatura superficial del mar, índice de vegetación NDVI.
    """
    data = await CopernicusConnector.get_soil_and_sea_data(latitude, longitude)
    return {
        "agent_id": "copernicus",
        "agent_name": "CopernicusAgent",
        "source": "Copernicus ESA (simulado)",
        "real_data": False,
        "data": data or _copernicus_fallback(),
    }


async def run_grid_agent(latitude: float, longitude: float) -> Dict[str, Any]:
    """
    GridAgent — Electricity Maps (simulado).
    Intensidad de carbono de la red, % renovables, % fósiles.
    """
    data = await ElectricityMapsConnector.get_grid_carbon_intensity(latitude, longitude)
    return {
        "agent_id": "grid",
        "agent_name": "GridAgent",
        "source": "Electricity Maps (simulado)",
        "real_data": False,
        "data": data or _grid_fallback(),
    }


# ── Orquestador principal ─────────────────────────────────────────────────────

_AGENT_RUNNERS = {
    "weather":    run_weather_agent,
    "water":      run_water_agent,
    "copernicus": run_copernicus_agent,
    "grid":       run_grid_agent,
}


async def orchestrate(
    latitude: float,
    longitude: float,
    region: str,
    agents_to_run: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Ejecuta los agentes seleccionados en paralelo y devuelve el contexto agregado.

    Returns:
        {
            "agents_called": ["WeatherAgent", "WaterAgent", ...],
            "results": {
                "weather": {"agent_id": ..., "data": {...}},
                ...
            }
        }
    """
    selected = agents_to_run or list(_AGENT_RUNNERS.keys())

    # Construir las corrutinas en orden
    tasks: Dict[str, Any] = {}
    for key in selected:
        if key == "weather":
            tasks[key] = run_weather_agent(latitude, longitude)
        elif key == "water":
            tasks[key] = run_water_agent(region)
        elif key == "copernicus":
            tasks[key] = run_copernicus_agent(latitude, longitude)
        elif key == "grid":
            tasks[key] = run_grid_agent(latitude, longitude)

    raw_results = await asyncio.gather(*tasks.values(), return_exceptions=True)

    results: Dict[str, Any] = {}
    agents_called: List[str] = []

    for key, result in zip(tasks.keys(), raw_results):
        if isinstance(result, Exception):
            print(f"⚠️ Agente '{key}' falló: {result}")
            results[key] = {
                "agent_id": key,
                "agent_name": key.capitalize() + "Agent",
                "error": str(result),
                "data": {},
            }
        else:
            results[key] = result
            agents_called.append(result.get("agent_name", key))

    return {
        "agents_called": agents_called,
        "results": results,
    }


# ── Datos de fallback (si la API falla) ──────────────────────────────────────

def _weather_fallback() -> Dict[str, Any]:
    return {
        "current_temp": 24.0,
        "current_rain": 0.0,
        "soil_moisture": 28.0,
        "total_rain_30d": 8.0,
        "avg_temp_30d": 23.5,
        "heat_stress": "moderate",
    }


def _water_fallback(region: str) -> Dict[str, Any]:
    return {
        "region": region,
        "water_stress_index": 3.5,
        "groundwater_depletion": "high",
        "drought_severity": "severe",
        "urgency_score": 70,
    }


def _copernicus_fallback() -> Dict[str, Any]:
    return {
        "soil_moisture_index": 28,
        "sea_surface_temp": 19.0,
        "vegetation_index": 0.52,
        "sea_anomaly": -0.5,
    }


def _grid_fallback() -> Dict[str, Any]:
    return {
        "carbon_intensity": 135,
        "fossil_percentage": 45,
        "renewable_percentage": 55,
        "grid_status": "clean",
    }
