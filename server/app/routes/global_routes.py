"""
SeaCool Global - Endpoints para análisis mundial de estrés hídrico.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.global_service import global_service

router = APIRouter()


class AnalyzeRequest(BaseModel):
    region_id: str


@router.get(
    "/regions",
    summary="Listado de regiones con estrés hídrico",
    description="Devuelve las ~35 zonas costeras con mayor estrés hídrico mundial (datos WRI Aqueduct 2023).",
)
async def get_regions():
    return global_service.get_regions()


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
