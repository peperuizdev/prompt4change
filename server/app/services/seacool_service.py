"""
SeaCool AI - Servicio del Orquestador Multiagente.
Gestiona la economía circular entre un Centro de Datos y una comunidad costera.

Loop circular real:
  DC (electricidad) → calor residual (PUE)
  → MED desalinización (calor → agua dulce)
  → agua refrigera el DC (cierra el bucle)
  → excedente distribuido (agricultura / urbano)
  → absorción (calor → frío para el DC, ahorro eléctrico)
"""

import json
import re
from typing import Any, Dict, Optional

from app.services.ai_service import ai_service


# ── Constantes físicas del modelo ────────────────────────────────────────────

DATACENTER_MAX_MW = 50          # Capacidad eléctrica máxima del DC (MW)

# PUE (Power Usage Effectiveness) típico de un DC moderno.
# PUE = 1.4 → el 40 % de la energía eléctrica se convierte en calor recuperable.
PUE = 1.4

# MED (Multi-Effect Distillation) a baja temperatura (65-75 °C, ideal para
# calor de DC). Consumo térmico ~80 kWh_th/m³ → GOR ≈ 8.
# 1 MW_th × 24 h / 80 kWh_th·m⁻³ = 300 m³/día → 300 000 L/MW_th/día
LITROS_POR_MW_TERMICO_DIA = 300_000

# WUE (Water Use Effectiveness) de un DC refrigerado con agua: ~1.5 L/kWh IT.
# El agua desalinizada cierra el bucle de refrigeración (torres evaporativas).
WUE_LITROS_POR_KWH = 1.5

# Chiller de absorción: COP ≈ 0.7 → por cada kW térmico de calor residual
# se obtienen 0.7 kW de frío, evitando compresores eléctricos convencionales.
COP_ABSORCION = 0.7

# Intensidad de carbono de la red eléctrica española (~250 g CO₂/kWh, 2024).
KG_CO2_POR_KWH = 0.25

# Agua necesaria para regar 1 ha en riego por goteo (verano mediterráneo).
LITROS_POR_HECTAREA_DIA = 7_000

# Consumo diario de agua por hogar (3 personas × 200 L/persona).
LITROS_POR_HOGAR_DIA = 600

# Meses de verano (demanda agrícola crítica en zona mediterránea)
MESES_VERANO = {"junio", "julio", "agosto", "septiembre"}
MESES_TRANS = {"mayo", "octubre"}


# ── Cálculos deterministicos ──────────────────────────────────────────────────

def calcular_loop_circular(
    carga_dc: float,
    carbon_intensity_kg_kwh: float = KG_CO2_POR_KWH,
    sea_surface_temp_c: float = 20.0,
) -> Dict[str, Any]:
    """
    Calcula el loop circular completo partiendo de la carga eléctrica del DC.

    Parámetros opcionales para reflejar la realidad local:
      - carbon_intensity_kg_kwh: intensidad de carbono de la red del país
        (defecto: España 0.25 kg/kWh). Afecta el CO₂ evitado.
      - sea_surface_temp_c: temperatura del agua de mar disponible para MED
        (defecto: 20°C). Agua más fría → mayor ΔT → más eficiencia MED.

    Flujo físico:
      1. Potencia eléctrica del DC
      2. Calor residual recuperable (PUE-1)
      3. Agua total desalinizada por MED (con corrección por temperatura del mar)
      4. Agua consumida internamente para refrigerar el DC (cierre del bucle)
      5. Agua excedente disponible para distribución exterior
      6. Ahorro eléctrico del chiller de absorción (COP 0.7)
      7. CO₂ evitado por ese ahorro (con intensidad real de la red)
    """
    # 1 · Potencia eléctrica real
    potencia_mw = DATACENTER_MAX_MW * (carga_dc / 100.0)

    # 2 · Calor residual recuperable
    calor_residual_mw = round(potencia_mw * (PUE - 1.0), 2)

    # 3 · Agua total desalinizada (MED térmica)
    #     Corrección por temperatura del mar: cada °C por debajo de 20°C
    #     mejora el ΔT disponible, incrementando el GOR ~0.4 % por °C.
    sea_factor = round(1.0 + (20.0 - sea_surface_temp_c) * 0.004, 3)
    agua_total_litros = int(calor_residual_mw * LITROS_POR_MW_TERMICO_DIA * sea_factor)

    # 4 · Agua consumida para refrigerar el DC (cierre del bucle)
    kwh_it_dia = potencia_mw * 1_000 * 24
    agua_refrigeracion_litros = int(kwh_it_dia * WUE_LITROS_POR_KWH)

    # 5 · Excedente distribuible
    agua_excedente_litros = max(0, agua_total_litros - agua_refrigeracion_litros)

    # 6 · Ahorro eléctrico del chiller de absorción
    ahorro_refrigeracion_kw = int(calor_residual_mw * 1_000 * COP_ABSORCION)

    # 7 · CO₂ evitado (con la intensidad de carbono real de la red local)
    co2_evitado_kg_dia = int(ahorro_refrigeracion_kw * 24 * carbon_intensity_kg_kwh)

    eficiencia_loop_pct = (
        round(agua_refrigeracion_litros / agua_total_litros * 100, 1)
        if agua_total_litros > 0 else 0
    )

    return {
        "calor_residual_mw": calor_residual_mw,
        "agua_total_litros": agua_total_litros,
        "agua_refrigeracion_litros": agua_refrigeracion_litros,
        "eficiencia_loop_pct": eficiencia_loop_pct,
        "ahorro_refrigeracion_kw": ahorro_refrigeracion_kw,
        "co2_evitado_kg_dia": co2_evitado_kg_dia,
        "carbon_intensity_kg_kwh": round(carbon_intensity_kg_kwh, 3),
        "sea_factor": sea_factor,
        "agua_generada_litros": agua_excedente_litros,
    }


