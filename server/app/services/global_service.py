"""
SeaCool Global - Servicio de análisis multiagente por región.
Evalúa el potencial SeaCool en cualquier zona costera con estrés hídrico del mundo.
"""

import json
import re
from pathlib import Path
from typing import Any, Dict, List, Optional

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


global_service = GlobalService()
