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

import asyncio
import json
import re
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

import httpx

from app.services.ai_service import ai_service

DATA_PATH = Path(__file__).parent.parent / "data" / "regions.json"

# Cache WRI por DC — los datos son estáticos, 24 h es suficiente
_wri_dc_cache: dict = {}
_WRI_DC_TTL = 86400


# ── Clasificador geográfico ───────────────────────────────────────────────────

_ISO2_ZONE = {
    "ly": "arid",  "eg": "arid",  "sa": "arid",  "ae": "arid",  "qa": "arid",
    "kw": "arid",  "bh": "arid",  "om": "arid",  "iq": "arid",  "ir": "arid",
    "jo": "arid",  "dz": "arid",  "mr": "arid",  "ml": "arid",  "ne": "arid",
    "sd": "arid",  "ye": "arid",  "sy": "arid",
    "es": "med",   "it": "med",   "gr": "med",   "pt": "med",   "fr": "med",
    "ma": "med",   "tn": "med",   "tr": "med",   "il": "med",   "lb": "med",
    "hr": "med",   "al": "med",   "mt": "med",   "cy": "med",   "me": "med",
    "ba": "med",   "si": "med",   "mk": "med",
    "de": "cold",  "nl": "cold",  "dk": "cold",  "se": "cold",  "no": "cold",
    "fi": "cold",  "gb": "cold",  "ie": "cold",  "be": "cold",  "at": "cold",
    "ch": "cold",  "pl": "cold",  "cz": "cold",  "sk": "cold",  "lv": "cold",
    "lt": "cold",  "ee": "cold",  "is": "cold",  "hu": "cold",  "ro": "cold",
    "bg": "cold",  "rs": "cold",  "ua": "cold",  "ru": "cold",  "by": "cold",
    "in": "tropical", "pk": "tropical", "bd": "tropical", "lk": "tropical",
    "np": "tropical", "mm": "tropical", "id": "tropical", "vn": "tropical",
    "ph": "tropical", "th": "tropical", "ng": "tropical", "gh": "tropical",
    "ci": "tropical", "cm": "tropical", "my": "tropical", "sg": "tropical",
    "br": "tropical", "co": "tropical", "pe": "tropical", "ec": "tropical",
    "us": "mixed",    "ca": "mixed",    "au": "mixed",    "cn": "mixed",
    "jp": "mixed",    "kr": "mixed",    "mx": "mixed",    "za": "mixed",
    "ar": "mixed",    "cl": "mixed",
}


# Países sin salida al mar — la desalinización MED no tiene sentido
_LANDLOCKED_ISO2 = {
    'at', 'ch', 'cz', 'sk', 'hu', 'rs', 'mk', 'ba', 'kz', 'uz', 'tm', 'tj', 'kg',
    'af', 'np', 'bt', 'bo', 'py', 'rw', 'ug', 'zm', 'zw', 'mw', 'ls', 'sz',
    'ne', 'ml', 'bf', 'et', 'am', 'az', 'by', 'md', 'lu', 'li', 'si',
}

# Ciudades que son interiores aunque el país tenga costa
_INLAND_CITIES = {
    'frankfurt', 'madrid', 'warsaw', 'warszawa', 'zurich', 'zürich', 'vienna', 'wien',
    'prague', 'praha', 'budapest', 'kyiv', 'kiev', 'minsk', 'moscow', 'moskva',
    'münchen', 'munich', 'bratislava', 'bern', 'luxembourg', 'milan', 'milano',
    'toronto', 'chicago', 'dallas', 'denver', 'phoenix', 'atlanta', 'montreal',
    'calgary', 'edmonton', 'bangalore', 'bengaluru', 'hyderabad', 'delhi', 'new delhi',
    'riyadh', 'jeddah', 'amman', 'tehran', 'ankara', 'nairobi', 'johannesburg',
    'paris', 'berlin', 'brussels', 'bruxelles', 'amsterdam',
}


