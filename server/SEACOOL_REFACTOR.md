# SeaCool AI — Refactor Dinámico con APIs Reales

## 🎯 Cambios Principales

El sistema ha sido refactorizado de un modelo **determinístico mockeado** a un sistema **dinámico e inteligente** que:

1. **Consume APIs reales** en tiempo real:
   - 🌍 Open-Meteo: Clima, lluvia, evaporación
   - 💧 WRI Aqueduct: Estrés hídrico global
   - ⚡ Electricity Maps: Limpieza de energía de la red
   - 🖥️ PeeringDB/Datacenters.com: Ubicación de datacenters
   - 🛰️ Copernicus: Datos satelitales EU

2. **Genera múltiples escenarios** con IA:
   - Escenario A: Prioridad Agua (80% agua, 20% calefacción)
   - Escenario B: Prioridad Calefacción (30% agua, 70% calefacción)
   - Escenario C: Híbrido Inteligente (50% agua, 50% calefacción)

3. **Evalúa cada escenario** con puntuación de impacto social (0-100)

---

## 📡 Nuevos Endpoints

### POST `/api/v1/seacool/evaluate-scenarios`

Evalúa 3 escenarios dinámicos basados en contexto real.

**Request:**
```json
{
  "dc_power_mw": 50,
  "latitude": 36.7,
  "longitude": -2.5,
  "region": "almeria",
  "mes": "julio",
  "carga_dc_pct": 75
}
```

**Response:**
```json
{
  "status": "success",
  "escenarios": [
    {
      "nombre": "💧 Emergencia Hídrica",
      "agua_pct": 80,
      "calefaccion_pct": 20,
      "agua_litros_dia": 600000,
      "hectareas_regadas": 1200,
      "hogares_calentados": 50,
      "score_social": 95,
      "justificacion": "Alta sequía actual, el agua es crítica.",
      "recomendacion_ia": false
    },
    {
      "nombre": "🔥 Eficiencia Térmica",
      "agua_pct": 30,
      "calefaccion_pct": 70,
      "agua_litros_dia": 225000,
      "hectareas_regadas": 450,
      "hogares_calentados": 350,
      "score_social": 40,
      "justificacion": "No recomendado por estrés hídrico de Almería.",
      "recomendacion_ia": false
    },
    {
      "nombre": "⚖️ Híbrido Inteligente",
      "agua_pct": 50,
      "calefaccion_pct": 50,
      "agua_litros_dia": 412500,
      "hectareas_regadas": 825,
      "hogares_calentados": 200,
      "score_social": 85,
      "justificacion": "Equilibra ambas necesidades según contexto.",
      "recomendacion_ia": true
    }
  ],
  "recomendacion_final": "⚖️ Híbrido Inteligente",
  "razon_recomendacion": "Basado en estrés hídrico moderado y temperatura actual.",
  "contexto_usado": {
    "clima": {
      "temperatura": 32.5,
      "lluvia_30d": 15.3,
      "estres_hidrico": 4.2
    },
    "datacenter": {
      "potencia_mw": 37.5,
      "agua_dia": 562500,
      "hogares_capacidad": 1250
    },
    "timestamp": "2026-04-28T14:32:15.123456"
  }
}
```

### POST `/api/v1/seacool/simulate-with-context`

Versión mejorada del `/simulate` que integra contexto real antes de ejecutar.

(Mismo formato que `/simulate` pero con datos enriquecidos internamente)

---

## 🏗️ Arquitectura Nueva

```
Frontend (React) 
  ↓
  └─→ POST /api/v1/seacool/evaluate-scenarios (solo si se desea en UI)
       ↓
       Backend SeaCool
       ├─ RealWorldContextAggregator (orquesta APIs en paralelo)
       │  ├─ OpenMeteoConnector (clima)
       │  ├─ WRIAqueductConnector (agua)
       │  ├─ ElectricityMapsConnector (energía)
       │  ├─ DatacenterConnector (infraestructura)
       │  └─ CopernicusConnector (satélites)
       │
       ├─ ScenarioEvaluator
       │  ├─ Genera 3 escenarios
       │  ├─ Llama a Gemini/Groq con contexto real
       │  └─ Retorna scores + recomendación
       │
       └─ SeaCoolAgent (orquestador multiagente)
          ├─ Agente Distribuidor
          ├─ Agente Alerta
          └─ Agente ROI
```

