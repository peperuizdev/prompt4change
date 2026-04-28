"""
Conectores a APIs externas para datos reales.
Consume Open-Meteo, WRI Aqueduct, Copernicus y otras fuentes
para alimentar dinámicamente el sistema SeaCool AI.
"""

import aiohttp
import asyncio
from typing import Dict, Optional, Any
from datetime import datetime, timedelta
import json

# ============================================================================
# 1. Open-Meteo API — Clima en tiempo real (GRATIS, sin API key)
# ============================================================================


class OpenMeteoConnector:
    """
    Obtiene datos de clima: temperatura, lluvia, evaporación del suelo.
    API gratuita: https://open-meteo.com/
    """

    BASE_URL = "https://api.open-meteo.com/v1/forecast"

    @staticmethod
    async def get_climate_data(
        latitude: float, longitude: float, days_back: int = 30
    ) -> Dict[str, Any]:
        """
        Obtiene datos de clima actuales y históricos.

        Args:
            latitude: Latitud (ej: 36.7 para Almería).
            longitude: Longitud (ej: -2.5 para Almería).
            days_back: Días históricos a recuperar (máx 90).

        Returns:
            {
                "current_temp": 28.5,
                "current_rain": 0.2,
                "soil_moisture": 35.2,
                "total_rain_30d": 15.3,
                "avg_temp_30d": 24.8,
                "heat_stress": "moderate"  # low, moderate, high, critical
            }
        """
        params = {
            "latitude": latitude,
            "longitude": longitude,
            "current": "temperature_2m,relative_humidity_2m,weather_code,rain",
            "daily": "temperature_2m_max,temperature_2m_min,rain_sum,soil_moisture_0_to_10cm",
            "past_days": min(days_back, 90),
            "timezone": "Europe/Madrid",
        }

        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    OpenMeteoConnector.BASE_URL, params=params, timeout=aiohttp.ClientTimeout(10)
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        return OpenMeteoConnector._parse_climate_data(data)
                    else:
                        print(f"⚠️ Open-Meteo: HTTP {resp.status}")
                        return None
        except Exception as e:
            print(f"⚠️ Open-Meteo error: {e}")
            return None

    @staticmethod
    def _parse_climate_data(raw_data: Dict) -> Dict[str, Any]:
        """Parsea respuesta de Open-Meteo."""
        try:
            current = raw_data.get("current", {})
            daily = raw_data.get("daily", {})

            current_temp = current.get("temperature_2m", 0)
            current_rain = current.get("rain", 0)
            soil_moisture = current.get("relative_humidity_2m", 0)  # Proxy

            # Histórico
            rain_sums = daily.get("rain_sum", [])
            total_rain_30d = sum(rain_sums[-30:]) if rain_sums else 0

            temps_max = daily.get("temperature_2m_max", [])
            avg_temp_30d = sum(temps_max[-30:]) / len(temps_max[-30:]) if temps_max else 0

            # Evaluación de estrés de calor
            if current_temp > 40:
                heat_stress = "critical"
            elif current_temp > 35:
                heat_stress = "high"
            elif current_temp > 25:
                heat_stress = "moderate"
            else:
                heat_stress = "low"

            return {
                "current_temp": round(current_temp, 1),
                "current_rain": round(current_rain, 1),
                "soil_moisture": round(soil_moisture, 1),
                "total_rain_30d": round(total_rain_30d, 1),
                "avg_temp_30d": round(avg_temp_30d, 1),
                "heat_stress": heat_stress,
            }
        except Exception as e:
            print(f"⚠️ Parse error: {e}")
            return None


# ============================================================================
# 2. WRI Aqueduct — Estrés Hídrico Global (requiere API key, pero tenemos CSV público)
# ============================================================================