def _is_coastal(country: str, city: str) -> bool:
    """True si el DC probablemente tiene acceso a agua costera para MED."""
    c = country.lower().strip()
    city_l = city.lower().strip()
    if c in _LANDLOCKED_ISO2:
        return False
    if city_l in _INLAND_CITIES:
        return False
    return True


def _get_zone(country: str) -> str:
    """Returns zone: arid|med|cold|tropical|mixed|unknown from ISO-2 code or full name."""
    c = country.lower().strip()
    zone = _ISO2_ZONE.get(c)
    if zone is None:
        if any(k in c for k in [
            "libya", "libia", "egypt", "egipto", "saudi", "arabia", "uae",
            "emiratos", "qatar", "kuwait", "bahrain", "oman", "iraq", "iran",
            "jordan", "algeria", "argelia", "mauritania", "sudan",
        ]):
            zone = "arid"
        elif any(k in c for k in [
            "spain", "españa", "italy", "italia", "greece", "grecia",
            "portugal", "france", "francia", "morocco", "marruecos",
            "tunisia", "turkey", "turquía", "israel", "croatia", "malta", "cyprus",
        ]):
            zone = "med"
        elif any(k in c for k in [
            "germany", "alemania", "netherlands", "denmark", "sweden", "norway",
            "finland", "united kingdom", "ireland", "belgium", "austria",
            "switzerland", "poland", "czech",
        ]):
            zone = "cold"
        elif any(k in c for k in [
            "india", "pakistan", "bangladesh", "indonesia", "vietnam",
            "philippines", "thailand", "myanmar",
        ]):
            zone = "tropical"
    return zone or "unknown"


def _geo_profile(country: str, city: str = "", water_stress: float = 2.5) -> str:
    """Genera texto de viabilidad tecnológica basado en zona geográfica."""
    zone = _get_zone(country)

    if zone == "arid":
        return (
            "ZONA CLIMÁTICA: Árida/desértica — temperaturas medias >30°C, lluvia <200 mm/año.\n"
            "ECONOMÍA LOCAL: hidrocarburos o subsistencia; poca infraestructura industrial avanzada.\n"
            "TECNOLOGÍAS VIABLES: desalinización térmica (prioridad crítica), "
            "riego por goteo, potabilización urbana.\n"
            "TECNOLOGÍAS NO VIABLES AQUÍ: district heating (hace calor todo el año), "
            "microalgas a escala industrial (sin mercado ni logística), "
            "hidrógeno verde (sin electrolizadores ni red).\n"
            "REGLA: el agua es el recurso escaso dominante. Maximiza litros producidos."
        )

    if zone == "med":
        return (
            "ZONA CLIMÁTICA: Mediterránea — veranos secos y calurosos, inviernos suaves.\n"
            "ECONOMÍA LOCAL: agricultura intensiva (invernaderos, olivar, cítricos), "
            "turismo, agroindustria costera.\n"
            "TECNOLOGÍAS VIABLES: desalinización + riego agrícola, "
            "invernaderos climatizados con calor residual, "
            "acuaponía en zonas portuarias con tradición pesquera, "
            "district heating moderado en invierno.\n"
            "TECNOLOGÍAS NO VIABLES AQUÍ: hidrógeno verde a gran escala (sin red), "
            "microalgas salvo en clusters de I+D.\n"
            "REGLA: equilibra agua para agricultura en verano y calor en invierno."
        )

    if zone == "cold":
        return (
            "ZONA CLIMÁTICA: Templada/oceánica — inviernos fríos, calefacción residencial costosa.\n"
            "ECONOMÍA LOCAL: industria avanzada, ganadería, invernaderos de flores/horticultura.\n"
            "TECNOLOGÍAS VIABLES: district heating (alta prioridad, sustituye gas natural), "
            "invernaderos de alto rendimiento, acuaponía integrada en industria alimentaria.\n"
            "TECNOLOGÍAS NO VIABLES AQUÍ: desalinización (agua dulce abundante), "
            "refrigeración de cultivos (el frío ya existe).\n"
            "REGLA: el calor vale más que el agua. Maximiza kWh de calefacción aprovechados."
        )

    if zone == "tropical":
        return (
            "ZONA CLIMÁTICA: Tropical/monzónica — calor y humedad altos, agua estacional.\n"
            "ECONOMÍA LOCAL: agricultura masiva, manufactura, acuicultura costera.\n"
            "TECNOLOGÍAS VIABLES: potabilización para comunidades rurales (prioridad crítica), "
            "secado de biomasa/alimentos con calor residual, acuaponía en deltas.\n"
            "TECNOLOGÍAS NO VIABLES AQUÍ: district heating (temperatura ya alta), "
            "microalgas sin red de distribución.\n"
            "REGLA: el acceso a agua potable segura es el mayor impacto social."
        )

    return (
        f"ZONA CLIMÁTICA: No identificada — estrés hídrico {water_stress:.1f}/5.\n"
        "TECNOLOGÍAS VIABLES: balance desalinización/riego según estacionalidad. "
        "Prioriza según el estrés hídrico local.\n"
        "REGLA: no proponer tecnologías avanzadas sin evidencia de infraestructura local."
    )


