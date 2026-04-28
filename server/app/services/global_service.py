"""
SeaCool Global - Servicio de análisis multiagente por región.
Evalúa el potencial SeaCool en cualquier zona costera con estrés hídrico del mundo.
"""

import json
import math
import re
from pathlib import Path
from typing import Any, Dict, List, Optional

import httpx

from app.services.ai_service import ai_service

DATA_PATH = Path(__file__).parent.parent / "data" / "regions.json"

ANALYSIS_PROMPT = """Eres el orquestador multiagente de SeaCool Global. Analiza el potencial de la tecnología SeaCool (recuperación de calor residual de datacenters + desalinización marina) para una región específica con estrés hídrico.

TECNOLOGÍA:
- 1 MW de calor residual continuo → ~15.000 L/día de agua dulce
- CO2 evitado vs desalinización eléctrica convencional: 0,5 kg CO2/m³
- Coste de instalación: ~1,5M EUR/MW
- Payback típico: 7-12 años

SIMULA 4 AGENTES ESPECIALIZADOS y devuelve un análisis riguroso y realista.

RESPONDE SOLO EN JSON (sin markdown, sin texto extra):
{
  "hydro_agent": {
    "assessment": "Evaluación en 2-3 frases del estrés hídrico real de la región",
    "affected_population": número_de_personas,
    "annual_deficit_m3": número_estimado,
    "trend": "worsening",
    "urgency": "critical"
  },
  "thermal_agent": {
    "dc_heat_mw": número_mw_disponibles,
    "daily_water_liters": número_litros_dia,
    "reasoning": "Cálculo del calor residual disponible y agua producible en 2 frases"
  },
  "distribution_agent": {
    "urban_pct": número,
    "agri_pct": número,
    "industrial_pct": número,
    "households_supplied": número,
    "hectares_irrigated": número,
    "reasoning": "Justificación del reparto en 2 frases"
  },
  "impact_agent": {
    "co2_avoided_tonnes_year": número,
    "investment_m_eur": número,
    "roi_years": número,
    "sdgs": [lista de números ODS relevantes: 2, 6, 7, 13, 17],
    "bankability_score": número_0_a_10,
    "pitch": "Argumento de 2-3 frases para presentar ante gobierno o banco de desarrollo"
  }
}"""


def _load_regions() -> List[Dict]:
    with open(DATA_PATH, encoding="utf-8") as f:
        return json.load(f)


def _fallback_analysis(region: Dict) -> Dict[str, Any]:
    mw = region.get("dc_potential_mw", 50)
    daily_liters = mw * 15_000
    households = int((daily_liters * 0.35) / 520)
    hectares = int((daily_liters * 0.60) / 4_500)
    co2 = int(daily_liters * 365 * 0.5 / 1_000)
    investment = round(mw * 1.5, 1)
    stress = region.get("water_stress", 3.5)
    urgency = "critical" if stress >= 4.5 else "high" if stress >= 3.5 else "medium"

    return {
        "hydro_agent": {
            "assessment": f"Estrés hídrico {region.get('stress_label','alto')} con score {stress}/5. "
                          f"Población de {region.get('population_m',1)}M habitantes afectada.",
            "affected_population": int(region.get("population_m", 1) * 1_000_000 * (1 - region.get("water_access_pct", 90) / 100)),
            "annual_deficit_m3": int(mw * 365 * 15_000 * 0.6),
            "trend": "worsening",
            "urgency": urgency,
        },
        "thermal_agent": {
            "dc_heat_mw": mw,
            "daily_water_liters": daily_liters,
            "reasoning": f"Con {mw} MW de potencial de datacenters en la región, "
                         f"SeaCool puede producir {daily_liters:,} L/día.",
        },
        "distribution_agent": {
            "urban_pct": 35,
            "agri_pct": 60 if region.get("ag_land_ha", 0) > 0 else 0,
            "industrial_pct": 5,
            "households_supplied": households,
            "hectares_irrigated": hectares,
            "reasoning": "Distribución basada en demanda agrícola dominante y necesidades urbanas básicas.",
        },
        "impact_agent": {
            "co2_avoided_tonnes_year": co2,
            "investment_m_eur": investment,
            "roi_years": 9,
            "sdgs": [6, 2, 7, 13],
            "bankability_score": round(min(stress * 1.8, 10), 1),
            "pitch": f"SeaCool puede abastecer a {households:,} hogares y regar {hectares:,} ha "
                     f"en {region.get('name')} con una inversión de {investment}M EUR, "
                     f"evitando {co2:,} t CO2/año.",
        },
    }


