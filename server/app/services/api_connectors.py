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
    Clima en tiempo real + histórico 30 días.
    API gratuita sin clave: https://open-meteo.com/
    """

    BASE_URL  = "https://api.open-meteo.com/v1/forecast"
    ERA5_URL  = "https://archive-api.open-meteo.com/v1/era5"

    @staticmethod
    async def get_climate_data(
        latitude: float, longitude: float, days_back: int = 30
    ) -> Dict[str, Any]:
        """
        Datos meteorológicos reales: temperatura actual, lluvia 30d, humedad del suelo.
        El campo soil_moisture usa la media diaria real de Open-Meteo (m³/m³ → %).
        """
        params = {
            "latitude":  latitude,
            "longitude": longitude,
            "current":   "temperature_2m,rain,soil_moisture_0_to_10cm",
            "daily":     "temperature_2m_max,temperature_2m_min,rain_sum,soil_moisture_0_to_10cm_mean",
            "past_days": min(days_back, 90),
            "timezone":  "auto",
        }

        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    OpenMeteoConnector.BASE_URL,
                    params=params,
                    timeout=aiohttp.ClientTimeout(total=10),
                ) as resp:
                    if resp.status == 200:
                        return OpenMeteoConnector._parse(await resp.json())
                    print(f"⚠️ Open-Meteo forecast: HTTP {resp.status}")
        except Exception as e:
            print(f"⚠️ Open-Meteo forecast error: {e}")
        return None

    @staticmethod
    async def get_sea_surface_temp(latitude: float, longitude: float) -> Optional[float]:
        """
        Temperatura superficial del mar desde el reanálisis ERA5 de ECMWF.
        API gratuita, sin clave. Datos con ~5 días de lag.
        Devuelve None si las coordenadas son tierra adentro (ERA5 devuelve NaN).
        """
        from datetime import date
        end   = date.today()
        start = end - timedelta(days=7)
        params = {
            "latitude":   latitude,
            "longitude":  longitude,
            "hourly":     "sea_surface_temperature",
            "start_date": start.isoformat(),
            "end_date":   end.isoformat(),
            "timezone":   "auto",
        }
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    OpenMeteoConnector.ERA5_URL,
                    params=params,
                    timeout=aiohttp.ClientTimeout(total=12),
                ) as resp:
                    if resp.status != 200:
                        return None
                    data   = await resp.json()
                    values = [
                        v for v in data.get("hourly", {}).get("sea_surface_temperature", [])
                        if v is not None and v > -999
                    ]
                    if not values:
                        return None
                    return round(sum(values[-48:]) / len(values[-48:]), 1)
        except Exception as e:
            print(f"⚠️ ERA5 SST error: {e}")
            return None

    @staticmethod
    def _parse(raw: Dict) -> Dict[str, Any]:
        current = raw.get("current", {})
        daily   = raw.get("daily", {})

        current_temp = current.get("temperature_2m", 0)
        current_rain = current.get("rain", 0)

        # Humedad del suelo real (m³/m³ → %, tomamos el valor actual o la media diaria reciente)
        sm_current = current.get("soil_moisture_0_to_10cm")
        sm_daily   = daily.get("soil_moisture_0_to_10cm_mean", [])
        sm_val     = sm_current if sm_current is not None else (sm_daily[-1] if sm_daily else None)
        # ERA5/Open-Meteo devuelve m³/m³ (0-0.6 típico) → convertir a % (×100)
        soil_pct   = round(sm_val * 100, 1) if sm_val is not None else None

        rain_sums  = daily.get("rain_sum", [])
        total_rain = round(sum(r for r in rain_sums[-30:] if r), 1) if rain_sums else 0

        temps_max  = [t for t in daily.get("temperature_2m_max", []) if t is not None]
        avg_temp   = round(sum(temps_max[-30:]) / len(temps_max[-30:]), 1) if temps_max else 0

        heat_stress = (
            "critical" if current_temp > 40 else
            "high"     if current_temp > 35 else
            "moderate" if current_temp > 25 else
            "low"
        )

        return {
            "current_temp":    round(current_temp, 1),
            "current_rain":    round(current_rain, 1),
            "soil_moisture":   soil_pct,
            "total_rain_30d":  total_rain,
            "avg_temp_30d":    avg_temp,
            "heat_stress":     heat_stress,
        }


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
    Intensidad de carbono de la red eléctrica por país.
    Fuente: IEA Electricity 2023 / Our World in Data (gCO₂/kWh).
    En producción, reemplazar con llamada real a api.electricitymap.org.
    """

    # gCO₂/kWh por código ISO-2 — datos IEA 2023
    _CARBON_BY_COUNTRY: Dict[str, int] = {
        # Europa baja en carbono
        "NO": 26,  "SE": 42,  "FR": 60,  "CH": 40,  "AT": 120,
        "IS": 28,  "AL": 90,
        # Europa media
        "ES": 180, "PT": 140, "DK": 140, "BE": 130, "GB": 180,
        "IE": 320, "IT": 280, "HR": 200, "SI": 240,
        # Europa alta en carbono
        "DE": 380, "NL": 320, "FI": 120, "HU": 260, "SK": 160,
        "CZ": 430, "PL": 680, "BG": 480, "RO": 320, "GR": 350,
        "RS": 580, "BA": 620, "MK": 640,
        # Mediterráneo / Norte África
        "MA": 520, "DZ": 550, "TN": 530, "LY": 600, "EG": 500,
        "TR": 400, "IL": 420, "LB": 620, "JO": 480, "SY": 580,
        # Oriente Medio / Golfo
        "SA": 550, "AE": 450, "QA": 500, "KW": 560, "BH": 520,
        "OM": 480, "IQ": 590, "IR": 520, "YE": 610,
        # Asia
        "IN": 700, "PK": 450, "BD": 580, "LK": 450, "CN": 580,
        "JP": 450, "KR": 420, "TH": 490, "VN": 520, "PH": 530,
        "ID": 650, "MM": 580,
        # Resto del mundo
        "US": 380, "CA": 130, "MX": 420, "BR": 90,  "AR": 310,
        "AU": 520, "ZA": 720, "NG": 540, "GH": 380,
    }

    # Intensidad → fracción renovable aproximada (inversa lineal simple)
    @staticmethod
    def _renewable_pct(carbon_g: int) -> int:
        """Estima % renovables a partir de la intensidad de carbono."""
        # 0 gCO₂ → 100% renovable; 700 gCO₂ → ~5% renovable
        return max(5, min(95, int(100 - carbon_g / 7.5)))

    @staticmethod
    async def get_grid_carbon_intensity(
        latitude: float,
        longitude: float,
        country_code: str = "",
        api_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Intensidad de carbono de la red eléctrica.

        Prioridad:
          1. Electricity Maps API (tiempo real) si hay ELECTRICITY_MAPS_API_KEY en .env
          2. Tabla IEA 2023 por código de país ISO-2
          3. Estimación por latitud
        """
        from app.core.config import settings

        actual_key = api_key or getattr(settings, "ELECTRICITY_MAPS_API_KEY", "")

        # ── Intento 1: API en tiempo real ────────────────────────────────────
        if actual_key:
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.get(
                        "https://api.electricitymaps.com/v3/carbon-intensity/latest",
                        headers={"auth-token": actual_key},
                        params={"lat": latitude, "lon": longitude},
                        timeout=aiohttp.ClientTimeout(total=8),
                    ) as resp:
                        if resp.status == 200:
                            data   = await resp.json()
                            ci     = data.get("carbonIntensity")
                            zone   = data.get("zone", "")
                            if ci is not None:
                                ci    = int(ci)
                                renew = ElectricityMapsConnector._renewable_pct(ci)
                                return {
                                    "carbon_intensity":    ci,
                                    "fossil_percentage":   100 - renew,
                                    "renewable_percentage": renew,
                                    "grid_status":         "clean" if renew >= 50 else "dirty",
                                    "source":              f"Electricity Maps (tiempo real, zona {zone})",
                                }
                        else:
                            print(f"⚠️ Electricity Maps API: HTTP {resp.status}")
            except Exception as e:
                print(f"⚠️ Electricity Maps API error: {e}")

        # ── Intento 2: tabla IEA 2023 por país ───────────────────────────────
        code   = country_code.upper().strip()
        carbon = ElectricityMapsConnector._CARBON_BY_COUNTRY.get(code)
        source = f"IEA 2023 ({code})" if carbon else None

        # ── Intento 3: estimación por latitud ────────────────────────────────
        if carbon is None:
            abs_lat = abs(latitude)
            carbon  = (120 if abs_lat > 55 else
                       320 if abs_lat > 40 else
                       480 if abs_lat > 25 else 500)
            source  = "estimado por latitud"

        renew = ElectricityMapsConnector._renewable_pct(carbon)
        return {
            "carbon_intensity":    carbon,
            "fossil_percentage":   100 - renew,
            "renewable_percentage": renew,
            "grid_status":         "clean" if renew >= 50 else "dirty",
            "source":              source,
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


def _season_factor(latitude: float, month: int) -> float:
    """
    Devuelve un factor estacional [-1, +1] para ajustar la temperatura del mar.
    +1 = verano local (máximo), -1 = invierno local (mínimo).
    """
    # Meses de verano en hemisferio norte: 6-8; sur: 12-2
    if latitude >= 0:
        summer_center = 7   # julio
    else:
        summer_center = 1   # enero (verano austral)

    delta = (month - summer_center) % 12
    if delta > 6:
        delta -= 12
    return round(-abs(delta) / 6 + 1, 2)   # 1.0 en verano, 0.0 en otoño/primavera, -1.0 en invierno


class CopernicusConnector:
    """
    Estimación de datos satelitales basada en latitud y mes.
    Fuente de referencia: Copernicus Marine Service climatología mediterránea.
    En producción: https://marine.copernicus.eu/ (CMEMS API).
    """

    # Temperatura superficial del mar por zona latitudinal (°C, media anual)
    # Ajustada con variación estacional ±4°C en verano/invierno
    _SST_BASE: list = [
        (70, 4),   # Ártico / Noruega norte
        (60, 8),   # Escandinavia / Mar del Norte
        (50, 13),  # Atlántico norte / Canal de la Mancha
        (40, 18),  # Mediterráneo / Atlántico centro
        (30, 23),  # Canarias / Golfo Pérsico norte
        (20, 27),  # Mar Rojo / Caribe norte
        (10, 28),  # Tropical
        (0,  29),  # Ecuador
    ]

    # Humedad del suelo por zona latitudinal (%)
    _SOIL_MOISTURE_BASE: list = [
        (70, 68),  # Boreal húmedo
        (60, 62),  # Templado frío
        (50, 52),  # Templado oceánico
        (40, 38),  # Mediterráneo / semiárido
        (30, 22),  # Árido / desértico
        (20, 35),  # Tropical seco
        (10, 58),  # Tropical húmedo
        (0,  65),  # Ecuador
    ]

    # NDVI (vegetación) por zona latitudinal
    _NDVI_BASE: list = [
        (70, 0.25), (60, 0.52), (50, 0.65), (40, 0.48),
        (30, 0.22), (20, 0.45), (10, 0.72), (0, 0.80),
    ]

    @staticmethod
    def _interp(table: list, abs_lat: float) -> float:
        """Interpola linealmente entre las franjas de latitud."""
        for i, (lat_ceil, val) in enumerate(table):
            if abs_lat >= lat_ceil:
                if i == 0:
                    return val
                lat_prev, val_prev = table[i - 1]
                frac = (abs_lat - lat_ceil) / (lat_prev - lat_ceil)
                return round(val + frac * (val_prev - val), 1)
        return table[-1][1]

    @staticmethod
    async def get_soil_and_sea_data(
        latitude: float, longitude: float
    ) -> Dict[str, Any]:
        """
        Temperatura del mar: ERA5/Open-Meteo (real, sin API key).
        Humedad del suelo + NDVI: estimados por latitud (climatología).

        La SST real afecta la eficiencia MED:
          - Agua más fría → mayor ΔT → más litros por MW térmico.
        """
        abs_lat = abs(latitude)

        # ── SST real desde ERA5 (Open-Meteo, gratis) ─────────────────────────
        sst_real = await OpenMeteoConnector.get_sea_surface_temp(latitude, longitude)
        sst_source = "ERA5/Open-Meteo (real)"

        if sst_real is None:
            # Fallback: interpolación por latitud + ajuste estacional
            sst_base     = CopernicusConnector._interp(CopernicusConnector._SST_BASE, abs_lat)
            season_off   = 3.5 * _season_factor(latitude, datetime.now().month)
            sst_real     = round(sst_base + season_off, 1)
            sst_source   = "estimado por latitud"

        # ── Suelo y vegetación: estimados por latitud (no hay API gratuita) ──
        soil = CopernicusConnector._interp(CopernicusConnector._SOIL_MOISTURE_BASE, abs_lat)
        ndvi = CopernicusConnector._interp(CopernicusConnector._NDVI_BASE, abs_lat)

        return {
            "soil_moisture_index": soil,
            "sea_surface_temp":    sst_real,
            "vegetation_index":    ndvi,
            "sea_anomaly":         0.0,
            "sst_source":          sst_source,
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
