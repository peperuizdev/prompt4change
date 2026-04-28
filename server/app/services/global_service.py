"""
AquaLoop AI — Cerebro Multiagente Final.
Optimizado para eliminar "ceros" visuales y maximizar el impacto en cualquier clima.
"""

import json
import re
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

import httpx

from app.services.ai_service import ai_service
from app.core.config import settings

DATA_PATH = Path(__file__).parent.parent / "data" / "regions.json"

# ══════════════════════════════════════════════════════════════════════════════
# PROMPTS FINALES — GENIALIDAD HIPER-LOCAL & LÍNEAS ROJAS CIENTÍFICAS
# ══════════════════════════════════════════════════════════════════════════════

_HYDRO_AGENT = """Eres el AGENTE HÍDRICO DE ÉLITE.
PRINCIPIOS:
1. Analiza el estrés hídrico y cruza la información con las noticias para entender el contexto humano, económico y social de la zona.
IMPORTANTE: RESPONDE ÚNICAMENTE CON EL SIGUIENTE JSON VÁLIDO. NINGÚN OTRO TEXTO:
{"assessment": "string", "affected_population": int, "annual_deficit_m3": int, "trend": "worsening|stable", "urgency": "critical|high|medium"}"""

_THERMAL_AGENT = """Eres el AGENTE TÉRMICO DISRUPTIVO. Un genio de la termodinámica y la innovación socioeconómica.
PRINCIPIOS DE DISEÑO:
1. ANÁLISIS HIPER-LOCAL Y GEOGRÁFICO: Antes de idear nada, deduce de qué vive la gente en esa zona y CÓMO ES SU GEOGRAFÍA. Tu propuesta tecnológica debe ser original, huir de los tópicos y estar diseñada a medida para su economía específica.
2. CREATIVIDAD SIN LÍMITES: Si es un Datacenter YA EXISTENTE, optimiza su calor inyectándolo en su industria local. Si es una REGIÓN CON ESTRÉS HÍDRICO, genera un superávit de agua o energía.
3. LÍNEAS ROJAS (Rigor Absoluto): 
- ¡No violes la geografía! Si la ciudad es de INTERIOR (ej. Denver, Madrid), ESTÁ PROHIBIDO desalinizar agua de mar. Propón tecnologías viables de interior: purificación extrema de aguas residuales, generadores atmosféricos (AWG) o tratamiento térmico de acuíferos salobres.
- ¡No violes la termodinámica! Si usas calor para tratar agua, usa tecnologías térmicas (MED/MSF/Destilación por Membrana), nunca Ósmosis Inversa.
- ¡No violes el clima! No propongas calefaccionar hogares en el trópico.
IMPORTANTE: RESPONDE ÚNICAMENTE CON EL SIGUIENTE JSON VÁLIDO. NINGÚN OTRO TEXTO:
{"dc_heat_mw": int, "daily_water_liters": int, "reasoning": "string"}"""

_DISTRIBUTION_AGENT = """Eres el ESTRATEGA LOGÍSTICO Y SOCIOECONÓMICO.
PRINCIPIOS:
1. Tu misión es maximizar el impacto social de la propuesta del Agente Térmico.
2. Asigna los recursos (agua/calor) de forma que potencie directamente la economía local y la supervivencia de esa comunidad concreta.
IMPORTANTE: RESPONDE ÚNICAMENTE CON EL SIGUIENTE JSON VÁLIDO. NINGÚN OTRO TEXTO:
{"urban_pct": int, "agri_pct": int, "industrial_pct": int, "households_supplied": int, "hectares_irrigated": int, "reasoning": "string"}"""

_IMPACT_AGENT = """Eres el PITCH MASTER. El mejor vendedor de ideas ESG.
PRINCIPIOS:
1. Crea un pitch deslumbrante y muy local. Habla de cómo el proyecto salva o potencia la industria y el modo de vida de la gente de esa zona específica.
2. RIGOR MATEMÁTICO: 1 Piscina Olímpica = 2.500.000 litros. Haz la división correctamente para la comparativa de agua. Si generas calor, usa comparativas de industria o estadios.
3. El bankability_score debe ser un número coherente entre 7.0 y 9.9.
IMPORTANTE: RESPONDE ÚNICAMENTE CON EL SIGUIENTE JSON VÁLIDO. NINGÚN OTRO TEXTO:
{"co2_avoided_tonnes_year": int, "investment_m_eur": float, "roi_years": int, "sdgs": [int], "bankability_score": float, "pitch": "string"}"""


