"""
SeaCool AI - Servicio del Orquestador Multiagente.
Gestiona la economía circular entre un Centro de Datos y una comunidad costera.
Calcula métricas técnicas y orquesta los 3 agentes (Distribuidor, Alerta, ROI).
"""

import json
import re
from typing import Any, Dict, Optional

from app.services.ai_service import ai_service


# ---- Constantes Físicas del Modelo ----

DATACENTER_MAX_MW = 50  # Capacidad máxima del datacenter (MW)
LITROS_POR_MW_DIA = 15_000  # 1 MW continuo genera ~15.000 L/día de agua dulce
AHORRO_REFRIGERACION_PCT = 0.15  # Ciclo de absorción ahorra ~15% del consumo eléctrico
KW_POR_MW = 1_000  # Conversión MW -> kW

# Meses de verano (temperaturas altas, demanda agrícola crítica)
MESES_VERANO = {"junio", "julio", "agosto", "septiembre"}
MESES_TRANS = {"mayo", "octubre"}  # Meses de transición


def calcular_metricas_tecnicas(carga_dc: float) -> Dict[str, int]:
    """
    Calcula las métricas técnicas del sistema basándose en la carga del datacenter.

    Args:
        carga_dc: Porcentaje de carga del datacenter (0-100).

    Returns:
        Dict con agua_generada_litros y ahorro_refrigeracion_kw.
    """
    # Potencia real usada (MW)
    potencia_real_mw = DATACENTER_MAX_MW * (carga_dc / 100.0)

    # Agua generada: proporcional a la potencia (calor residual)
    agua_litros = int(potencia_real_mw * LITROS_POR_MW_DIA)

    # Ahorro en refrigeración: 15% del consumo eléctrico total (en kW)
    ahorro_kw = int(potencia_real_mw * KW_POR_MW * AHORRO_REFRIGERACION_PCT)

    return {
        "agua_generada_litros": agua_litros,
        "ahorro_refrigeracion_kw": ahorro_kw,
    }


def calcular_distribucion_base(temp_ext: float, mes: str) -> Dict[str, int]:
    """
    Calcula una distribución base urbana/agrícola según temperatura y mes.
    Este cálculo determinista sirve como guía para el agente IA.

    Args:
        temp_ext: Temperatura exterior en °C.
        mes: Nombre del mes (en español, minúsculas).

    Returns:
        Dict con urbana_porcentaje y agricola_porcentaje.
    """
    mes_lower = mes.lower().strip()

    # Lógica basada en estrés hídrico agrícola
    if temp_ext > 35:
        # Calor extremo: supervivencia agrícola crítica
        agricola = 80
    elif temp_ext > 30:
        # Calor alto: priorización agrícola fuerte
        agricola = 70
    elif mes_lower in MESES_VERANO:
        # Verano con temperatura moderada
        agricola = 60
    elif mes_lower in MESES_TRANS:
        # Transición primavera/otoño
        agricola = 45
    elif temp_ext > 25:
        # Temperatura media-alta fuera de verano
        agricola = 55
    else:
        # Invierno o temperaturas bajas: reparto equitativo
        agricola = 35

    return {
        "urbana_porcentaje": 100 - agricola,
        "agricola_porcentaje": agricola,
    }


def evaluar_alerta(temp_ext: float, carga_dc: float, agua_litros: int) -> str:
    """
    Evalúa condiciones de alerta del sistema.

    Returns:
        Mensaje de alerta o "Nominal".
    """
    alertas = []

    if temp_ext > 40:
        alertas.append("CRÍTICO: Ola de calor extrema")
    elif temp_ext > 35:
        alertas.append("ALERTA: Temperatura peligrosamente alta")

    if carga_dc > 90:
        alertas.append("Datacenter cerca de capacidad máxima")

    if agua_litros < 100_000 and temp_ext > 30:
        alertas.append("Producción de agua insuficiente para demanda estival")

    if not alertas:
        return "Nominal"

    return ". ".join(alertas)