def calcular_distribucion_base(
    temp_ext: float,
    mes: str,
    agua_excedente_litros: int,
) -> Dict[str, Any]:
    """
    Calcula distribución urbana/agrícola del excedente y métricas derivadas.

    Args:
        temp_ext: Temperatura exterior en °C.
        mes: Nombre del mes en español.
        agua_excedente_litros: Litros disponibles para distribución exterior.

    Returns:
        Dict con porcentajes, litros por sector, hogares y hectáreas.
    """
    mes_lower = mes.lower().strip()

    if temp_ext > 35:
        agricola = 80
    elif temp_ext > 30:
        agricola = 70
    elif mes_lower in MESES_VERANO:
        agricola = 60
    elif mes_lower in MESES_TRANS:
        agricola = 45
    elif temp_ext > 25:
        agricola = 55
    else:
        agricola = 35

    urbana = 100 - agricola

    agua_agricola_litros = int(agua_excedente_litros * agricola / 100)
    agua_urbana_litros = int(agua_excedente_litros * urbana / 100)

    hectareas_regadas = int(agua_agricola_litros / LITROS_POR_HECTAREA_DIA)
    hogares_abastecidos = int(agua_urbana_litros / LITROS_POR_HOGAR_DIA)

    return {
        "urbana_porcentaje": urbana,
        "agricola_porcentaje": agricola,
        "agua_urbana_litros": agua_urbana_litros,
        "agua_agricola_litros": agua_agricola_litros,
        "hogares_abastecidos": hogares_abastecidos,
        "hectareas_regadas": hectareas_regadas,
    }


def evaluar_alerta(
    temp_ext: float,
    carga_dc: float,
    agua_excedente_litros: int,
    eficiencia_loop_pct: float,
) -> str:
    """Evalúa condiciones de alerta del sistema."""
    alertas = []

    if temp_ext > 40:
        alertas.append("CRÍTICO: Ola de calor extrema — eficiencia MED reducida")
    elif temp_ext > 35:
        alertas.append("ALERTA: Temperatura alta — vigilar rendimiento del chiller")

    if carga_dc > 90:
        alertas.append("DC cerca de capacidad máxima — excedente hídrico máximo")

    if agua_excedente_litros < 500_000 and temp_ext > 30:
        alertas.append("Excedente hídrico insuficiente para demanda agrícola estival")

    if eficiencia_loop_pct < 20:
        alertas.append("Loop circular ineficiente — revisar WUE del sistema de refrigeración")

    return ". ".join(alertas) if alertas else "Nominal"


# ── System Prompt del Orquestador ─────────────────────────────────────────────