def _viability_check(water_stress: float, dist_km: float, zone: str, country: str = '', city: str = '') -> dict:
    """
    Evalúa viabilidad SeaCool.  Reglas de prioridad:
    1. Zona fría → calefacción distrital, no desalinización.
    2. Zona interior (sin acceso costero) → no MED, solo calor.
    3. Bajo estrés hídrico → valor marginal.
    4. Costa + estrés alto → Full SeaCool.
    """
    coastal = _is_coastal(country, city)

    if zone == "cold":
        if water_stress < 2.0:
            return {
                "verdict": "heating_only",
                "label": "District Heating",
                "icon": "local_fire_department",
                "color": "blue",
                "coastal": coastal,
                "description": (
                    "Zona fría con agua abundante. No aplica desalinización. "
                    "El calor residual sustituye gas natural en calefacción distrital."
                ),
            }
        return {
            "verdict": "heating_priority",
            "label": "Calor + Agua Secundaria",
            "icon": "local_fire_department",
            "color": "blue",
            "coastal": coastal,
            "description": (
                f"Zona fría, estrés moderado ({water_stress:.1f}/5). "
                "Prioridad: calefacción distrital. Agua solo como uso industrial secundario."
            ),
        }

    if not coastal:
        return {
            "verdict": "inland_heat_only",
            "label": "Zona Interior · Solo Calor",
            "icon": "landscape",
            "color": "gray",
            "coastal": False,
            "description": (
                "Sin acceso costero. La desalinización MED requiere agua marina. "
                "SeaCool aprovecha el calor para calefacción distrital o procesos industriales."
            ),
        }

    if water_stress < 1.5:
        return {
            "verdict": "low_value",
            "label": "Valor Limitado",
            "icon": "info",
            "color": "gray",
            "coastal": coastal,
            "description": (
                f"Estrés hídrico bajo ({water_stress:.1f}/5). "
                "Desalinización no prioritaria; el calor puede usarse en industria o invernaderos."
            ),
        }

    if water_stress >= 3.5 and zone in ("arid", "med"):
        return {
            "verdict": "full_seacool",
            "label": "Full SeaCool",
            "icon": "verified",
            "color": "green",
            "coastal": coastal,
            "description": (
                f"Alta escasez hídrica ({water_stress:.1f}/5), zona costera {zone}. "
                "Loop circular completo: MED → agua comunidad → refrigeración DC."
            ),
        }

    if water_stress >= 2.5:
        return {
            "verdict": "seacool_viable",
            "label": "SeaCool Viable",
            "icon": "check_circle",
            "color": "green",
            "coastal": coastal,
            "description": (
                f"Estrés hídrico significativo ({water_stress:.1f}/5), acceso costero. "
                "Loop circular viable con excedente de agua para la comunidad."
            ),
        }

    return {
        "verdict": "partial_fit",
        "label": "Potencial Parcial",
        "icon": "water_drop",
        "color": "orange",
        "coastal": coastal,
        "description": (
            f"Estrés hídrico moderado ({water_stress:.1f}/5). "
            "Viable con foco en distribución agrícola o industrial estacional."
        ),
    }