# ---- System Prompt del Orquestador ----

SEACOOL_SYSTEM_PROMPT = """Eres el Orquestador Multiagente del sistema SeaCool AI. Tu objetivo es gestionar la economía circular entre un Centro de Datos (que genera calor residual) y una comunidad costera con estrés hídrico (Almería, España), utilizando refrigeración por absorción y destilación de agua marina.

[MCP READY: Actualmente recibes el contexto de entorno vía payload JSON, pero este bloque está diseñado para ser reemplazado por la ingesta automática de herramientas del Model Context Protocol (clima local, sensores IoT del servidor)].

REGLAS FÍSICAS BÁSICAS (Usa esto para tus cálculos aproximados):
- A mayor carga del datacenter, mayor calor residual generado.
- El calor residual evapora agua de mar: 1 MW de calor continuo genera aprox. 15.000 litros de agua dulce al día.
- El ciclo de absorción devuelve frío al servidor: ahorra aprox. un 15% del consumo eléctrico total del datacenter en refrigeración.
- En verano (temperaturas > 30°C), la demanda agrícola (invernaderos) se dispara y entra en riesgo de supervivencia.
- Capacidad máxima del datacenter: 50MW.

INSTRUCCIONES MULTIAGENTE:
Debes simular el razonamiento interno de 3 agentes específicos y tomar una decisión final orquestada:
1. Agente Distribuidor: Analiza el mes y la temperatura para decidir el reparto % entre uso Urbano y uso Agrícola. Si hace mucho calor, prioriza supervivencia agrícola.
2. Agente Alerta: Evalúa si hay riesgo de desabastecimiento o picos de calor extremos y emite un mensaje corto (máx 15 palabras). Si todo está bien, emite un estado "Nominal".
3. Agente ROI: Calcula el beneficio económico y energético del bucle de absorción (mensaje corto, máx 15 palabras).

FORMATO DE SALIDA ESTRICTO:
Debes responder ÚNICAMENTE con un objeto JSON válido, sin Markdown, sin explicaciones previas ni posteriores, usando exactamente esta estructura:

{
  "metricas_tecnicas": {
    "agua_generada_litros": [entero, calculado según la carga del DC],
    "ahorro_refrigeracion_kw": [entero, calculado según el ciclo de absorción]
  },
  "distribucion": {
    "urbana_porcentaje": [entero de 0 a 100],
    "agricola_porcentaje": [entero de 0 a 100]
  },
  "mensajes_agentes": {
    "agente_distribuidor": "[Breve justificación de por qué se ha elegido ese reparto %]",
    "agente_alerta": "[Mensaje de alerta o estado Nominal]",
    "agente_roi": "[Mensaje sobre el ahorro energético]"
  }
}"""


