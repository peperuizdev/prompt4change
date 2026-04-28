"""
SeaCool Global - Endpoints para análisis mundial de estrés hídrico.
"""

import asyncio
import time
import logging
import json
from pathlib import Path
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx

from app.services.global_service import global_service
from app.core.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)

# Simple in-memory cache (TTL 1 hour) to avoid hammering PeeringDB
_dc_cache:  dict = {"data": None, "ts": 0}
_wri_cache: dict = {"data": None, "ts": 0}
_DC_TTL       = 3600
_DC_RETRY_TTL = 120   # si PeeringDB falla, reintentar en 2 min (no 1h)
_WRI_TTL      = 86400
_PEERINGDB_CACHE_FILE = Path(__file__).resolve().parents[1] / "data" / "peeringdb_cache.json"
_PEERINGDB_PAGE_SIZE = 200  # PeeringDB rate-limits páginas grandes

_WRI_CARTO = "https://wri-rw.carto.com/api/v2/sql"
_WRI_SQL = (
    "SELECT pfaf_id, sub_name, bws_score, bws_cat, bws_label, "
    "ST_X(ST_Centroid(the_geom)) AS lon, ST_Y(ST_Centroid(the_geom)) AS lat "
    "FROM wat_050_aqueduct_baseline_water_stress "
    "WHERE bws_cat >= 3 ORDER BY bws_score DESC"
)

_FALLBACK_DATACENTERS = [
    {
        "id": 1,
        "name": "Madrid Core DC",
        "city": "Madrid",
        "country": "ES",
        "lat": 40.4168,
        "lng": -3.7038,
        "net_count": 120,
    },
    {
        "id": 2,
        "name": "Barcelona Edge Hub",
        "city": "Barcelona",
        "country": "ES",
        "lat": 41.3874,
        "lng": 2.1686,
        "net_count": 80,
    },
    {
        "id": 3,
        "name": "Lisbon Coastal DC",
        "city": "Lisboa",
        "country": "PT",
        "lat": 38.7223,
        "lng": -9.1393,
        "net_count": 60,
    },
]


async def _fetch_datacenters():
    now = time.time()
    if _dc_cache["data"] is not None and now - _dc_cache["ts"] < _DC_TTL:
        return _dc_cache["data"]

    # Disco cache tiene prioridad si PeeringDB no está disponible
    disk = _load_peeringdb_disk_cache()
    if disk:
        _dc_cache["data"] = disk
        _dc_cache["ts"] = now
        # Intenta actualizar en background solo si el disco cache tiene > 1 día
        disk_age = now - _PEERINGDB_CACHE_FILE.stat().st_mtime if _PEERINGDB_CACHE_FILE.exists() else 9999
        if disk_age < 86400:
            logger.info("PeeringDB: usando cache en disco (%d DCs, %.1f h)", len(disk), disk_age / 3600)
            return disk

    api_key = settings.PEERINGDB_API_KEY
    if not api_key:
        logger.warning("PEERINGDB_API_KEY no configurada — PeeringDB puede rechazar peticiones sin autenticación")

    headers = {"User-Agent": "SeaCool/1.0 (prompt4change)"}
    if api_key:
        headers["Authorization"] = f"Api-Key {api_key}"

    result = []
    try:
        offset = 0
        async with httpx.AsyncClient(timeout=20) as client:
            while True:
                resp = await client.get(
                    "https://www.peeringdb.com/api/fac",
                    params={
                        "limit": _PEERINGDB_PAGE_SIZE,
                        "offset": offset,
                        "fields": "id,name,city,country,latitude,longitude,net_count",
                    },
                    headers=headers,
                )
                resp.raise_for_status()
                raw = resp.json().get("data", [])
                if not raw:
                    break

                result.extend([
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
                ])

                if len(raw) < _PEERINGDB_PAGE_SIZE:
                    break
                offset += _PEERINGDB_PAGE_SIZE
                await asyncio.sleep(1.0)

        if result:
            logger.info("PeeringDB: %d datacenters descargados", len(result))
            try:
                _PEERINGDB_CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
                _PEERINGDB_CACHE_FILE.write_text(json.dumps(result), encoding="utf-8")
            except Exception as exc:
                logger.warning("No se pudo guardar cache en disco: %s", exc)
            _dc_cache["data"] = result
            _dc_cache["ts"] = now
        else:
            logger.warning("PeeringDB devolvió 0 resultados")
            result = disk or _FALLBACK_DATACENTERS
            # TTL corto para reintentar pronto
            _dc_cache["data"] = result
            _dc_cache["ts"] = now - _DC_TTL + _DC_RETRY_TTL

    except Exception as exc:
        logger.warning("PeeringDB no disponible: %s", exc)
        result = disk or _FALLBACK_DATACENTERS
        # TTL corto: reintentar en 2 min
        _dc_cache["data"] = result
        _dc_cache["ts"] = now - _DC_TTL + _DC_RETRY_TTL

    return result


def _load_peeringdb_disk_cache():
    if not _PEERINGDB_CACHE_FILE.exists():
        return None
    try:
        data = json.loads(_PEERINGDB_CACHE_FILE.read_text(encoding="utf-8"))
        return data if isinstance(data, list) and data else None
    except Exception as exc:
        logger.warning("Cache PeeringDB en disco inválida: %s", exc)
        return None


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
