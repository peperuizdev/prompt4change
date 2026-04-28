# 🧪 Guía de Prueba — Audit Chatbot Mockup

## Cómo probarlo

### Paso 1: Arrancar el frontend
```bash
cd client
npm run dev
# Abre http://localhost:5173
```

### Paso 2: Navegar al Auditor
En el sidebar izquierdo, haz clic en **"Solution Audit"** (nuevo botón con icono `fact_check`).

O navega directamente a: `http://localhost:5173/audit`

---

## Flujo de preguntas

El chatbot hace estas 5 preguntas en orden:

1. **¿Método de búsqueda?**
   - Código Postal (CP)
   - Dirección Completa
   - Municipio/Provincia

2. **¿Cuál es la ubicación?**
   - Input dinámico según método elegido
   - Ej: "04700" si elegiste CP

3. **¿Prioridad sectorial?**
   - 🌾 Agrícola (invernaderos)
   - 🏙️ Urbana (consumo humano)
   - ⚖️ Mixta (equilibrado)

4. **¿Estacionalidad crítica?**
   - Sí, estrés hídrico en verano (>35°C)
   - Sí, pero moderado
   - No, estable todo el año

5. **¿Escala del despliegue?**
   - 🧪 Piloto (1-5 ha)
   - 📈 Escala media (50-200 ha)
   - 🏗️ Despliegue completo (200+ ha)

---

## Lo que verás en el Informe

### Sección 1: Resumen Ejecutivo
- Ubicación introducida
- Prioridad elegida
- Escala seleccionada
- **Viabilidad** (calculada dinámicamente)

### Sección 2: Centros de Datos Cercanos
- **3 datacenters mockeados** por ubicación
- Puedes clickear cada uno para verlo resaltado
- Detalles: distancia, capacidad (MW), tecnología
- La recomendación técnica se actualiza según DC seleccionado

### Sección 3: Sizing y Dimensionamiento
**Valores varían según escala:**
| Métrica | Piloto | Media | Completo |
|---------|--------|-------|----------|
| Agua/día | 450-800 L | 5000-12000 L | 15000-35000 L |
| Área | 5-10 ha | 50-200 ha | 200-600 ha |
| CAPEX | 180K-280K € | 1.2M-2.8M € | 3.5M-8.5M € |
| Payback | 4-6 años | 3-5 años | 2-4 años |

### Sección 4: ODS Conectados
**Dinámico según prioridad:**
- **Agrícola**: ODS 2 (Hambre), ODS 6, ODS 13
- **Urbana**: ODS 6, ODS 7, ODS 13
- **Mixta**: ODS 2, ODS 6, ODS 7, ODS 13

Cada ODS tiene su color oficial de Naciones Unidas.

### Sección 5: Riesgos
- Variabilidad estacional de temperatura
- Dependencia eléctrica del datacenter
- Mantenimiento de membranas
- Picos de demanda (si aplica)

### Sección 6: Plan de Implementación
4 fases con duraciones:
1. Auditoría técnica (2-3 meses)
2. Instalación (4-6 meses)
3. Testing (1-2 meses)
4. Monitoreo (continuo)

---

## Funcionalidades Mock

✅ **Chatbot interactivo**
- Preguntas guiadas con botones
- Input dinámico para ubicación
- Progress bar visual

✅ **Informe estructurado**
- 6 secciones informativas
- Cards con colores contextuales
- Timeline visual de fases

✅ **Interactividad**
- Seleccionar datacenters
- Navegar atrás/adelante
- Reiniciar el flujo

⏳ **Próximamente (Fase 2 con backend)**
- PDF real (jsPDF) en lugar de TXT
- Datacenters reales por zona
- Geocodificación
- Cálculos técnicos dinámicos
- Persistencia en BD

---

## Notas de desarrollo

### Archivos creados
```
client/src/
├── hooks/
│   └── useAuditFlow.js         # Lógica del chatbot
├── components/
│   ├── AuditChatbot.jsx        # Interfaz chat
│   └── ui/
│       └── AuditReport.jsx     # Informe detallado
├── pages/
│   └── AuditPage.jsx           # Contenedor
└── App.jsx                      # (actualizado con ruta)
```

### Imports y dependencias
- `react` (hooks: useState)
- `react-router-dom` (NavLink, useNavigate)
- **Sin dependencias externas** (todo vanilla React + Tailwind)

### Estructura de datos
```js
// useAuditFlow devuelve
{
  step,                  // 0-4
  totalSteps,            // 5
  currentQuestion,       // { id, question, type, options }
  answers,               // { method, location, priority, seasonality, scale }
  isComplete,            // boolean
  handleAnswer(value),   // callback
  reset(),               // reset flow
  progress,              // 0-100
}

// generateMockReport() devuelve
{
  timestamp,
  location,              // { method, value, lat, lon }
  summary,               // { priority, seasonality, scale, viability }
  datacenters,           // array de 3 DCs
  recommendation,        // { primaryDC, distance, coolingType, desalinization }
  sizing,                // { waterProductionDaily, servableArea, estimatedCapex, paybackYears }
  ods,                   // array dinámico según priority
  risks,                 // array contextualizado
  implementation,        // array 4 fases
}
```

---

## Puntos de validación

Mientras pruebas, verifica:
1. ✅ Todas las preguntas se cargan correctamente
2. ✅ El progress bar avanza (0% → 100%)
3. ✅ Los valores del informe cambian según respuestas
4. ✅ El DC seleccionado actualiza la recomendación técnica
5. ✅ Los ODS se actualizan dinámicamente
6. ✅ Los valores de sizing coinciden con la escala
7. ✅ El botón "Descargar Informe" genera un archivo TXT

---

## Próximos pasos sugeridos

1. **Mejorar visuales**: Agregar animaciones, transiciones suaves
2. **Persistencia**: Guardar respuestas en localStorage
3. **Validación**: Validar CPs españoles reales
4. **Integración backend**: Reemplazar mock con endpoint `/api/seacool/audit`
5. **PDF real**: Usar jsPDF para PDF descargable

---

¿Preguntas o ajustes visuales? Avisa y lo refino.