class SeaCoolService:
    """
    Servicio del Orquestador Multiagente SeaCool AI.
    Combina cálculos deterministas (física) con razonamiento IA (agentes).
    """

    async def simulate(
        self,
        temp_ext: float,
        carga_dc: float,
        mes: str,
    ) -> Dict[str, Any]:
        """
        Ejecuta la simulación completa del sistema SeaCool.

        1. Calcula métricas técnicas deterministamente.
        2. Calcula distribución base como guía.
        3. Envía todo al LLM para orquestación multiagente.
        4. Si el LLM no responde, usa fallback determinista.

        Args:
            temp_ext: Temperatura exterior (°C).
            carga_dc: Carga del datacenter (0-100%).
            mes: Mes actual en español.

        Returns:
            Objeto JSON con la respuesta del orquestador.
        """
        # Paso 1: Cálculos deterministas
        metricas = calcular_metricas_tecnicas(carga_dc)
        distribucion = calcular_distribucion_base(temp_ext, mes)
        alerta = evaluar_alerta(temp_ext, carga_dc, metricas["agua_generada_litros"])

        # Paso 2: Intentar orquestación con IA
        try:
            resultado_ia = await self._orquestar_con_ia(
                temp_ext, carga_dc, mes, metricas
            )
            if resultado_ia:
                return resultado_ia
        except Exception as e:
            print(f"⚠️ SeaCool: Error en orquestación IA, usando fallback: {e}")

        # Paso 3: Fallback determinista (sin IA)
        return self._construir_fallback(
            metricas, distribucion, alerta, temp_ext, carga_dc
        )

    async def _orquestar_con_ia(
        self,
        temp_ext: float,
        carga_dc: float,
        mes: str,
        metricas: Dict[str, int],
    ) -> Optional[Dict[str, Any]]:
        """
        Envía los datos al LLM con el system prompt del orquestador
        y parsea la respuesta JSON.
        """
        user_prompt = (
            f"DATOS DE ENTRADA (Simulación actual):\n"
            f"- Temperatura exterior: {temp_ext}°C\n"
            f"- Carga del Datacenter: {carga_dc}% (Capacidad máx: {DATACENTER_MAX_MW}MW)\n"
            f"- Mes actual: {mes}\n\n"
            f"DATOS PRE-CALCULADOS (referencia, puedes ajustar si razonas mejor):\n"
            f"- Agua generada estimada: {metricas['agua_generada_litros']} litros/día\n"
            f"- Ahorro refrigeración estimado: {metricas['ahorro_refrigeracion_kw']} kW\n\n"
            f"Ejecuta la simulación multiagente y responde con el JSON."
        )

        response = await ai_service.chat(
            messages=[
                {"role": "system", "content": SEACOOL_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.3,
            max_tokens=1000,
        )

        # Intentar parsear la respuesta como JSON
        return self._parsear_respuesta_ia(response)

    def _parsear_respuesta_ia(self, response: str) -> Optional[Dict[str, Any]]:
        """
        Intenta extraer un JSON válido de la respuesta del LLM.
        Maneja markdown code blocks y texto extra.
        """
        if not response:
            return None

        # Limpiar posibles markdown code blocks
        cleaned = response.strip()
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
        cleaned = cleaned.strip()

        try:
            parsed = json.loads(cleaned)
            # Validar estructura mínima
            if all(
                k in parsed
                for k in ["metricas_tecnicas", "distribucion", "mensajes_agentes"]
            ):
                return parsed
        except json.JSONDecodeError:
            # Intentar encontrar JSON dentro del texto
            match = re.search(r"\{[\s\S]*\}", cleaned)
            if match:
                try:
                    parsed = json.loads(match.group())
                    if all(
                        k in parsed
                        for k in [
                            "metricas_tecnicas",
                            "distribucion",
                            "mensajes_agentes",
                        ]
                    ):
                        return parsed
                except json.JSONDecodeError:
                    pass

        return None

    def _construir_fallback(
        self,
        metricas: Dict[str, int],
        distribucion: Dict[str, int],
        alerta: str,
        temp_ext: float,
        carga_dc: float,
    ) -> Dict[str, Any]:
        """
        Construye la respuesta determinista cuando el LLM no está disponible.
        """
        # Generar mensajes de agentes deterministas
        if temp_ext > 35:
            msg_distribuidor = (
                f"Calor extremo ({temp_ext}°C): prioridad máxima a supervivencia agrícola."
            )
        elif temp_ext > 30:
            msg_distribuidor = (
                f"Temperatura alta ({temp_ext}°C): se incrementa riego agrícola."
            )
        else:
            msg_distribuidor = (
                f"Condiciones moderadas ({temp_ext}°C): reparto equilibrado."
            )

        msg_roi = (
            f"Ahorro de {metricas['ahorro_refrigeracion_kw']} kW "
            f"por absorción al {carga_dc}% de carga."
        )

        return {
            "metricas_tecnicas": metricas,
            "distribucion": distribucion,
            "mensajes_agentes": {
                "agente_distribuidor": msg_distribuidor,
                "agente_alerta": alerta,
                "agente_roi": msg_roi,
            },
        }


# Instancia singleton
seacool_service = SeaCoolService()
