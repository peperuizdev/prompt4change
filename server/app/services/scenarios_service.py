"""
Generador de Escenarios Inteligentes para SeaCool AI.
Evalúa múltiples opciones de distribución de calor (agua vs calefacción)
basadas en contexto real (clima, estrés hídrico, energía).
"""

import json
import re
from typing import Dict, List, Any, Optional
from datetime import datetime

from app.services.api_connectors import RealWorldContextAggregator
from app.services.ai_service import ai_service
from app.services.seacool_service import (
    calcular_metricas_tecnicas,
    DATACENTER_MAX_MW,
    LITROS_POR_MW_DIA,
)

# ============================================================================
# Constants y Prompts
# ============================================================================

SCENARIO_EVALUATOR_PROMPT = """Eres AquaLoop AI, un orquestador especializado en evaluar escenarios de impacto social.
Tu rol es analizar datos reales de clima, agua y energía, y decidir cómo distribuir óptimamente el calor residual de un Datacenter.

DATOS DISPONIBLES:
- Temperatura actual: {current_temp}°C
- Estrés hídrico (0-5): {water_stress_index}
- Lluvia últimos 30 días: {total_rain_30d}mm
- Intensidad carbono red: {carbon_intensity}gCO2/kWh
- Humedad suelo (0-100): {soil_moisture_index}%
- Mes: {mes}

PARÁMETROS DEL DATACENTER:
- Potencia disponible: {dc_power_mw}MW (generate {water_liters}/día si destilación 100%)
- Capacidad calefacción: {heating_homes} hogares si 100% calefacción

INSTRUCCIÓN CRÍTICA:
Genera exactamente 3 escenarios distintos con diferentes prioridades:

1. ESCENARIO A - Emergencia Hídrica: Prioridad AGUA (80% agua, 20% calefacción)
2. ESCENARIO B - Eficiencia Térmica: Prioridad CALEFACCIÓN (30% agua, 70% calefacción)
3. ESCENARIO C - Híbrido Inteligente: EQUILIBRIO DINÁMICO (50% agua, 50% calefacción)

Para CADA escenario, calcula:
- agua_pct: porcentaje para destilación
- calefaccion_pct: porcentaje para calefacción residencial
- hectareas_regadas: (agua_litros * agua_pct / 100) / 500 litros/hectárea
- hogares_calentados: (calefaccion_pct / 100) * {heating_homes}
- score_social: 0-100 basado en:
  * Estrés hídrico actual (si alto → agua más valiosa)
  * Temperatura (si fría → calefacción más valiosa)
  * Mes (verano → agua crítica; invierno → calefacción crítica)
- recomendacion_ia: TRUE si el agente lo recomienda como "mejor opción"

FORMATO DE SALIDA ESTRICTO - JSON válido, sin Markdown:
{{
  "escenarios": [
    {{
      "nombre": "💧 Emergencia Hídrica",
      "agua_pct": 80,
      "calefaccion_pct": 20,
      "agua_litros_dia": <calculado>,
      "hectareas_regadas": <calculado>,
      "hogares_calentados": <calculado>,
      "score_social": <0-100>,
      "justificacion": "<breve explicación del por qué este escenario>",
      "recomendacion_ia": false
    }},
    {{
      "nombre": "🔥 Eficiencia Térmica",
      "agua_pct": 30,
      "calefaccion_pct": 70,
      "agua_litros_dia": <calculado>,
      "hectareas_regadas": <calculado>,
      "hogares_calentados": <calculado>,
      "score_social": <0-100>,
      "justificacion": "<breve explicación>",
      "recomendacion_ia": false
    }},
    {{
      "nombre": "⚖️ Híbrido Inteligente",
      "agua_pct": 50,
      "calefaccion_pct": 50,
      "agua_litros_dia": <calculado>,
      "hectareas_regadas": <calculado>,
      "hogares_calentados": <calculado>,
      "score_social": <0-100>,
      "justificacion": "<breve explicación>",
      "recomendacion_ia": true
    }}
  ],
  "recomendacion_final": "⚖️ Híbrido Inteligente",
  "razon_recomendacion": "<explicación corta de por qué el agente elige este escenario>"
}}

IMPORTANTE:
- Exactamente 3 escenarios, no más, no menos.
- Cada score_social debe ser DISTINTO y reflejar la realidad climática/hídrica actual.
- Asegúrate de que exactamente UNO tenga recomendacion_ia: true.
- No inventes datos: usa los proporcionados en DATOS DISPONIBLES.
- Responde SOLO JSON, sin explicación previa.
"""