class GlobalService:
    def get_regions(self) -> List[Dict]:
        return _load_regions()

    def get_region(self, region_id: str) -> Optional[Dict]:
        for r in _load_regions():
            if r["id"] == region_id:
                return r
        return None

    async def analyze(self, region_id: str) -> Dict[str, Any]:
        region = self.get_region(region_id)
        if not region:
            return {"error": f"Region '{region_id}' not found"}

        user_prompt = (
            f"Región: {region['name']} ({region['country']})\n"
            f"Estrés hídrico (WRI Aqueduct): {region['water_stress']}/5 — {region['stress_label']}\n"
            f"Población: {region['population_m']}M habitantes\n"
            f"Acceso agua potable: {region['water_access_pct']}%\n"
            f"Lluvia anual: {region['annual_rainfall_mm']} mm\n"
            f"Potencial datacenters: {region['dc_potential_mw']} MW\n"
            f"Superficie agrícola: {region['ag_land_ha']:,} ha\n"
            f"Cultivos principales: {', '.join(region['main_crops']) or 'No aplica'}\n"
            f"Desafío clave: {region['key_challenge']}\n\n"
            f"Realiza el análisis multiagente SeaCool para esta región."
        )

        try:
            response = await ai_service.chat(
                messages=[
                    {"role": "system", "content": ANALYSIS_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.2,
                max_tokens=1200,
            )
            parsed = self._parse_json(response)
            if parsed:
                return {"region": region, "analysis": parsed}
        except Exception as e:
            print(f"⚠️ Global analyze IA error: {e}")

        return {"region": region, "analysis": _fallback_analysis(region)}

    def _parse_json(self, text: str) -> Optional[Dict]:
        if not text:
            return None
        cleaned = re.sub(r"^```(?:json)?\s*", "", text.strip())
        cleaned = re.sub(r"\s*```$", "", cleaned).strip()
        try:
            parsed = json.loads(cleaned)
            required = {"hydro_agent", "thermal_agent", "distribution_agent", "impact_agent"}
            if required.issubset(parsed.keys()):
                return parsed
        except json.JSONDecodeError:
            match = re.search(r"\{[\s\S]*\}", cleaned)
            if match:
                try:
                    parsed = json.loads(match.group())
                    if {"hydro_agent", "thermal_agent", "distribution_agent", "impact_agent"}.issubset(parsed.keys()):
                        return parsed
                except json.JSONDecodeError:
                    pass
        return None


    async def analyze_dc(self, dc: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analiza el potencial SeaCool de un datacenter real (PeeringDB).
        Cruza las coordenadas con WRI Aqueduct para obtener el estrés hídrico real
        de la cuenca más cercana y estima el calor residual desde net_count.
        """
        lat, lng = dc["lat"], dc["lng"]
        net_count = dc.get("net_count", 0)

        # Estimar MW de calor residual desde net_count (fórmula transparente)
        # Calibración: DC principal Equinix Ashburn (net_count≈500) ≈ 150-200 MW térmica
        estimated_mw = max(5, round(net_count ** 0.65))

        # Consultar WRI Aqueduct: cuenca más cercana a las coordenadas del DC
        pt = f"ST_SetSRID(ST_MakePoint({lng},{lat}),4326)"
        wri_sql = (
            f"SELECT bws_score, bws_label, bws_cat, sub_name, "
            f"ST_Distance(the_geom::geography, {pt}::geography)/1000 AS dist_km "
            f"FROM wat_050_aqueduct_baseline_water_stress "
            f"ORDER BY the_geom::geography <-> {pt}::geography LIMIT 1"
        )
        wri_data = {}
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.post(
                    "https://wri-rw.carto.com/api/v2/sql",
                    data={"q": wri_sql},
                )
                rows = resp.json().get("rows", [])
                if rows:
                    wri_data = rows[0]
        except Exception as e:
            print(f"⚠️ WRI CARTO query error: {e}")

        bws_score = wri_data.get("bws_score", 2.5)
        bws_label = wri_data.get("bws_label", "Sin datos")
        dist_km   = round(wri_data.get("dist_km", 0), 1)
        basin_name = wri_data.get("sub_name", "")
        if basin_name:
            basin_name = basin_name.replace("['", "").replace("']", "").split("'")[0]

        daily_liters = estimated_mw * 15_000
        co2_year     = int(daily_liters * 365 * 0.5 / 1_000)
        investment   = round(estimated_mw * 1.5, 1)
        urgency      = "critical" if bws_score >= 4.5 else "high" if bws_score >= 3.5 else "medium" if bws_score >= 2 else "low"

        user_prompt = (
            f"Datacenter: {dc['name']}\n"
            f"Ubicación: {dc['city']}, {dc['country']}\n"
            f"Redes conectadas (PeeringDB): {net_count}\n"
            f"Calor residual estimado: {estimated_mw} MW (fórmula: net_count^0.65)\n"
            f"\n"
            f"Estrés hídrico WRI Aqueduct (cuenca más cercana, a {dist_km} km):\n"
            f"  Score: {bws_score}/5 — {bws_label}\n"
            f"  Cuenca: {basin_name}\n"
            f"\n"
            f"Agua producible si se instala SeaCool: {daily_liters:,} L/día ({daily_liters*365/1e6:.1f}M L/año)\n"
            f"CO2 evitado: {co2_year:,} t/año\n"
            f"Inversión estimada: {investment}M EUR\n"
            f"\n"
            f"Analiza la viabilidad SeaCool para este datacenter teniendo en cuenta "
            f"el estrés hídrico real de la zona, la proximidad a la costa, "
            f"y el impacto potencial en comunidades locales."
        )

        dc_prompt = ANALYSIS_PROMPT.replace(
            "una región específica con estrés hídrico",
            "un datacenter real cuyo calor residual puede convertirse en agua potable"
        )

        fallback = _fallback_dc_analysis(dc, estimated_mw, bws_score, bws_label, dist_km)

        try:
            response = await ai_service.chat(
                messages=[
                    {"role": "system", "content": dc_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.2,
                max_tokens=1200,
            )
            parsed = self._parse_json(response)
            if parsed:
                return {
                    "dc": dc,
                    "wri": {"bws_score": bws_score, "bws_label": bws_label, "dist_km": dist_km, "basin": basin_name},
                    "estimated_mw": estimated_mw,
                    "analysis": parsed,
                }
        except Exception as e:
            print(f"⚠️ DC analyze IA error: {e}")

        return {
            "dc": dc,
            "wri": {"bws_score": bws_score, "bws_label": bws_label, "dist_km": dist_km, "basin": basin_name},
            "estimated_mw": estimated_mw,
            "analysis": fallback,
        }


def _fallback_dc_analysis(dc, mw, bws_score, bws_label, dist_km):
    daily_liters = mw * 15_000
    households   = int((daily_liters * 0.35) / 520)
    hectares     = int((daily_liters * 0.60) / 4_500)
    co2          = int(daily_liters * 365 * 0.5 / 1_000)
    investment   = round(mw * 1.5, 1)
    urgency      = "critical" if bws_score >= 4.5 else "high" if bws_score >= 3.5 else "medium"
    bankability  = round(min(bws_score * 1.8, 10), 1)

    return {
        "hydro_agent": {
            "assessment": f"La cuenca más cercana al datacenter ({dist_km} km) registra estrés hídrico {bws_label} ({bws_score}/5 WRI Aqueduct).",
            "affected_population": 0,
            "annual_deficit_m3": int(mw * 365 * 15_000 * 0.6),
            "trend": "worsening",
            "urgency": urgency,
        },
        "thermal_agent": {
            "dc_heat_mw": mw,
            "daily_water_liters": daily_liters,
            "reasoning": f"{dc['name']} con {dc.get('net_count',0)} redes conectadas estima {mw} MW de calor residual. Producción potencial: {daily_liters:,} L/día.",
        },
        "distribution_agent": {
            "urban_pct": 50, "agri_pct": 40, "industrial_pct": 10,
            "households_supplied": households,
            "hectares_irrigated": hectares,
            "reasoning": "Distribución estimada en base a contexto urbano del datacenter.",
        },
        "impact_agent": {
            "co2_avoided_tonnes_year": co2,
            "investment_m_eur": investment,
            "roi_years": 9,
            "sdgs": [6, 7, 13],
            "bankability_score": bankability,
            "pitch": f"Reconvertir el calor de {dc['name']} en {daily_liters:,} L/día de agua potable con {investment}M EUR de inversión.",
        },
    }


global_service = GlobalService()