class WRIAqueductConnector:
    """
    Accede a datos de estrés hídrico del WRI Aqueduct.
    Puede usar datos precargados o API directa (https://www.wri.org/applications/aqueduct/).

    Para demostración, usamos valores predefinidos por región.
    En producción, consumirías la API directa.
    """

    # Datos de referencia: regiones de España (simulado)
    REGIONS_WATER_STRESS = {
        "almeria": {
            "water_stress_index": 4.2,  # 0-5 escala
            "groundwater_depletion": "high",
            "drought_severity": "critical",
            "aquifer_depletion_rate_km3_per_year": 0.35,
        },
        "zaragoza": {
            "water_stress_index": 3.8,
            "groundwater_depletion": "high",
            "drought_severity": "severe",
            "aquifer_depletion_rate_km3_per_year": 0.28,
        },
        "murcia": {
            "water_stress_index": 3.5,
            "groundwater_depletion": "medium",
            "drought_severity": "moderate",
            "aquifer_depletion_rate_km3_per_year": 0.15,
        },
    }

    @staticmethod
    async def get_water_stress(region: str = "almeria") -> Dict[str, Any]:
        """
        Obtiene índice de estrés hídrico para una región.

        Args:
            region: Nombre de región (almeria, zaragoza, murcia, etc).

        Returns:
            {
                "water_stress_index": 4.2,  # 0-5
                "groundwater_depletion": "high",
                "drought_severity": "critical",
                "urgency_score": 95  # 0-100
            }
        """
        region_lower = region.lower().strip()
        data = WRIAqueductConnector.REGIONS_WATER_STRESS.get(region_lower, {})

        if not data:
            print(f"⚠️ Región no encontrada: {region}. Usando valores por defecto.")
            data = WRIAqueductConnector.REGIONS_WATER_STRESS["almeria"]

        # Calcular urgencia
        stress_index = data.get("water_stress_index", 0)
        urgency = min(100, int(stress_index * 20))  # 0-5 → 0-100

        return {
            "region": region_lower,
            "water_stress_index": stress_index,
            "groundwater_depletion": data.get("groundwater_depletion"),
            "drought_severity": data.get("drought_severity"),
            "urgency_score": urgency,
        }


# ============================================================================
# 3. Electricity Maps API — Limpieza de energía (requiere API key gratuita)
# ============================================================================


