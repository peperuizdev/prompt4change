# AquaLoop AI — Referencia de APIs y Estado del Frontend

> Documento de trabajo · Actualizado 2026-04-28

---

## Estado general

| Semáforo | Significado |
|---|---|
| ✅ | Conectado y funcionando |
| 🔶 | Endpoint listo, frontend NO lo usa todavía |
| ❌ | Datos hardcodeados / sin conexión real |

---

## 1. Endpoints que el frontend YA usa

### `GET /health`
**Quién lo llama:** `GlobalDashboard.jsx`  
**Para qué:** Muestra el badge "System Online / Offline" en la cabecera del dashboard.  
**Respuesta:**
```json
{ "status": "ok" }
```
**En el front:** Si `status === "ok"` → punto verde + "System Online".

---

### `POST /api/seacool/simulate`
**Quién lo llama:** `FarmerPortal.jsx`  
**Para qué:** El agricultor ajusta temperatura, carga del DC y mes → el sistema calcula el agua generada, la distribución urbana/agrícola y el razonamiento de los 3 agentes internos.  
**Body que envía el front:**
```json
{
  "temp_ext": 32.5,
  "carga_dc": 75,
  "mes": "julio"
}
```
**Respuesta:**
```json
{
  "metricas_tecnicas": {
    "agua_generada_litros": 562500,
    "ahorro_refrigeracion_kw": 5625
  },
  "distribucion": {
    "urbana_porcentaje": 30,
    "agricola_porcentaje": 70
  },
  "mensajes_agentes": {
    "agente_distribuidor": "Temperatura alta: prioridad agrícola.",
    "agente_alerta": "Nominal",
    "agente_roi": "Ahorro de 5625 kW por absorción."
  }
}
```
**En el front:** Muestra litros producidos, hogares, hectáreas, gráfica de distribución y reasoning de agentes. Si `agente_alerta` contiene "CRÍTICO" → `AlertBanner` rojo.

---

### `POST /api/seacool/evaluate-scenarios`
**Quién lo llama:** `ScenarioEvaluator.jsx`  
**Para qué:** El usuario selecciona ubicación del DC y potencia → el backend llama a Open-Meteo (clima real), combina con datos de estrés hídrico, y el LLM genera 3 escenarios de distribución (agua vs calefacción) con score social.  
**Body:**
```json
{
  "dc_power_mw": 50,
  "latitude": 36.7,
  "longitude": -2.5,
  "region": "almeria",
  "carga_dc_pct": 75
}
```
**Respuesta:**
```json
{
  "status": "success",
  "escenarios": [
    {
      "nombre": "💧 Emergencia Hídrica",
      "agua_pct": 80,
      "calefaccion_pct": 20,
      "agua_litros_dia": 450000,
      "hectareas_regadas": 900,
      "hogares_calentados": 2500,
      "score_social": 91,
      "justificacion": "Estrés hídrico crítico en verano...",
      "recomendacion_ia": false
    },
    { ... },
    { "nombre": "⚖️ Híbrido Inteligente", ..., "recomendacion_ia": true }
  ],
  "recomendacion_final": "⚖️ Híbrido Inteligente",
  "razon_recomendacion": "El contexto climático actual equilibra...",
  "contexto_usado": {
    "clima": { "temperatura": 28.5, "lluvia_30d": 4.2, "estres_hidrico": 4.2 },
    "datacenter": { "potencia_mw": 37.5, "agua_dia": 562500, "hogares_capacidad": 12500 }
  }
}
```
**En el front:** 3 tarjetas con barras de progreso. La tarjeta con `recomendacion_ia: true` tiene borde azul y badge "IA Recomienda". Barra de contexto climático real encima.

---

## 2. Nuevos endpoints AquaLoop — listos en backend, pendientes en frontend

Todos bajo el prefijo `/api/aqualoop/`. El front los usa mediante `apiFetch()`.

---

### `POST /api/aqualoop/chat`
**Para qué sirve:** El chatbot principal. El usuario escribe un problema real ("hay sequía severa", "el datacenter está al 90%"). El backend detecta automáticamente qué agentes son relevantes, los ejecuta en paralelo (sin LLM), y genera UNA respuesta contextualizada con datos reales.  
**Mantiene historial de sesión en memoria (hasta 2h de inactividad).**

