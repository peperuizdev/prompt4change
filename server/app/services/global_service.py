"""
AquaLoop AI — Servicio de análisis multiagente por región y Datacenters reales.

Cadena de 4 agentes REALES que deliberan entre sí:
  1. HydroAgent     → Analiza el estrés hídrico y las necesidades reales de la zona
  2. ThermalAgent   → Diseña soluciones creativas con el calor residual disponible
  3. DistributionAgent → Decide cómo repartir los recursos según el contexto
  4. ImpactAgent    → Evalúa el impacto ESG, puntúa y redacta el pitch final

Cada agente recibe el output del anterior, generando un diálogo creativo real.
Integrado con datos de PeeringDB (Datacenters) y WRI Aqueduct (Cuencas hídricas).
"""

import json
import re
from pathlib import Path
from typing import Any, Dict, List, Optional

import httpx

from app.services.ai_service import ai_service

DATA_PATH = Path(__file__).parent.parent / "data" / "regions.json"


# ══════════════════════════════════════════════════════════════════════════════
# SYSTEM PROMPTS — Personalidad y rol de cada agente
# ══════════════════════════════════════════════════════════════════════════════

_HYDRO_AGENT = """Eres el AGENTE HÍDRICO de AquaLoop AI. Especialista en crisis de agua.
Tu trabajo: analizar los datos de estrés hídrico de una ubicación (región o cuenca específica)
y describir la situación REAL con rigor científico.

REGLAS:
- Evalúa severidad, tendencia y urgencia.
- Menciona cuencas, acuíferos o problemas locales específicos si se proporcionan.
- Máximo 3 frases. Responde en español.
- Responde SOLO en JSON exacto:
{"assessment": "string", "affected_population": int, "annual_deficit_m3": int, "trend": "worsening|stable|improving", "urgency": "critical|high|medium"}"""

_THERMAL_AGENT = """Eres el AGENTE TÉRMICO CREATIVO de AquaLoop AI. Ingeniero de economía circular.
Tu trabajo: dado el contexto hídrico + los MW de calor residual de un Datacenter,
proponer CÓMO USAR ese calor de forma INNOVADORA y RADICAL.

REGLAS:
- No te limites a "desalar agua". Piensa en: acuaponía, cultivo de microalgas,
  secado de biomasa, district heating, invernaderos, producción de hidrógeno verde, etc.
- Adapta la propuesta al contexto local (si es urbano, agrícola o industrial).
- Calcula litros de agua producibles (1 MW = 15.000 L/día).
- Máximo 3 frases creativas. Responde en español.
- Responde SOLO en JSON exacto:
{"dc_heat_mw": int, "daily_water_liters": int, "reasoning": "string con propuesta creativa adaptada al contexto"}"""

_DISTRIBUTION_AGENT = """Eres el AGENTE DISTRIBUIDOR de AquaLoop AI. Logístico de recursos.
Tu trabajo: decidir CÓMO REPARTIR el agua y los recursos generados entre
uso urbano, agrícola e industrial según la ubicación del Datacenter.

REGLAS:
- Los porcentajes deben sumar 100.
- Si el DC está en una ciudad densa, prioriza urbano/calefacción.
- Si está en zona rural/costera, prioriza agrícola/acuaponía.
- Calcula hogares abastecidos (800 L/hogar/día) y hectáreas regadas (4.500 L/ha/día).
- Máximo 2 frases de justificación. Responde en español.
- Responde SOLO en JSON exacto:
{"urban_pct": int, "agri_pct": int, "industrial_pct": int, "households_supplied": int, "hectares_irrigated": int, "reasoning": "string"}"""

_IMPACT_AGENT = """Eres el AGENTE DE IMPACTO de AquaLoop AI. Auditor ESG de Naciones Unidas.
Tu trabajo: tomar todo el debate de los agentes anteriores y evaluar el IMPACTO REAL.

REGLAS:
- Calcula CO2 evitado (0.5 kg/m3), inversión (~1.5M€/MW) y payback (7-15 años).
- Bankability score: 0-10.
- ODS: [2, 6, 7, 11, 13, 17].
- Redacta un PITCH de 2-3 frases convincente para presentar ante un gobierno o inversor.
- Responde SOLO en JSON exacto:
{"co2_avoided_tonnes_year": int, "investment_m_eur": float, "roi_years": int, "sdgs": [int], "bankability_score": float, "pitch": "string"}"""


def _load_regions() -> List[Dict]:
    with open(DATA_PATH, encoding="utf-8") as f:
        return json.load(f)


def _parse_agent_json(text: str) -> Optional[Dict]:
    if not text: return None
    cleaned = re.sub(r"^```(?:json)?\s*", "", text.strip())
    cleaned = re.sub(r"\s*```$", "", cleaned).strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"\{[\s\S]*\}", cleaned)
        if match:
            try: return json.loads(match.group())
            except: pass
    return None