def _wri_confidence(dist_km: float) -> dict:
    """Umbral relativo: la fiabilidad depende de la distancia a la cuenca más cercana."""
    if dist_km < 50:
        return {"level": "high", "label": "datos locales", "agent_note": None}
    if dist_km < 200:
        return {
            "level": "medium",
            "label": "datos regionales",
            "agent_note": (
                f"AVISO: La cuenca WRI más cercana está a {dist_km:.0f} km. "
                "Los datos de estrés hídrico son orientativos a escala regional. "
                "Modera la urgencia si el contexto local no lo justifica."
            ),
        }
    return {
        "level": "low",
        "label": "datos distantes",
        "agent_note": (
            f"AVISO CRÍTICO: La cuenca WRI más cercana está a {dist_km:.0f} km. "
            "Los datos pueden no representar la situación real del datacenter. "
            "Puede estar en zona húmeda, fría o sin escasez hídrica local. "
            "No asumas estrés severo sin evidencia adicional."
        ),
    }


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

_THERMAL_AGENT = """Eres el AGENTE TÉRMICO de AquaLoop AI. Ingeniero de economía circular.
Tu trabajo: proponer el uso MÁS ADECUADO del calor residual del Datacenter
para esa ubicación geográfica y económica concreta.

FÍSICA REAL — usa estos valores exactos:
- Calor recuperable (MW_th) = potencia_MW × 0.4  (PUE 1.4)
- 1 MW térmico → 300.000 L/día de agua dulce (MED a 65-75°C, GOR≈8)
- El agua primero cierra el bucle: kWh_IT × 1.5 L/kWh queda en el DC
- El excedente es lo que va a la comunidad

REGLAS DE VIABILIDAD (OBLIGATORIO — leer el perfil geográfico del contexto):
- Propón SOLO tecnologías viables en la zona climática y económica indicada.
- En zonas áridas: la desalinización es la prioridad, no hay calefacción que valga.
- En zonas frías: el calor para hogares vale más que el agua.
- Tecnologías avanzadas (microalgas, hidrógeno, acuaponía industrial) solo si
  el perfil geográfico las marca como viables.
- NO propongas lo que no puede construirse o venderse localmente.

Máximo 3 frases. Responde en español.
Responde SOLO en JSON exacto:
{"dc_heat_mw": float, "daily_water_liters": int, "reasoning": "propuesta técnica adaptada a la zona"}"""

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

        zone = _get_zone(region['country'])
        geo  = _geo_profile(region['country'], water_stress=region['water_stress'])
        viability = _viability_check(
            region['water_stress'], 0, zone,
            country=region['country'], city=region.get('name', ''),
        )
        context = (
            f"Región: {region['name']} ({region['country']})\n"
            f"Estrés hídrico: {region['water_stress']}/5\n"
            f"Población: {region['population_m']}M\n"
            f"Desafío: {region['key_challenge']}\n"
            f"Potencial DC: {region['dc_potential_mw']} MW\n\n"
            f"PERFIL GEOGRÁFICO Y VIABILIDAD TECNOLÓGICA:\n{geo}"
        )
        result = await self._run_agent_chain(context, region['dc_potential_mw'], region['name'], viability=viability)
        result['viability'] = viability
        return result

    async def analyze_dc(self, dc: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analiza el potencial SeaCool de un datacenter real (PeeringDB).
        Cache WRI por DC id (24h) + umbral relativo de fiabilidad por distancia.
        """
        lat, lng = dc["lat"], dc["lng"]
        net_count = dc.get("net_count", 0)
        estimated_mw = max(5, round(net_count ** 0.65))
        dc_id = dc["id"]

        cached = _wri_dc_cache.get(dc_id)
        if cached and time.time() - cached["ts"] < _WRI_DC_TTL:
            wri = cached["wri"]
            confidence_note = _wri_confidence(wri["dist_km"])["agent_note"]
        else:
            pt = f"ST_SetSRID(ST_MakePoint({lng},{lat}),4326)"
            wri_sql = (
                f"SELECT bws_score, bws_label, sub_name, "
                f"ST_Distance(the_geom::geography, {pt}::geography)/1000 AS dist_km "
                f"FROM wat_050_aqueduct_baseline_water_stress "
                f"ORDER BY the_geom::geography <-> {pt}::geography LIMIT 1"
            )
            raw = {}
            try:
                async with httpx.AsyncClient(timeout=15) as client:
                    resp = await client.post("https://wri-rw.carto.com/api/v2/sql", data={"q": wri_sql})
                    rows = resp.json().get("rows", [])
                    if rows:
                        raw = rows[0]
            except Exception as e:
                print(f"⚠️ WRI query error: {e}")

            dist_km    = round(raw.get("dist_km", 999), 1)
            bws_score  = raw.get("bws_score", 2.5)
            bws_label  = raw.get("bws_label", "Sin datos")
            basin_name = raw.get("sub_name", "Desconocida").replace("['", "").replace("']", "").split("'")[0]
            conf       = _wri_confidence(dist_km)
            confidence_note = conf["agent_note"]

            wri = {
                "bws_score":        bws_score,
                "bws_label":        bws_label,
                "basin":            basin_name,
                "dist_km":          dist_km,
                "confidence":       conf["level"],
                "confidence_label": conf["label"],
            }
            _wri_dc_cache[dc_id] = {"wri": wri, "ts": time.time()}
            print(f"📡 WRI [{conf['label']}] {dc['name']}: {bws_score}/5 a {dist_km} km")

        zone = _get_zone(dc['country'])
        geo = _geo_profile(dc['country'], dc['city'], wri['bws_score'])
        viability = _viability_check(wri['bws_score'], wri['dist_km'], zone, country=dc['country'], city=dc['city'])

        context = (
            f"Datacenter: {dc['name']} ({dc['city']}, {dc['country']})\n"
            f"Redes conectadas (PeeringDB): {net_count} → {estimated_mw} MW térmicos estimados\n"
            f"Cuenca hídrica más cercana (WRI Aqueduct 4.0): {wri['basin']} a {wri['dist_km']} km\n"
            f"Estrés hídrico: {wri['bws_score']}/5 — {wri['bws_label']} "
            f"[fiabilidad: {wri['confidence_label']}]\n"
            f"VIABILIDAD SEACOOL: {viability['label']} — {viability['description']}\n\n"
            f"PERFIL GEOGRÁFICO Y VIABILIDAD TECNOLÓGICA:\n{geo}"
        )
        if confidence_note:
            context += f"\n\n{confidence_note}"

        result = await self._run_agent_chain(context, estimated_mw, dc["name"], viability=viability)
        result.update({"dc": dc, "wri": wri, "estimated_mw": estimated_mw, "viability": viability})
        return result

    async def _run_agent_chain(self, context: str, mw: float, location_name: str, viability: dict = None) -> Dict[str, Any]:
        """
        Agentes 1+2 en paralelo. Agentes 3+4 secuenciales (necesitan outputs anteriores).
        Se inyecta un override de modo según la viabilidad del sitio.
        """
        override = ""
        if viability:
            v       = viability.get("verdict", "")
            coastal = viability.get("coastal", True)

            if v in ("heating_only", "heating_priority"):
                override += (
                    "\n\n🚨 INSTRUCCIÓN DE MODO — CALEFACCIÓN DISTRITAL (OBLIGATORIO):\n"
                    "Zona fría, agua abundante. TODOS los agentes centran el análisis en calefacción distrital:\n"
                    "  • Hogares calentados (sustituye gas natural)\n"
                    "  • kWh aprovechados y CO₂ evitado\n"
                    "  • Invernaderos o industria alimentaria como uso secundario\n"
                    "PROHIBIDO recomendar desalinización o distribución de agua potable.\n"
                    "Campo 'daily_water_liters': reporta 0 o consumo interno mínimo del circuito."
                )
            elif v in ("inland_heat_only", "low_value"):
                override += (
                    "\n\n⚠️ INSTRUCCIÓN DE MODO — CALOR INDUSTRIAL / SIN DESALINIZACIÓN:\n"
                    "No se justifica desalinización masiva (agua abundante o zona interior).\n"
                    "Propón recuperación de calor para industria, invernaderos o calefacción moderada.\n"
                    "El agua es un beneficio secundario, no la propuesta principal."
                )

            if not coastal:
                override += (
                    "\n\n🌊 AVISO CRÍTICO — ZONA INTERIOR SIN ACCESO COSTERO:\n"
                    "La desalinización MED requiere agua marina o salobre. "
                    "Este datacenter está en el INTERIOR del país.\n"
                    "PROHIBIDO proponer plantas MED o producción de agua desalinizada.\n"
                    "Usa el calor para: calefacción distrital, invernaderos, procesos industriales.\n"
                    "Campo 'daily_water_liters': 0."
                )

        ctx = context + override
        try:
            print(f"💧🔥 [Agentes 1+2] {location_name}: análisis hídrico y térmico en paralelo...")
            hydro_res, thermal_res = await asyncio.gather(
                ai_service.chat(
                    messages=[{"role": "system", "content": _HYDRO_AGENT}, {"role": "user", "content": ctx}],
                    temperature=0.3,
                ),
                ai_service.chat(
                    messages=[{"role": "system", "content": _THERMAL_AGENT}, {"role": "user", "content": ctx}],
                    temperature=0.45,
                ),
            )
            hydro_data   = _parse_agent_json(hydro_res)
            thermal_data = _parse_agent_json(thermal_res)

            print(f"📊 [Agente 3/4] {location_name}: distribución de recursos...")
            dist_res = await ai_service.chat(
                messages=[
                    {"role": "system", "content": _DISTRIBUTION_AGENT},
                    {"role": "user", "content": f"{ctx}\n\nHÍDRICO:\n{hydro_res}\n\nTÉRMICO:\n{thermal_res}"}
                ],
                temperature=0.3
            )
            distribution_data = _parse_agent_json(dist_res)

            print(f"🎯 [Agente 4/4] {location_name}: evaluación de impacto final...")
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
        from app.services.seacool_service import calcular_loop_circular, DATACENTER_MAX_MW
        # Calcula la fracción efectiva sobre los 50 MW base
        carga_efectiva = min(100.0, mw / DATACENTER_MAX_MW * 100)
        loop = calcular_loop_circular(carga_efectiva)
        excedente = loop["agua_generada_litros"]
        return {
            "hydro_agent": {
                "assessment": "Fallback por error de IA",
                "urgency": "high",
                "affected_population": 0,
                "annual_deficit_m3": 0,
                "trend": "stable",
            },
            "thermal_agent": {
                "dc_heat_mw": loop["calor_residual_mw"],
                "daily_water_liters": excedente,
                "reasoning": "Fallback técnico — desalinización MED estándar.",
            },
            "distribution_agent": {
                "urban_pct": 50,
                "agri_pct": 50,
                "industrial_pct": 0,
                "households_supplied": int(excedente / 600),
                "hectares_irrigated": int(excedente * 0.5 / 7_000),
                "reasoning": "Reparto 50/50 por defecto.",
            },
            "impact_agent": {
                "co2_avoided_tonnes_year": int(loop["co2_evitado_kg_dia"] * 365 / 1000),
                "investment_m_eur": round(mw * 1.5, 1),
                "roi_years": 10,
                "sdgs": [6, 13],
                "bankability_score": 5.0,
                "pitch": "Fallback pitch.",
            },
        }


global_service = GlobalService()