**Body:**
```json
{
  "message": "Hay sequía severa en Almería, ¿cómo puedo aprovechar el calor del DC?",
  "session_id": "uuid-opcional",
  "latitude": 36.7,
  "longitude": -2.5,
  "region": "almeria",
  "dc_power_mw": 50,
  "carga_dc_pct": 75
}
```

**Respuesta:**
```json
{
  "session_id": "abc123",
  "reply": "Según datos de Open-Meteo, la temperatura actual es 31°C con solo 4mm de lluvia en 30 días. El estrés hídrico en Almería es 4.2/5 (crítico). Con 37.5 MW reales disponibles podrías generar 562.500 L/día priorizando desalinización.",
  "agents_used": ["WeatherAgent", "WaterAgent"],
  "charts_data": {
    "climate": { "current_temp": 31.0, "total_rain_30d": 4.2, "heat_stress": "high" },
    "water_stress": { "index": 4.2, "urgency": 84, "drought": "critical" }
  },
  "has_report": false
}
```

**Qué hace el front con esto:**
- Muestra `reply` como burbuja de chat del asistente
- Guarda `session_id` (localStorage) para las siguientes llamadas
- Con `charts_data` puede actualizar un panel lateral con los valores en tiempo real
- Si `has_report: true` → activa botón "Descargar Informe"

**Agentes que se activan automáticamente según palabras clave:**

| Si el usuario escribe... | Agentes que se llaman |
|---|---|
| sequía, agua, riego, acuífero | WeatherAgent + WaterAgent |
| energía, CO2, renovables, red | GridAgent |
| satélite, suelo, vegetación | CopernicusAgent |
| cualquier otra cosa | Los 4 agentes (análisis completo) |

---

### `POST /api/aqualoop/analyze`
**Para qué sirve:** Análisis completo. Lanza los 4 agentes en paralelo y con todos sus datos genera UN informe ejecutivo estructurado (1 sola llamada LLM). El informe queda guardado en la sesión para descarga posterior.  
**Llamar a este endpoint cuesta ~1700 tokens. Úsalo cuando el usuario pida "analizar" o quiera el informe completo.**

**Body:**
```json
{
  "session_id": "abc123",
  "latitude": 36.7,
  "longitude": -2.5,
  "region": "almeria",
  "dc_power_mw": 50,
  "carga_dc_pct": 75,
  "user_context": "El agricultor tiene 200 hectáreas en riesgo de pérdida"
}
```

**Respuesta:**
```json
{
  "session_id": "abc123",
  "report": {
    "titulo": "Análisis de Impacto Hídrico — Almería, Abril 2026",
    "resumen_ejecutivo": "La zona presenta estrés hídrico crítico (4.2/5) con temperaturas de 31°C y precipitaciones mínimas. El datacenter de 37.5 MW puede generar 562.500 L/día priorizando desalinización.",
    "hallazgos": [
      { "agente": "WeatherAgent", "hallazgo": "Temperatura 31°C con 4mm lluvia en 30 días", "severidad": "warning" },
      { "agente": "WaterAgent",   "hallazgo": "Estrés hídrico 4.2/5 — acuífero en agotamiento crítico", "severidad": "critical" },
      { "agente": "CopernicusAgent", "hallazgo": "Humedad del suelo 28% — NDVI 0.52 indica vegetación estresada", "severidad": "warning" },
      { "agente": "GridAgent",    "hallazgo": "Red 55% renovable — carbono 135 gCO2/kWh", "severidad": "info" }
    ],
    "escenarios": [
      {
        "nombre": "💧 Emergencia Hídrica",
        "agua_pct": 80, "calefaccion_pct": 20,
        "agua_litros_dia": 450000, "hectareas_regadas": 900, "hogares_calentados": 2500,
        "score_social": 91,
        "justificacion": "Sequía crítica prioriza supervivencia agrícola.",
        "recomendacion_ia": true
      },
      { "nombre": "🔥 Eficiencia Térmica", "score_social": 34, "recomendacion_ia": false, ... },
      { "nombre": "⚖️ Híbrido Inteligente", "score_social": 72, "recomendacion_ia": false, ... }
    ],
    "recomendacion_final": "💧 Emergencia Hídrica",
    "razon_recomendacion": "El estrés hídrico crítico y las altas temperaturas hacen prioritaria la producción de agua dulce.",
    "ods_impacto": [6, 2, 13],
    "metricas_clave": {
      "temperatura_actual": 31.0,
      "estres_hidrico": 4.2,
      "lluvia_30d": 4.2,
      "carbono_red_gco2kwh": 135,
      "potencia_real_mw": 37.5,
      "agua_max_litros_dia": 562500,
      "hogares_max": 12500
    }
  },
  "agents_results": {
    "weather":    { "source": "Open-Meteo API",             "real_data": true,  "data": { ... } },
    "water":      { "source": "WRI Aqueduct",               "real_data": true,  "data": { ... } },
    "copernicus": { "source": "Copernicus ESA (simulado)",  "real_data": false, "data": { ... } },
    "grid":       { "source": "Electricity Maps (simulado)","real_data": false, "data": { ... } }
  },
  "charts_data": {
    "climate":      { "current_temp": 31.0, "total_rain_30d": 4.2, "avg_temp_30d": 29.8, "heat_stress": "high" },
    "water_stress": { "index": 4.2, "urgency": 84, "drought": "critical", "groundwater": "high" },
    "grid":         { "carbon_intensity": 135, "renewable_pct": 55, "fossil_pct": 45, "status": "clean" },
    "soil":         { "moisture": 28, "sea_temp": 19.0, "ndvi": 0.52, "sea_anomaly": -0.5 },
    "escenarios":   [ { ... }, { ... }, { ... } ],
    "metricas_clave": { ... },
    "hallazgos":    [ { ... } ]
  }
}
```