class ElectricityMapsConnector:
    """
    Obtiene datos de carbono y limpieza de la red eléctrica en tiempo real.
    API: https://api.electricitymap.org/ (requiere free API key).
    """

    BASE_URL = "https://api.electricitymap.org/v3/carbon-intensity/latest"

    @staticmethod
    async def get_grid_carbon_intensity(
        latitude: float, longitude: float, api_key: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Obtiene intensidad de carbono de la red eléctrica local.

        Args:
            latitude: Latitud.
            longitude: Longitud.
            api_key: Token de Electricity Maps (opcional en demo).

        Returns:
            {
                "carbon_intensity": 150,  # gCO2/kWh
                "fossil_percentage": 45,
                "renewable_percentage": 55,
                "grid_status": "clean" o "dirty"
            }
        """
        # Para demo, retornamos datos simulados
        # En producción, reemplazar con llamada HTTP real
        
        # Simulación: Andalucía tiene ~50% renovables
        fossil_pct = 45
        renewable_pct = 55
        carbon_intensity = int((fossil_pct / 100) * 300)  # Escala 0-300

        return {
            "carbon_intensity": carbon_intensity,
            "fossil_percentage": fossil_pct,
            "renewable_percentage": renewable_pct,
            "grid_status": "clean" if renewable_pct > 50 else "dirty",
        }


# ============================================================================
# 4. Simulador de Datacenters (usando ubicaciones reales)
# ============================================================================


class DatacenterConnector:
    """
    Base de datos simplificada de datacenters en España.
    En producción, consumirías PeeringDB o Datacenters.com API.
    """

    DATACENTERS = {
        "google_almeria": {
            "name": "Google Cloud (Almería)",
            "lat": 36.7,
            "lon": -2.5,
            "capacity_mw": 50,
            "operator": "Google",
            "distance_to_coast_km": 45,
        },
        "telefonica_madrid": {
            "name": "Telefónica (Madrid)",
            "lat": 40.4,
            "lon": -3.7,
            "capacity_mw": 35,
            "operator": "Telefónica",
            "distance_to_coast_km": 300,
        },
        "telefonica_barcelona": {
            "name": "Telefónica (Barcelona)",
            "lat": 41.3,
            "lon": 2.1,
            "capacity_mw": 40,
            "operator": "Telefónica",
            "distance_to_coast_km": 5,
        },
    }

    @staticmethod
    async def find_nearest_datacenter(
        latitude: float, longitude: float, max_distance_km: float = 200
    ) -> Optional[Dict[str, Any]]:
        """
        Encuentra el datacenter más cercano a unas coordenadas.

        Args:
            latitude: Latitud.
            longitude: Longitud.
            max_distance_km: Distancia máxima a considerar.

        Returns:
            Info del datacenter más cercano o None.
        """
        from geopy.distance import geodesic

        nearest = None
        min_distance = max_distance_km

        for dc_key, dc_data in DatacenterConnector.DATACENTERS.items():
            dist = geodesic((latitude, longitude), (dc_data["lat"], dc_data["lon"])).km

            if dist < min_distance:
                nearest = dc_data.copy()
                nearest["distance_km"] = round(dist, 1)
                min_distance = dist

        return nearest


# ============================================================================
# 5. Copernicus Connector (simulado - en producción sería API real)
# ============================================================================


class CopernicusConnector:
    """
    Datos satelitales de la UE sobre humedad del suelo,
    temperatura del mar, etc.
    Aquí simulamos; en producción: https://www.copernicus.eu/
    """

    @staticmethod
    async def get_soil_and_sea_data(
        latitude: float, longitude: float
    ) -> Dict[str, Any]:
        """
        Obtiene datos satelitales de humedad del suelo y temperatura del mar.

        Returns:
            {
                "soil_moisture_index": 35,  # 0-100%
                "sea_surface_temp": 18.2,  # °C
                "vegetation_index": 0.65,  # NDVI 0-1
                "sea_anomaly": -1.5  # °C respecto a media
            }
        """
        # Simulación: costa mediterránea (baja humedad)
        return {
            "soil_moisture_index": 32,  # Almería tiene muy baja humedad
            "sea_surface_temp": 18.5,
            "vegetation_index": 0.55,  # Índice de vegetación
            "sea_anomaly": -0.8,
        }


# ============================================================================
# Agregador: Obtener todos los datos de contexto
# ============================================================================


class RealWorldContextAggregator:
    """
    Orquesta todos los conectores para construir un contexto completo
    sobre clima, agua, energía y datacenters.
    """

    @staticmethod
    async def gather_full_context(
        latitude: float = 36.7,
        longitude: float = -2.5,
        region: str = "almeria",
        api_keys: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        """
        Reúne datos de todas las fuentes.

        Args:
            latitude: Coordenada Y (Almería por defecto).
            longitude: Coordenada X.
            region: Región (almeria, zaragoza, etc).
            api_keys: Dict con claves opcionales (electricity_maps, etc).

        Returns:
            Contexto completo para la evaluación de escenarios.
        """
        # Ejecutar todas las consultas en paralelo
        climate_data, water_stress, grid_carbon, datacenter, soil_sea = await asyncio.gather(
            OpenMeteoConnector.get_climate_data(latitude, longitude),
            WRIAqueductConnector.get_water_stress(region),
            ElectricityMapsConnector.get_grid_carbon_intensity(latitude, longitude),
            DatacenterConnector.find_nearest_datacenter(latitude, longitude),
            CopernicusConnector.get_soil_and_sea_data(latitude, longitude),
            return_exceptions=True,
        )

        return {
            "timestamp": datetime.now().isoformat(),
            "location": {"latitude": latitude, "longitude": longitude, "region": region},
            "climate": climate_data or {},
            "water_stress": water_stress or {},
            "grid_carbon": grid_carbon or {},
            "nearest_datacenter": datacenter or {},
            "soil_and_sea": soil_sea or {},
        }
