"""
SeaCool Global - Endpoints para análisis mundial de estrés hídrico.
"""

import time
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx

from app.services.global_service import global_service

router = APIRouter()

# Simple in-memory cache (TTL 1 hour) to avoid hammering PeeringDB
_dc_cache:  dict = {"data": None, "ts": 0}
_wri_cache: dict = {"data": None, "ts": 0}
_DC_TTL  = 3600
_WRI_TTL = 86400   # WRI data is static — cache 24h

_WRI_CARTO = "https://wri-rw.carto.com/api/v2/sql"
_WRI_SQL = (
    "SELECT pfaf_id, sub_name, bws_score, bws_cat, bws_label, "
    "ST_X(ST_Centroid(the_geom)) AS lon, ST_Y(ST_Centroid(the_geom)) AS lat "
    "FROM wat_050_aqueduct_baseline_water_stress "
    "WHERE bws_cat >= 3 ORDER BY bws_score DESC"
)


async def _fetch_datacenters():
    now = time.time()
    if _dc_cache["data"] is not None and now - _dc_cache["ts"] < _DC_TTL:
        return _dc_cache["data"]

    # Fallback datacenters in high-stress water regions (if PeeringDB fails)
    FALLBACK_DCS = [
        # España - Región Mediterránea
        {"id": 1, "name": "Telefónica ES-MAD", "city": "Madrid", "country": "ES", "lat": 40.4168, "lng": -3.7038, "net_count": 150},
        {"id": 2, "name": "Atrás BCN-2", "city": "Barcelona", "country": "ES", "lat": 41.3851, "lng": 2.1734, "net_count": 180},
        {"id": 3, "name": "Almería CoastDC", "city": "Almería", "country": "ES", "lat": 36.8399, "lng": -2.3667, "net_count": 45},
        
        # Italia - Sicilia
        {"id": 4, "name": "Palermo DataHub", "city": "Palermo", "country": "IT", "lat": 38.1156, "lng": 13.3644, "net_count": 85},
        {"id": 5, "name": "Catania TelecomItaly", "city": "Catania", "country": "IT", "lat": 37.4963, "lng": 15.0874, "net_count": 92},
        
        # Marruecos
        {"id": 6, "name": "Casablanca MarocDC", "city": "Casablanca", "country": "MA", "lat": 33.5731, "lng": -7.5898, "net_count": 60},
        {"id": 7, "name": "Tangier Gateway", "city": "Tánger", "country": "MA", "lat": 35.7595, "lng": -5.8340, "net_count": 55},
        
        # Túnez
        {"id": 8, "name": "Tunis Telecom", "city": "Túnez", "country": "TN", "lat": 36.8065, "lng": 10.1686, "net_count": 50},
        
        # Argelia
        {"id": 9, "name": "Algiers DataCenter", "city": "Argel", "country": "DZ", "lat": 36.7538, "lng": 3.0588, "net_count": 70},
        
        # Murcia España
        {"id": 10, "name": "Murcia Regional", "city": "Murcia", "country": "ES", "lat": 37.9922, "lng": -1.1307, "net_count": 40},
    ]

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.get(
                "https://www.peeringdb.com/api/fac",
                params={"limit": 5000, "fields": "id,name,city,country,latitude,longitude,net_count"},
            )
            resp.raise_for_status()
            raw = resp.json().get("data", [])

        result = [
            {
                "id": f["id"],
                "name": f["name"],
                "city": f.get("city", ""),
                "country": f.get("country", ""),
                "lat": float(f["latitude"]),
                "lng": float(f["longitude"]),
                "net_count": f.get("net_count", 0),
            }
            for f in raw
            if f.get("latitude") and f.get("longitude")
        ]
    except Exception as e:
        # If PeeringDB fails, use fallback datacenters
        print(f"PeeringDB fetch failed: {e}. Using fallback datacenters.")
        result = FALLBACK_DCS

    _dc_cache["data"] = result
    _dc_cache["ts"] = now
    return result


class AnalyzeRequest(BaseModel):
    region_id: str

class AnalyzeDCRequest(BaseModel):
    id:        int
    name:      str
    city:      str
    country:   str
    lat:       float
    lng:       float
    net_count: int


@router.get(
    "/regions",
    summary="Listado de regiones con estrés hídrico",
    description="Devuelve las ~35 zonas costeras con mayor estrés hídrico mundial (datos WRI Aqueduct 2023).",
)
async def get_regions():
    return global_service.get_regions()


@router.get(
    "/wri-basins",
    summary="Cuencas hídricas WRI Aqueduct (datos reales)",
    description="Devuelve cuencas con estrés hídrico Alto o Extremo directamente desde WRI CARTO (caché 24h).",
)
async def get_wri_basins():
    now = time.time()
    if _wri_cache["data"] is not None and now - _wri_cache["ts"] < _WRI_TTL:
        return _wri_cache["data"]

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(_WRI_CARTO, data={"q": _WRI_SQL})
            resp.raise_for_status()
            raw = resp.json().get("rows", [])
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error al consultar WRI CARTO: {e}")

    result = [
        {
            "id": r["pfaf_id"],
            "name": r.get("sub_name", ""),
            "bws_score": round(r["bws_score"], 2),
            "bws_cat":   r["bws_cat"],
            "bws_label": r["bws_label"],
            "lat": round(r["lat"], 4),
            "lng": round(r["lon"], 4),
        }
        for r in raw
        if r.get("lat") is not None and r.get("lon") is not None
    ]

    _wri_cache["data"] = result
    _wri_cache["ts"]   = now
    return result


@router.get(
    "/datacenters",
    summary="Datacenters globales (PeeringDB)",
    description="Devuelve los datacenters con coordenadas de PeeringDB (caché 1h). Si PeeringDB no está disponible, usa fallback de datacenters en regiones de alto estrés hídrico.",
)
async def get_datacenters():
    return await _fetch_datacenters()


@router.post(
    "/analyze-dc",
    summary="Análisis SeaCool para un datacenter real",
    description="Cruza las coordenadas del DC con WRI Aqueduct y estima calor residual desde net_count.",
)
async def analyze_dc(request: AnalyzeDCRequest):
    result = await global_service.analyze_dc(request.model_dump())
    return result


@router.post(
    "/analyze",
    summary="Análisis multiagente para una región",
    description=(
        "Ejecuta el análisis SeaCool para una región concreta: "
        "4 agentes (Hídrico, Térmico, Distribuidor, Impacto) evalúan "
        "el potencial y generan un pitch para gobiernos."
    ),
)
async def analyze_region(request: AnalyzeRequest):
    result = await global_service.analyze(request.region_id)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result