**Qué hace el front con esto:**
- `report.resumen_ejecutivo` → mostrar en card de resumen
- `report.hallazgos` → lista de alertas por agente con chip de severidad
- `report.escenarios` → las 3 tarjetas de escenario (mismo componente que ScenarioEvaluator)
- `charts_data.climate` → gráfico de temperatura / lluvia (Recharts)
- `charts_data.water_stress.index` → gauge de estrés hídrico (0-5)
- `charts_data.grid` → gráfico de dona renovables vs fósiles
- `report.ods_impacto` → badges ODS impactados

---

### `GET /api/aqualoop/report/{session_id}`
**Para qué sirve:** Devuelve el informe guardado de la sesión. Úsalo para generar el PDF de descarga.  
**Respuesta:**
```json
{
  "session_id": "abc123",
  "report": { ... }  // mismo objeto que en /analyze
}
```
**Qué hace el front:** Llama a este endpoint al pulsar "Descargar Informe", pasa el objeto a jsPDF y genera el PDF (igual que ESGReports.jsx pero con datos reales del informe).

---

### `GET /api/aqualoop/history/{session_id}`
**Para qué sirve:** Recupera el historial de conversación de la sesión.  
**Respuesta:**
```json
{
  "session_id": "abc123",
  "history": [
    { "role": "user",      "content": "Hay sequía severa..." },
    { "role": "assistant", "content": "Según datos de Open-Meteo..." }
  ],
  "message_count": 4
}
```
**Qué hace el front:** Al cargar la página del chat, llama a este endpoint si tiene un `session_id` en localStorage para restaurar el historial visible.

---

### `DELETE /api/aqualoop/session/{session_id}`
**Para qué sirve:** Limpia la sesión y su historial (botón "Nueva conversación").  
**Respuesta:** `{ "message": "Sesión abc123 eliminada" }`

---

### `GET /api/aqualoop/agents/status`
**Para qué sirve:** Lista los 4 agentes, su fuente de datos y si son datos reales o simulados.  
**Respuesta:**
```json
{
  "agents": [
    { "id": "weather",    "name": "WeatherAgent",    "source": "Open-Meteo API",             "real_data": true,  "status": "active" },
    { "id": "water",      "name": "WaterAgent",      "source": "WRI Aqueduct",               "real_data": true,  "status": "active" },
    { "id": "copernicus", "name": "CopernicusAgent", "source": "Copernicus ESA (simulado)",  "real_data": false, "status": "active" },
    { "id": "grid",       "name": "GridAgent",       "source": "Electricity Maps (simulado)","real_data": false, "status": "active" }
  ]
}
```
**Qué hace el front:** Panel de estado de agentes en `AIAgentMonitor.jsx`. Chip verde para `real_data: true`, naranja para simulado.