---

## 🔧 Configuración

### Variables de Entorno (.env)

```bash
# Google Gemini (recomendado)
GOOGLE_API_KEY=your-key-here

# O Groq (alternativa rápida)
GROQ_API_KEY=your-key-here

# O OpenAI
OPENAI_API_KEY=sk-...
```

El sistema detecta automáticamente cuál está configurado.

---

## 📊 Flujo de Datos Real

1. **Usuario solicita evaluación**:
   ```bash
   curl -X POST http://localhost:8000/api/v1/seacool/evaluate-scenarios \
     -H "Content-Type: application/json" \
     -d '{
       "dc_power_mw": 50,
       "latitude": 36.7,
       "longitude": -2.5,
       "region": "almeria",
       "mes": "julio",
       "carga_dc_pct": 75
     }'
   ```

2. **Backend ejecuta en paralelo**:
   - `open-meteo.com`: Obtiene clima actual (Almería)
   - `wri.org/aqueduct`: Obtiene estrés hídrico
   - `api.electricitymap.org`: Obtiene carbono de la red
   - `geopy`: Busca datacenters cercanos
   - `copernicus.eu`: Obtiene humedad del suelo

3. **Agrega datos**:
   ```python
   context = {
     "climate": {"temp": 32.5, "rain_30d": 15.3, ...},
     "water_stress": {"index": 4.2, "severity": "critical", ...},
     "grid_carbon": {"intensity": 150, "renewable": 55%, ...},
     "datacenter": {"name": "Google Cloud Almería", "distance": 45km, ...},
     ...
   }
   ```

4. **Llama a Gemini/Groq**:
   - Envía contexto + prompt especializado
   - LLM genera 3 escenarios con justificaciones
   - Calcula scores de impacto social dinámicamente

5. **Retorna respuesta enriquecida**:
   ```json
   {
     "escenarios": [...],
     "recomendacion_final": "...",
     "contexto_usado": {...}
   }
   ```

---

## 🧪 Pruebas Locales

```bash
# Terminal 1: Backend
cd server
pip install -r requirements.txt
source venv/bin/activate
uvicorn main:app --reload

# Terminal 2: Test de conectores
python test_seacool_refactor.py

# Terminal 3: Prueba de endpoints
curl -X POST http://localhost:8000/api/v1/seacool/evaluate-scenarios \
  -H "Content-Type: application/json" \
  -d '{"dc_power_mw": 50, "latitude": 36.7, "longitude": -2.5, "region": "almeria"}'
```

---

## 🎯 Ventajas del Nuevo Sistema

| Aspecto | Antes | Ahora |
|---------|-------|-------|
| **Datos** | Mockeados, estáticos | APIs reales, dinámicos |
| **Escenarios** | Uno solo | 3 opciones evaluadas |
| **Inteligencia** | Reglas simple | IA (Gemini/Groq) |
| **Contexto** | Ignorado | Completo (clima, agua, energía, DC) |
| **Adaptabilidad** | Fija | Responde a cambios reales |
| **Impacto Social** | No evaluado | Scored 0-100 por contexto |

---

## 📝 Notas Técnicas

- **Fallback determinista**: Si la IA falla, el sistema retorna escenarios predeterminados
- **Parallel fetching**: Todas las APIs se consultan en paralelo con `asyncio.gather()`
- **Error resilience**: Cada conector falla "soft" (retorna None, continúa)
- **Tipos tipados**: Uso de Pydantic para validación de request/response
- **Geolocalización**: Usa `geopy` para calcular distancias a datacenters reales

---

## 🚀 Próximos Pasos (Opcional)

1. Agregar autenticación a APIs (OAuth2, API keys)
2. Cachear resultados de APIs (Redis) para evitar rate limits
3. Integrar WebSocket para actualizaciones en tiempo real
4. Agregar frontend visual de comparación de escenarios
5. Integrar con IoT real de datacenters

---

**Generado**: 2026-04-28  
**Sistema**: SeaCool AI — Prompt4Change Hackathon
