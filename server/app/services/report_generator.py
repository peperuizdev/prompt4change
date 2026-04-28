"""
AquaLoop AI — Generador de Informes.

Una sola llamada al LLM recibe el contexto compacto de todos los agentes
y devuelve un informe ejecutivo estructurado en JSON.

Política de tokens:
  - El contexto de agentes se comprime a texto plano (~200 tokens)
  - El informe se limita a 1500 tokens de output
  - En total: ~1700 tokens por análisis completo
"""

import json
import re
from typing import Dict, Any, Optional

from app.services.ai_service import ai_service
from app.services.seacool_service import calcular_loop_circular, DATACENTER_MAX_MW


# ── System prompt del redactor ────────────────────────────────────────────────

_SYSTEM_PROMPT = """Eres AquaLoop AI, redactor de informes de impacto hídrico y social.
Recibes datos reales de agentes especializados (clima, agua, satélite, red eléctrica)
y generas un informe ejecutivo riguroso sobre cómo reutilizar el calor residual
de un datacenter para producir agua dulce y calentar hogares.

REGLAS ESTRICTAS:
- Responde ÚNICAMENTE con JSON válido. Sin markdown, sin texto previo ni posterior.
- Basa todo en los datos proporcionados. No inventes valores.
- Sé conciso: máximo 3 frases por campo de texto.
- Los scores_social (0-100) deben diferenciarse entre sí y reflejar la realidad climática."""


# ── Template del prompt de usuario ───────────────────────────────────────────

_USER_TEMPLATE = """DATOS DE AGENTES:
{agents_summary}

DATACENTER:
- Potencia nominal: {dc_power_mw} MW | Carga actual: {carga_pct}% → {potencia_real:.1f} MW reales
- Agua que puede generar: {agua_max:,} L/día (al 100% para desalinización)
- Hogares que puede calentar: {hogares_max:,} (al 100% para calefacción)
- Región: {region}

CONTEXTO DEL USUARIO: {user_context}

Genera este JSON exacto (sin campos adicionales):
{{
  "titulo": "string",
  "resumen_ejecutivo": "string",
  "hallazgos": [
    {{"agente": "WeatherAgent|WaterAgent|CopernicusAgent|GridAgent",
      "hallazgo": "string",
      "severidad": "info|warning|critical"}}
  ],
  "escenarios": [
    {{
      "nombre": "string con emoji",
      "agua_pct": int,
      "calefaccion_pct": int,
      "agua_litros_dia": int,
      "hectareas_regadas": int,
      "hogares_calentados": int,
      "score_social": int,
      "justificacion": "string",
      "recomendacion_ia": bool
    }}
  ],
  "recomendacion_final": "string",
  "razon_recomendacion": "string",
  "ods_impacto": [int],
  "metricas_clave": {{
    "temperatura_actual": float,
    "estres_hidrico": float,
    "lluvia_30d": float,
    "carbono_red_gco2kwh": int,
    "potencia_real_mw": float,
    "agua_max_litros_dia": int,
    "hogares_max": int
  }}
}}
"""


class ReportGenerator:
    """
    Genera un informe estructurado con UNA sola llamada al LLM.
    Los agentes ya entregaron sus datos — aquí solo los narramos.
    """

    @staticmethod
    async def generate(
        agents_data: Dict[str, Any],
        dc_power_mw: float,
        carga_pct: float,
        region: str,
        user_context: str = "",
    ) -> Optional[Dict]:
        """
        Genera el informe ejecutivo.

        Args:
            agents_data: Resultado de orchestrate() con {"results": {...}}
            dc_power_mw: Potencia nominal del datacenter en MW.
            carga_pct: Porcentaje de carga actual (0-100).
            region: Nombre de la región.
            user_context: Texto libre que el usuario proporcionó en el chat.

        Returns:
            Dict con la estructura del informe, o None si el LLM falla.
        """
        potencia_real = dc_power_mw * (carga_pct / 100)
        # Usar el loop circular para calcular el excedente real de agua
        carga_efectiva_pct = carga_pct * (dc_power_mw / DATACENTER_MAX_MW)
        loop = calcular_loop_circular(carga_efectiva_pct)
        agua_max = loop["agua_generada_litros"]
        hogares_max = int((loop["calor_residual_mw"] * 1000) / 3)  # 3 kW por hogar

        agents_summary = ReportGenerator._compress_agents(agents_data)

        prompt = _USER_TEMPLATE.format(
            agents_summary=agents_summary,
            dc_power_mw=dc_power_mw,
            carga_pct=carga_pct,
            potencia_real=potencia_real,
            agua_max=agua_max,
            hogares_max=hogares_max,
            region=region,
            user_context=user_context or "No especificado por el usuario",
        )

        try:
            response = await ai_service.chat(
                messages=[
                    {"role": "system", "content": _SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.35,
                max_tokens=1500,
            )
            return ReportGenerator._parse_json(response)
        except Exception as e:
            print(f"⚠️ ReportGenerator LLM error: {e}")
            return None

    @staticmethod
    def _compress_agents(agents_data: Dict[str, Any]) -> str:
        """
        Convierte el contexto de agentes a texto compacto para minimizar tokens.
        """
        results = agents_data.get("results", {})
        lines = []

        w = results.get("weather", {}).get("data", {})
        if w:
            lines.append(
                f"[WeatherAgent / Open-Meteo] "
                f"Temp={w.get('current_temp')}°C | "
                f"Lluvia30d={w.get('total_rain_30d')}mm | "
                f"AvgTemp30d={w.get('avg_temp_30d')}°C | "
                f"EstrésCalor={w.get('heat_stress')}"
            )

        wa = results.get("water", {}).get("data", {})
        if wa:
            lines.append(
                f"[WaterAgent / WRI Aqueduct] "
                f"ÍndiceEstrés={wa.get('water_stress_index')}/5 | "
                f"Sequía={wa.get('drought_severity')} | "
                f"AgotamientoAcuífero={wa.get('groundwater_depletion')} | "
                f"Urgencia={wa.get('urgency_score')}/100"
            )

        cop = results.get("copernicus", {}).get("data", {})
        if cop:
            lines.append(
                f"[CopernicusAgent / ESA] "
                f"HumedadSuelo={cop.get('soil_moisture_index')}% | "
                f"TempMar={cop.get('sea_surface_temp')}°C | "
                f"NDVI={cop.get('vegetation_index')} | "
                f"AnomaliaMar={cop.get('sea_anomaly')}°C"
            )

        grid = results.get("grid", {}).get("data", {})
        if grid:
            lines.append(
                f"[GridAgent / ElectricityMaps] "
                f"Carbono={grid.get('carbon_intensity')}gCO2/kWh | "
                f"Renovables={grid.get('renewable_percentage')}% | "
                f"Fósiles={grid.get('fossil_percentage')}% | "
                f"Red={grid.get('grid_status')}"
            )

        return "\n".join(lines) if lines else "Sin datos de agentes disponibles."

    @staticmethod
    def _parse_json(response: str) -> Optional[Dict]:
        """Limpia markdown fences y parsea el JSON del LLM."""
        cleaned = re.sub(r"^```(?:json)?\s*", "", response.strip())
        cleaned = re.sub(r"\s*```$", "", cleaned).strip()
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            match = re.search(r"\{[\s\S]*\}", cleaned)
            if match:
                try:
                    return json.loads(match.group())
                except json.JSONDecodeError:
                    return None
        return None


# Singleton
report_generator = ReportGenerator()