SEACOOL_SYSTEM_PROMPT = """Eres el Orquestador Multiagente del sistema SeaCool AI.
Gestionas la economía circular entre un Centro de Datos (DC) costero y una comunidad con estrés hídrico (Almería, España).

═══════════════════════════════════════════
LOOP CIRCULAR REAL (usa estos valores exactos)
═══════════════════════════════════════════

PASO 1 · Calor residual del DC
  calor_residual_mw = potencia_mw × (PUE - 1)
  PUE = 1.4  →  el 40 % de la energía eléctrica se convierte en calor recuperable
  Ejemplo: DC a 75 % de 50 MW → potencia = 37.5 MW → calor = 37.5 × 0.4 = 15 MW

PASO 2 · Desalinización MED (Multi-Effect Distillation)
  agua_total_litros = calor_residual_mw × 300 000 L/MW·día
  (tecnología MED a 65-75 °C, consumo térmico ~80 kWh_th/m³, GOR ≈ 8)
  Ejemplo: 15 MW × 300 000 = 4 500 000 L/día

PASO 3 · Cierre del bucle: agua para refrigeración interna del DC
  agua_refrigeracion_litros = (potencia_mw × 1000 kW/MW × 24 h) × 1.5 L/kWh
  (WUE típica de DC refrigerado con agua: 1.5 L/kWh IT)
  Ejemplo: 37.5 MW → 37 500 kW × 24 h × 1.5 = 1 350 000 L/día

PASO 4 · Excedente distribuible (lo que financia el impacto social)
  agua_excedente = agua_total - agua_refrigeracion
  Ejemplo: 4 500 000 - 1 350 000 = 3 150 000 L/día

PASO 5 · Chiller de absorción (frío para el DC, ahorro eléctrico)
  ahorro_kw = calor_residual_mw × 1000 × COP_absorcion
  COP_absorcion = 0.7  (chiller de LiBr estándar)
  Ejemplo: 15 MW × 1000 × 0.7 = 10 500 kW ahorrados

PASO 6 · CO₂ evitado (España: ~0.25 kg CO₂/kWh)
  co2_kg_dia = ahorro_kw × 24 h × 0.25

═══════════════════════════════════════════
AGENTES INTERNOS
═══════════════════════════════════════════

Agente Distribuidor:
  - Decide reparto % urbano / agrícola del EXCEDENTE según temperatura y mes.
  - Verano/calor extremo: prioriza supervivencia agrícola (invernaderos Almería).
  - Invierno: reparto más equitativo.
  - Justifica brevemente por qué ese reparto (máx 20 palabras).

Agente Alerta:
  - Evalúa si el loop opera correctamente.
  - Alerta si: temp > 35 °C (eficiencia MED cae), carga > 90 % (riesgo sobrecalentamiento),
    excedente < 500 000 L y demanda agrícola crítica.
  - Si todo nominal: mensaje corto confirmando estado óptimo del loop (máx 15 palabras).

Agente ROI:
  - Comunica el valor económico del ahorro de refrigeración y el agua producida.
  - Incluye kW ahorrados y litros excedentes (máx 15 palabras).

═══════════════════════════════════════════
FORMATO DE SALIDA — JSON estricto, sin markdown
═══════════════════════════════════════════

{
  "metricas_tecnicas": {
    "calor_residual_mw": [float, paso 1],
    "agua_total_litros": [int, paso 2],
    "agua_refrigeracion_litros": [int, paso 3],
    "agua_generada_litros": [int, paso 4 — excedente distribuible],
    "ahorro_refrigeracion_kw": [int, paso 5],
    "co2_evitado_kg_dia": [int, paso 6],
    "eficiencia_loop_pct": [float, agua_refrigeracion / agua_total × 100]
  },
  "distribucion": {
    "urbana_porcentaje": [int, 0-100],
    "agricola_porcentaje": [int, 0-100]
  },
  "mensajes_agentes": {
    "agente_distribuidor": "[justificación del reparto]",
    "agente_alerta": "[estado o alerta del loop]",
    "agente_roi": "[valor económico-energético del loop]"
  }
}"""


# ── Servicio ──────────────────────────────────────────────────────────────────