class GlobalService:
    def get_regions(self) -> List[Dict]:
        with open(DATA_PATH, encoding="utf-8") as f:
            return json.load(f)

    def get_region(self, region_id: str) -> Optional[Dict]:
        for r in self.get_regions():
            if r["id"] == region_id: return r
        return None

    async def _search_news(self, location: str) -> str:
        api_key = getattr(settings, "TAVILY_API_KEY", "")
        if not api_key or "tu-clave" in api_key: return "Noticias no disponibles."
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post("https://api.tavily.com/search", json={"api_key": api_key, "query": f"noticias agua sequía energía en {location}", "max_results": 2})
                results = resp.json().get("results", [])
                return "\n".join([f"[{r['title']}] {r['content'][:200]}" for r in results])
        except: return "Sin conexión a noticias."

    async def analyze(self, region_id: str) -> Dict[str, Any]:
        region = self.get_region(region_id)
        if not region: return {"error": "Not found"}
        news = await self._search_news(region['name'])
        ctx = f"LUGAR: {region['name']}. WRI: {region['water_stress']}/5. NOTICIAS:\n{news}"
        return await self._run_agent_chain(ctx, region['dc_potential_mw'], region['name'])

    async def analyze_dc(self, dc: Dict[str, Any]) -> Dict[str, Any]:
        mw = max(5, round(dc.get("net_count", 0) ** 0.65))
        wri = await self._get_wri_data(dc["lat"], dc["lng"])
        news = await self._search_news(dc['city'])
        ctx = f"DATACENTER: {dc['name']} en {dc['city']}. {mw} MW. CUENCA: {wri['basin']} (Estrés: {wri['score']}/5). NOTICIAS:\n{news}"
        res = await self._run_agent_chain(ctx, mw, dc['name'])
        res.update({"dc": dc, "wri": wri, "estimated_mw": mw})
        return res

    async def _get_wri_data(self, lat, lng):
        pt = f"ST_SetSRID(ST_MakePoint({lng},{lat}),4326)"
        sql = f"SELECT bws_score, sub_name FROM wat_050_aqueduct_baseline_water_stress ORDER BY the_geom::geography <-> {pt}::geography LIMIT 1"
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post("https://wri-rw.carto.com/api/v2/sql", data={"q": sql})
                row = resp.json().get("rows", [{}])[0]
                score = row.get("bws_score", 2.5)
                return {"score": round(float(score), 1) if score else 2.5, "basin": row.get("sub_name", "Desconocida").split("'")[0].strip("[' ")}
        except: return {"score": 2.5, "basin": "Unknown"}

    async def _run_agent_chain(self, ctx: str, mw: float, loc: str) -> Dict[str, Any]:
        try:
            print(f"💧 [1/4] Agente Hídrico analizando {loc}...")
            start = time.time()
            h_res = await ai_service.chat([{"role": "system", "content": _HYDRO_AGENT}, {"role": "user", "content": ctx}], temperature=0.2)
            print(f"   -> Respuesta Hídrico ({time.time() - start:.2f}s): {h_res[:100]}...")
            h_data = self._parse(h_res) or self._fb(mw)["hydro_agent"]
            
            print(f"🔥 [2/4] Agente Térmico pensando...")
            start = time.time()
            t_res = await ai_service.chat([{"role": "system", "content": _THERMAL_AGENT}, {"role": "user", "content": f"{ctx}\nHIDRO: {h_res}"}], temperature=0.75)
            print(f"   -> Respuesta Térmico ({time.time() - start:.2f}s): {t_res[:100]}...")
            t_data = self._parse(t_res) or self._fb(mw)["thermal_agent"]
            
            print(f"📊 [3/4] Agente Distribución...")
            start = time.time()
            d_res = await ai_service.chat([{"role": "system", "content": _DISTRIBUTION_AGENT}, {"role": "user", "content": f"PROPUESTA: {t_res}"}], temperature=0.3)
            print(f"   -> Respuesta Distribución ({time.time() - start:.2f}s)")
            d_data = self._parse(d_res) or self._fb(mw)["distribution_agent"]
            
            print(f"🎯 [4/4] Agente Impacto (Pitch)...")
            start = time.time()
            i_res = await ai_service.chat([{"role": "system", "content": _IMPACT_AGENT}, {"role": "user", "content": f"DATOS:\n{h_res}\n{t_res}\n{d_res}"}], temperature=0.3)
            print(f"   -> Respuesta Impacto ({time.time() - start:.2f}s)")
            i_data = self._parse(i_res) or self._fb(mw)["impact_agent"]
            
            return {"analysis": {"hydro_agent": h_data, "thermal_agent": t_data, "distribution_agent": d_data, "impact_agent": i_data}}
        except Exception as e:
            print(f"⚠️ Error IA Crítico: {e}")
            return {"analysis": self._fb(mw)}

    def _parse(self, t):
        if not t: return None
        c = re.sub(r"^```(?:json)?\s*", "", t.strip())
        c = re.sub(r"\s*```$", "", c).strip()
        try: return json.loads(c)
        except:
            m = re.search(r"\{[\s\S]*\}", c)
            if m:
                try: return json.loads(m.group())
                except: pass
        return None

    def _fb(self, mw):
        l = mw * 15000
        return {
            "hydro_agent": {"assessment": "Situación hídrica regional bajo monitorización.", "urgency": "medium", "affected_population": 100000, "annual_deficit_m3": 5, "trend": "stable"},
            "thermal_agent": {"dc_heat_mw": mw, "daily_water_liters": l, "reasoning": "Recuperación de calor SeaCool para uso comunitario."},
            "distribution_agent": {"urban_pct": 70, "agri_pct": 20, "industrial_pct": 10, "households_supplied": int(l/800) or 500, "hectares_irrigated": int(l/4500) or 10, "reasoning": "Reparto equilibrado según demanda."},
            "impact_agent": {"co2_avoided_tonnes_year": int(mw*2000), "investment_m_eur": mw*1.5, "roi_years": 7, "sdgs": [6, 7, 11, 13], "bankability_score": 0.85, "pitch": "SeaCool: La solución de economía circular para el siglo XXI."}
        }

global_service = GlobalService()