class GlobalService:
    def get_regions(self) -> List[Dict]:
        return _load_regions()

    def get_region(self, region_id: str) -> Optional[Dict]:
        for r in _load_regions():
            if r["id"] == region_id:
                return r
        return None

    async def analyze(self, region_id: str) -> Dict[str, Any]:
        """Análisis multiagente para regiones predefinidas."""
        region = self.get_region(region_id)
        if not region: return {"error": f"Region '{region_id}' not found"}

        context = (
            f"Región: {region['name']} ({region['country']})\n"
            f"Estrés hídrico: {region['water_stress']}/5\n"
            f"Población: {region['population_m']}M\n"
            f"Desafío: {region['key_challenge']}\n"
            f"Potencial DC: {region['dc_potential_mw']} MW"
        )
        return await self._run_agent_chain(context, region['dc_potential_mw'], region['name'])

    async def analyze_dc(self, dc: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analiza el potencial SeaCool de un datacenter real (PeeringDB).
        Integra nuestra lógica agentica con los datos de cuenca real de WRI.
        """
        lat, lng = dc["lat"], dc["lng"]
        net_count = dc.get("net_count", 0)
        estimated_mw = max(5, round(net_count ** 0.65))

        # Consultar WRI Aqueduct (Data real)
        pt = f"ST_SetSRID(ST_MakePoint({lng},{lat}),4326)"
        wri_sql = (
            f"SELECT bws_score, bws_label, sub_name, "
            f"ST_Distance(the_geom::geography, {pt}::geography)/1000 AS dist_km "
            f"FROM wat_050_aqueduct_baseline_water_stress "
            f"ORDER BY the_geom::geography <-> {pt}::geography LIMIT 1"
        )
        wri_data = {}
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.post("https://wri-rw.carto.com/api/v2/sql", data={"q": wri_sql})
                rows = resp.json().get("rows", [])
                if rows: wri_data = rows[0]
        except Exception as e:
            print(f"⚠️ WRI query error: {e}")

        bws_score = wri_data.get("bws_score", 2.5)
        bws_label = wri_data.get("bws_label", "Sin datos")
        basin_name = wri_data.get("sub_name", "Desconocida").replace("['", "").replace("']", "").split("'")[0]

        context = (
            f"Datacenter: {dc['name']} ({dc['city']}, {dc['country']})\n"
            f"Hardware: {net_count} redes conectadas -> {estimated_mw} MW térmicos estimados.\n"
            f"Ubicación hídrica: Cuenca de {basin_name} (a {round(wri_data.get('dist_km',0),1)} km).\n"
            f"Estrés hídrico real (WRI Aqueduct): {bws_score}/5 ({bws_label})."
        )

        result = await self._run_agent_chain(context, estimated_mw, dc['name'])
        result.update({
            "dc": dc,
            "wri": {"bws_score": bws_score, "bws_label": bws_label, "basin": basin_name},
            "estimated_mw": estimated_mw
        })
        return result

    async def _run_agent_chain(self, context: str, mw: float, location_name: str) -> Dict[str, Any]:
        """Ejecuta la deliberación secuencial entre los 4 agentes."""
        try:
            # 1. Hydro
            print(f"💧 [Agente 1/4] Analizando hidratación en {location_name}...")
            hydro_res = await ai_service.chat(
                messages=[{"role": "system", "content": _HYDRO_AGENT}, {"role": "user", "content": context}],
                temperature=0.3
            )
            hydro_data = _parse_agent_json(hydro_res)

            # 2. Thermal Creative
            print(f"🔥 [Agente 2/4] Diseñando solución creativa para {mw} MW...")
            thermal_res = await ai_service.chat(
                messages=[
                    {"role": "system", "content": _THERMAL_AGENT},
                    {"role": "user", "content": f"{context}\n\nANÁLISIS HÍDRICO:\n{hydro_res}"}
                ],
                temperature=0.85
            )
            thermal_data = _parse_agent_json(thermal_res)

            # 3. Distribution
            print(f"📊 [Agente 3/4] Repartiendo recursos...")
            dist_res = await ai_service.chat(
                messages=[
                    {"role": "system", "content": _DISTRIBUTION_AGENT},
                    {"role": "user", "content": f"{context}\n\nHÍDRICO:\n{hydro_res}\n\nTÉRMICO:\n{thermal_res}"}
                ],
                temperature=0.3
            )
            distribution_data = _parse_agent_json(dist_res)

            # 4. Impact
            print(f"🎯 [Agente 4/4] Evaluando impacto final...")
            impact_res = await ai_service.chat(
                messages=[
                    {"role": "system", "content": _IMPACT_AGENT},
                    {"role": "user", "content": f"DEBATE:\n{hydro_res}\n{thermal_res}\n{dist_res}"}
                ],
                temperature=0.3
            )
            impact_data = _parse_agent_json(impact_res)

            # Fallback simple si falla algún agente
            fallback = self._get_simple_fallback(mw, 3.0)
            return {
                "analysis": {
                    "hydro_agent": hydro_data or fallback["hydro_agent"],
                    "thermal_agent": thermal_data or fallback["thermal_agent"],
                    "distribution_agent": distribution_data or fallback["distribution_agent"],
                    "impact_agent": impact_data or fallback["impact_agent"]
                }
            }
        except Exception as e:
            print(f"⚠️ Agent chain error: {e}")
            return {"analysis": self._get_simple_fallback(mw, 3.0)}

    def _get_simple_fallback(self, mw, stress):
        liters = mw * 15000
        return {
            "hydro_agent": {"assessment": "Fallback por error de IA", "urgency": "high", "affected_population": 0, "annual_deficit_m3": 0, "trend": "stable"},
            "thermal_agent": {"dc_heat_mw": mw, "daily_water_liters": liters, "reasoning": "Fallback técnico."},
            "distribution_agent": {"urban_pct": 50, "agri_pct": 50, "industrial_pct": 0, "households_supplied": int(liters/800), "hectares_irrigated": int(liters/4500), "reasoning": "Reparto 50/50."},
            "impact_agent": {"co2_avoided_tonnes_year": int(liters*365*0.5/1000), "investment_m_eur": mw*1.5, "roi_years": 10, "sdgs": [6, 13], "bankability_score": 5.0, "pitch": "Fallback pitch."}
        }


global_service = GlobalService()