---

## 3. Endpoints existentes que el frontend NO conecta (oportunidad)

| Endpoint | Estado | Oportunidad |
|---|---|---|
| `GET /api/seacool/metrics` | ✅ Existe | `GlobalDashboard.jsx` tiene las métricas hardcodeadas — conectarlas aquí |
| `GET /api/seacool/agents/status` | ✅ Existe | `AIAgentMonitor.jsx` tiene datos estáticos — conectar para polling real |
| `POST /api/seacool/chat` | ✅ Existe | Chat básico de SeaCool, reemplazado por `/api/aqualoop/chat` |
| `POST /api/ai/ods` | ✅ Existe | Análisis ODS, útil en `ESGReports.jsx` |

---

## 4. Resumen visual: qué página usa qué

```
GlobalDashboard.jsx  ──► GET /health                    ✅
                     ──► GET /api/seacool/metrics         ❌ (hardcoded)

FarmerPortal.jsx     ──► POST /api/seacool/simulate       ✅

ScenarioEvaluator.jsx──► POST /api/seacool/evaluate-scenarios ✅

AIAgentMonitor.jsx   ──► GET /api/aqualoop/agents/status  🔶 pendiente
                         (ahora datos estáticos)

ESGReports.jsx       ──► GET /api/seacool/metrics         🔶 pendiente
                         (ahora datos hardcoded)
                     ──► GET /api/aqualoop/report/{id}    🔶 pendiente (PDF real)

[POR CREAR]
AquaLoopChat.jsx     ──► POST /api/aqualoop/chat          🔶 componente pendiente
                     ──► POST /api/aqualoop/analyze        🔶 componente pendiente
                     ──► GET  /api/aqualoop/report/{id}   🔶 componente pendiente
                     ──► GET  /api/aqualoop/history/{id}  🔶 componente pendiente
                     ──► DELETE /api/aqualoop/session/{id}🔶 componente pendiente
```

---

## 5. Flujo de la demo (lo que el jurado ve)

```
1. Usuario abre /chat (AquaLoopChat.jsx)
   └─ Escribe: "En Almería hay sequía, tenemos un DC de 50MW al 75%"
      └─ Front: POST /api/aqualoop/chat
         └─ Backend: WeatherAgent (Open-Meteo REAL) + WaterAgent (WRI REAL)
            └─ LLM: responde con datos reales (Groq llama-3.3-70b)
               └─ Front: muestra respuesta + panel lateral con temperatura, estrés hídrico

2. Usuario pulsa "Generar Análisis Completo"
   └─ Front: POST /api/aqualoop/analyze
      └─ Backend: 4 agentes en paralelo → 1 LLM call → informe JSON
         └─ Front: muestra informe + 3 escenarios + gráficos Recharts

3. Usuario pulsa "Descargar Informe PDF"
   └─ Front: GET /api/aqualoop/report/{session_id}
      └─ Front: jsPDF genera PDF con los datos reales del informe
```

---

## 6. Notas técnicas

**Proveedor IA activo:** Groq · modelo `llama-3.3-70b-versatile` (gratuito)  
**Política de tokens:**
- `/chat` → ~350 tokens de output por respuesta
- `/analyze` → ~1500 tokens de output (informe completo)
- Historial: trimado a los últimos 6 mensajes para no acumular tokens

**Sesiones:** En memoria (no base de datos). TTL 2 horas. Se pierden al reiniciar el servidor.

**Datos reales vs simulados:**
- Open-Meteo: REAL, sin API key, gratuito
- WRI Aqueduct: datos regionales REALES (Almería, Zaragoza, Murcia)
- Copernicus: simulado con valores mediterráneos realistas
- Electricity Maps: simulado con mix España real (~55% renovables)

**CORS:** Configurado para `localhost:3000` y `localhost:5173`

**Arranque:**
```bash
# Backend
cd server && .venv/Scripts/python.exe -m uvicorn main:app --reload --port 8000

# Frontend  
cd client && npm run dev   # → http://localhost:5173
```
