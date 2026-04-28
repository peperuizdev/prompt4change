import json
import time
from pathlib import Path
import httpx
from fastapi import APIRouter, HTTPException, Body
from typing import Dict, Any

router = APIRouter()

CACHE_FILE = Path(__file__).parent.parent.parent / "data" / "datacenters_cache.json"
CACHE_TTL = 3600 * 24

FALLBACK_DCS = [
    {"id": 1001, "name": "Equinix MD2", "city": "Madrid", "country": "ES", "lat": 40.4168, "lng": -3.7038, "net_count": 350},
    {"id": 1010, "name": "DataCenter Almería", "city": "Almería", "country": "ES", "lat": 36.834, "lng": -2.4637, "net_count": 45},
]

async def _fetch_datacenters():
    if CACHE_FILE.exists():
        try:
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                cache = json.load(f)
                if time.time() - cache.get("timestamp", 0) < CACHE_TTL:
                    return cache.get("data")
        except: pass
    
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get("https://www.peeringdb.com/api/fac", params={"limit": 1000, "fields": "id,name,city,country,latitude,longitude,net_count"})
            if resp.status_code == 200:
                raw = resp.json().get("data", [])
                result = [{"id": f["id"], "name": f["name"], "city": f.get("city", ""), "country": f.get("country", ""), "lat": float(f["latitude"]), "lng": float(f["longitude"]), "net_count": f.get("net_count", 0)} for f in raw if f.get("latitude") and f.get("longitude")]
                CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
                with open(CACHE_FILE, "w", encoding="utf-8") as f: json.dump({"timestamp": time.time(), "data": result}, f)
                return result
    except: pass
    return FALLBACK_DCS

@router.get("/regions")
async def get_regions():
    from app.services.global_service import global_service
    return global_service.get_regions()

@router.get("/datacenters")
async def get_datacenters():
    return await _fetch_datacenters()

# Endpoint para análisis de REGIONES (POST)
@router.post("/analyze")
async def analyze_region(body: Dict[str, Any] = Body(...)):
    from app.services.global_service import global_service
    region_id = body.get("region_id")
    if not region_id:
        raise HTTPException(status_code=400, detail="region_id is required")
    return await global_service.analyze(region_id)

# Endpoint para análisis de DATACENTERS (POST)
@router.post("/analyze-dc")
async def analyze_dc(body: Dict[str, Any] = Body(...)):
    from app.services.global_service import global_service
    # Aseguramos que los nombres de los campos coincidan con lo que envía el front
    # Si el front envía latitude/longitude en lugar de lat/lng, lo mapeamos
    dc_data = {
        "id": body.get("id", 999),
        "name": body.get("name", "Unknown DC"),
        "city": body.get("city", "Unknown City"),
        "country": body.get("country", "??"),
        "lat": body.get("lat") or body.get("latitude"),
        "lng": body.get("lng") or body.get("longitude"),
        "net_count": body.get("net_count", 0)
    }
    
    if dc_data["lat"] is None or dc_data["lng"] is None:
        raise HTTPException(status_code=400, detail="Coordinates (lat/lng) are required")
        
    return await global_service.analyze_dc(dc_data)