class SeaCoolService:
    """
    Servicio del Orquestador Multiagente SeaCool AI.
    Combina cálculos deterministas (física del loop) con razonamiento IA (agentes).
    """

    async def simulate(
        self,
        temp_ext: float,
        carga_dc: float,
        mes: str,
        carbon_intensity_kg_kwh: float = KG_CO2_POR_KWH,
        sea_surface_temp_c: float = 20.0,
    ) -> Dict[str, Any]:
        """
        Ejecuta la simulación completa del loop circular.

        1. Calcula el loop deterministamente (física real).
        2. Calcula distribución + métricas derivadas.
        3. Envía al LLM para razonamiento de los agentes.
        4. Fallback determinista si el LLM falla.
        """
        # Paso 1: Loop circular determinista (con parámetros contextuales reales)
        loop = calcular_loop_circular(
            carga_dc,
            carbon_intensity_kg_kwh=carbon_intensity_kg_kwh,
            sea_surface_temp_c=sea_surface_temp_c,
        )

        # Paso 2: Distribución del excedente
        distribucion = calcular_distribucion_base(
            temp_ext, mes, loop["agua_generada_litros"]
        )

        # Paso 3: Alerta
        alerta = evaluar_alerta(
            temp_ext,
            carga_dc,
            loop["agua_generada_litros"],
            loop["eficiencia_loop_pct"],
        )

        # Paso 4: Orquestación IA (los agentes razonan sobre los datos calculados)
        try:
            resultado_ia = await self._orquestar_con_ia(
                temp_ext, carga_dc, mes, loop, distribucion
            )
            if resultado_ia:
                # Enriquecer con campos que el LLM no recalcula
                resultado_ia["metricas_tecnicas"].setdefault(
                    "hogares_abastecidos", distribucion["hogares_abastecidos"]
                )
                resultado_ia["metricas_tecnicas"].setdefault(
                    "hectareas_regadas", distribucion["hectareas_regadas"]
                )
                return resultado_ia
        except Exception as e:
            print(f"⚠️  SeaCool: Error en orquestación IA, usando fallback: {e}")

        # Paso 5: Fallback determinista
        return self._construir_fallback(loop, distribucion, alerta, temp_ext, carga_dc)

    async def _orquestar_con_ia(
        self,
        temp_ext: float,
        carga_dc: float,
        mes: str,
        loop: Dict[str, Any],
        distribucion: Dict[str, Any],
    ) -> Optional[Dict[str, Any]]:
        potencia_mw = DATACENTER_MAX_MW * (carga_dc / 100.0)

        user_prompt = (
            f"DATOS DE ENTRADA:\n"
            f"  · Temperatura exterior: {temp_ext} °C\n"
            f"  · Carga DC: {carga_dc} % ({potencia_mw:.1f} MW / {DATACENTER_MAX_MW} MW)\n"
            f"  · Mes: {mes}\n\n"
            f"LOOP CIRCULAR PRE-CALCULADO (usa estos valores exactos en el JSON):\n"
            f"  · calor_residual_mw:         {loop['calor_residual_mw']}\n"
            f"  · agua_total_litros:          {loop['agua_total_litros']:,}\n"
            f"  · agua_refrigeracion_litros:  {loop['agua_refrigeracion_litros']:,}  ← cierra el bucle\n"
            f"  · agua_generada_litros:       {loop['agua_generada_litros']:,}  ← excedente distribuible\n"
            f"  · ahorro_refrigeracion_kw:    {loop['ahorro_refrigeracion_kw']:,}\n"
            f"  · co2_evitado_kg_dia:         {loop['co2_evitado_kg_dia']:,}\n"
            f"  · eficiencia_loop_pct:        {loop['eficiencia_loop_pct']}\n\n"
            f"DISTRIBUCIÓN BASE (puedes ajustar si razonas mejor):\n"
            f"  · urbana_porcentaje:   {distribucion['urbana_porcentaje']} %\n"
            f"  · agricola_porcentaje: {distribucion['agricola_porcentaje']} %\n\n"
            f"Ejecuta los 3 agentes y responde con el JSON estricto."
        )

        response = await ai_service.chat(
            messages=[
                {"role": "system", "content": SEACOOL_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.3,
            max_tokens=1_200,
        )

        return self._parsear_respuesta_ia(response)

    def _parsear_respuesta_ia(self, response: str) -> Optional[Dict[str, Any]]:
        if not response:
            return None

        cleaned = response.strip()
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
        cleaned = cleaned.strip()

        try:
            parsed = json.loads(cleaned)
            if all(k in parsed for k in ["metricas_tecnicas", "distribucion", "mensajes_agentes"]):
                return parsed
        except json.JSONDecodeError:
            match = re.search(r"\{[\s\S]*\}", cleaned)
            if match:
                try:
                    parsed = json.loads(match.group())
                    if all(k in parsed for k in ["metricas_tecnicas", "distribucion", "mensajes_agentes"]):
                        return parsed
                except json.JSONDecodeError:
                    pass

        return None

    def _construir_fallback(
        self,
        loop: Dict[str, Any],
        distribucion: Dict[str, Any],
        alerta: str,
        temp_ext: float,
        carga_dc: float,
    ) -> Dict[str, Any]:
        if temp_ext > 35:
            msg_dist = f"Calor extremo ({temp_ext} °C): 80 % excedente a riego de supervivencia."
        elif temp_ext > 30:
            msg_dist = f"Temperatura alta ({temp_ext} °C): mayor proporción a agricultura."
        else:
            msg_dist = f"Condiciones moderadas: reparto equilibrado urbano/agrícola."

        msg_roi = (
            f"Loop activo: {loop['ahorro_refrigeracion_kw']:,} kW ahorrados, "
            f"{loop['agua_generada_litros']:,} L/día de excedente."
        )

        return {
            "metricas_tecnicas": {
                **loop,
                "hogares_abastecidos": distribucion["hogares_abastecidos"],
                "hectareas_regadas": distribucion["hectareas_regadas"],
            },
            "distribucion": {
                "urbana_porcentaje": distribucion["urbana_porcentaje"],
                "agricola_porcentaje": distribucion["agricola_porcentaje"],
            },
            "mensajes_agentes": {
                "agente_distribuidor": msg_dist,
                "agente_alerta": alerta,
                "agente_roi": msg_roi,
            },
        }


# Instancia singleton
seacool_service = SeaCoolService()