class ScenarioEvaluator:
    """
    Evalúa múltiples escenarios de distribución de calor residual.
    Usa IA (Gemini/Groq) para tomar decisiones inteligentes basadas en contexto real.
    """

    @staticmethod
    async def evaluate_scenarios(
        dc_power_mw: float = 50,
        latitude: float = 36.7,
        longitude: float = -2.5,
        region: str = "almeria",
        mes: Optional[str] = None,
        carga_dc_pct: float = 75,
    ) -> Dict[str, Any]:
        """
        Evalúa 3 escenarios de impacto con datos reales del contexto.

        Args:
            dc_power_mw: Potencia del datacenter en MW.
            latitude: Latitud.
            longitude: Longitud.
            region: Región (almeria, zaragoza, etc).
            mes: Mes actual (si None, usa datetime.now()).
            carga_dc_pct: Carga del DC en % (determina potencia real).

        Returns:
            {
                "escenarios": [
                    {"nombre": "...", "agua_pct": 80, "score_social": 95, ...},
                    ...
                ],
                "recomendacion_final": "...",
                "contexto_usado": {...}
            }
        """

        # Paso 1: Obtener contexto real
        context = await RealWorldContextAggregator.gather_full_context(
            latitude=latitude,
            longitude=longitude,
            region=region,
        )

        # Paso 2: Extraer datos del contexto
        climate = context.get("climate", {})
        water_stress = context.get("water_stress", {})
        grid = context.get("grid_carbon", {})
        soil_sea = context.get("soil_and_sea", {})

        current_temp = climate.get("current_temp", 20)
        water_stress_index = water_stress.get("water_stress_index", 2.5)
        total_rain_30d = climate.get("total_rain_30d", 50)
        carbon_intensity = grid.get("carbon_intensity", 150)
        soil_moisture_index = soil_sea.get("soil_moisture_index", 50)

        # Paso 3: Calcular capacidades
        potencia_real_mw = dc_power_mw * (carga_dc_pct / 100)
        water_liters_per_day = int(potencia_real_mw * LITROS_POR_MW_DIA)
        heating_homes_capacity = int((potencia_real_mw * 1000) / 3)  # 3kW promedio por hogar

        # Paso 4: Mes actual
        if not mes:
            mes = datetime.now().strftime("%B").lower()
            # Convertir a español
            meses_es = {
                "january": "enero",
                "february": "febrero",
                "march": "marzo",
                "april": "abril",
                "may": "mayo",
                "june": "junio",
                "july": "julio",
                "august": "agosto",
                "september": "septiembre",
                "october": "octubre",
                "november": "noviembre",
                "december": "diciembre",
            }
            mes = meses_es.get(mes, "julio")

        # Paso 5: Armar prompt para IA
        prompt = SCENARIO_EVALUATOR_PROMPT.format(
            current_temp=current_temp,
            water_stress_index=round(water_stress_index, 1),
            total_rain_30d=round(total_rain_30d, 1),
            carbon_intensity=carbon_intensity,
            soil_moisture_index=soil_moisture_index,
            mes=mes,
            dc_power_mw=dc_power_mw,
            water_liters=water_liters_per_day,
            heating_homes=heating_homes_capacity,
        )

        # Paso 6: Llamar IA
        try:
            response = await ai_service.chat(
                messages=[{"role": "user", "content": prompt}]
            )

            # Parsear JSON — limpia markdown fences antes de parsear
            scenarios_data = ScenarioEvaluator._parse_llm_json(response)
            
            return {
                "status": "success",
                "escenarios": scenarios_data.get("escenarios", []),
                "recomendacion_final": scenarios_data.get("recomendacion_final"),
                "razon_recomendacion": scenarios_data.get("razon_recomendacion"),
                "contexto_usado": {
                    "clima": {
                        "temperatura": current_temp,
                        "lluvia_30d": total_rain_30d,
                        "estres_hidrico": round(water_stress_index, 1),
                    },
                    "datacenter": {
                        "potencia_mw": potencia_real_mw,
                        "agua_dia": water_liters_per_day,
                        "hogares_capacidad": heating_homes_capacity,
                    },
                    "timestamp": context.get("timestamp"),
                },
            }
        except json.JSONDecodeError as e:
            print(f"⚠️ Error parseando JSON del agente: {e}")
            print(f"Respuesta del agente: {response}")
            
            # Fallback: retornar escenarios predeterminados
            return ScenarioEvaluator._fallback_scenarios(
                water_liters_per_day,
                heating_homes_capacity,
                current_temp,
                water_stress_index,
                mes,
            )
        except Exception as e:
            print(f"⚠️ Error en evaluación de escenarios: {e}")
            return {
                "status": "error",
                "message": str(e),
                "escenarios": [],
            }

    @staticmethod
    def _parse_llm_json(response: str) -> dict:
        """Strip markdown fences and parse JSON from LLM response."""
        cleaned = re.sub(r"^```(?:json)?\s*", "", response.strip())
        cleaned = re.sub(r"\s*```$", "", cleaned).strip()
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            match = re.search(r"\{[\s\S]*\}", cleaned)
            if match:
                return json.loads(match.group())
            raise

    @staticmethod
    def _fallback_scenarios(
        water_liters: int,
        heating_homes: int,
        current_temp: float,
        water_stress: float,
        mes: str,
    ) -> Dict[str, Any]:
        """
        Retorna escenarios predeterminados si la IA falla.
        """

        # Determinar scores basados en contexto
        if water_stress > 3.5 or current_temp > 35:
            score_agua = 95
            score_calor = 45
            score_hibrido = 70
            recomendacion = "💧 Emergencia Hídrica"
        elif current_temp < 5:
            score_agua = 30
            score_calor = 95
            score_hibrido = 65
            recomendacion = "🔥 Eficiencia Térmica"
        else:
            score_agua = 65
            score_calor = 60
            score_hibrido = 85
            recomendacion = "⚖️ Híbrido Inteligente"

        return {
            "status": "fallback",
            "escenarios": [
                {
                    "nombre": "💧 Emergencia Hídrica",
                    "agua_pct": 80,
                    "calefaccion_pct": 20,
                    "agua_litros_dia": int(water_liters * 0.8),
                    "hectareas_regadas": int((water_liters * 0.8) / 500),
                    "hogares_calentados": int(heating_homes * 0.2),
                    "score_social": score_agua,
                    "justificacion": "Prioriza agua dulce para agricultura y consumo humano.",
                    "recomendacion_ia": recomendacion == "💧 Emergencia Hídrica",
                },
                {
                    "nombre": "🔥 Eficiencia Térmica",
                    "agua_pct": 30,
                    "calefaccion_pct": 70,
                    "agua_litros_dia": int(water_liters * 0.3),
                    "hectareas_regadas": int((water_liters * 0.3) / 500),
                    "hogares_calentados": int(heating_homes * 0.7),
                    "score_social": score_calor,
                    "justificacion": "Maximiza calefacción para comunidad en temporada fría.",
                    "recomendacion_ia": recomendacion == "🔥 Eficiencia Térmica",
                },
                {
                    "nombre": "⚖️ Híbrido Inteligente",
                    "agua_pct": 50,
                    "calefaccion_pct": 50,
                    "agua_litros_dia": int(water_liters * 0.5),
                    "hectareas_regadas": int((water_liters * 0.5) / 500),
                    "hogares_calentados": int(heating_homes * 0.5),
                    "score_social": score_hibrido,
                    "justificacion": "Equilibra agua y calor para máximo impacto sostenible.",
                    "recomendacion_ia": recomendacion == "⚖️ Híbrido Inteligente",
                },
            ],
            "recomendacion_final": recomendacion,
            "razon_recomendacion": "Fallback: Basado en contexto climático aproximado.",
        }


# Instancia singleton
scenario_evaluator = ScenarioEvaluator()
