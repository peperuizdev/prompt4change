# SeaCool — CLAUDE.md

Tu tarea es construir el frontend React de SeaCool dentro de `client/`.
El backend ya existe en `server/` — no lo modifiques bajo ningún concepto.
El diseño de cada pantalla ya está hecho en HTML — conviértelo a React sin cambiar nada visual.

---

## Estructura actual del proyecto

```
prompt4change/
├── client/
│   ├── seacool_ai_agent_monitor/
│   │   ├── code.html        ← fuente de verdad visual para AIAgentMonitor.jsx
│   │   └── screen.png       ← referencia visual
│   ├── seacool_esg_impact_reports/
│   │   ├── code.html        ← fuente de verdad visual para ESGReports.jsx
│   │   └── screen.png
│   ├── seacool_farmer_portal/
│   │   ├── code.html        ← fuente de verdad visual para FarmerPortal.jsx
│   │   └── screen.png
│   ├── seacool_global_dashboard/
│   │   ├── code.html        ← fuente de verdad visual para GlobalDashboard.jsx
│   │   └── screen.png
│   └── seacool_system/
│       └── DESIGN.md        ← sistema de diseño: colores, tipografía, espaciado
└── server/                  ← NO TOCAR
    ├── main.py
    ├── requirements.txt
    └── app/
        ├── agents/          ← base_agent.py, ods_agent.py, seacool_agent.py
        ├── core/            ← config.py, security.py
        ├── database/        ← connection.py, models.py
        ├── routes/          ← ai_routes.py, health_routes.py, seacool_routes.py
        ├── services/        ← ai_service.py, ods_service.py, seacool_service.py
        └── utils/           ← helpers.py, prompts.py
```

## Estructura que debes crear dentro de `client/`

```
client/
├── index.html
├── vite.config.js
├── package.json
├── tailwind.config.js
├── postcss.config.js
├── .env                     ← VITE_API_URL=http://localhost:8000
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── api/
    │   └── client.js
    ├── hooks/
    │   ├── useMetrics.js
    │   ├── useSimulate.js
    │   └── useAgents.js
    ├── components/
    │   ├── layout/
    │   │   ├── TopNavBar.jsx
    │   │   └── SideNavBar.jsx
    │   └── ui/
    │       ├── MetricCard.jsx
    │       ├── StatusChip.jsx
    │       ├── AgentCard.jsx
    │       └── AlertBanner.jsx
    └── pages/
        ├── GlobalDashboard.jsx
        ├── AIAgentMonitor.jsx
        ├── FarmerPortal.jsx
        └── ESGReports.jsx
```

---

## Regla principal de diseño

**Cada `code.html` es la fuente de verdad de su pantalla.**
Antes de escribir cualquier página, lee el `code.html` correspondiente.
Extrae el HTML, conviértelo a JSX y conéctalo a datos reales del backend.
No cambies nada visual: mismos colores, misma tipografía, mismo layout, mismos iconos.

El sistema de diseño completo está en `client/seacool_system/DESIGN.md`.
Léelo antes de configurar `tailwind.config.js`.

---

## Paso 1 — leer antes de escribir

Antes de generar ningún archivo, lee en este orden:

1. `client/seacool_system/DESIGN.md` → extrae colores, tipografía y espaciado para `tailwind.config.js`
2. `client/seacool_global_dashboard/code.html` → extrae TopNavBar, SideNavBar y estructura base
3. `server/app/routes/seacool_routes.py` → extrae los endpoints reales y sus parámetros
4. `server/app/services/seacool_service.py` → extrae los shapes de respuesta
5. `server/app/routes/ai_routes.py` → extrae endpoints de AI/chat

No inventes endpoints ni shapes. Úsalos exactamente como están definidos en el backend.

---

## tailwind.config.js

Extrae los valores exactos del `<script id="tailwind-config">` que encontrarás en cada `code.html`.
El formato para el archivo es:

```js
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: { /* copiar de code.html */ },
      borderRadius: { /* copiar de code.html */ },
      spacing: { /* copiar de code.html */ },
      fontSize: { /* copiar de code.html */ },
      fontFamily: { /* copiar de code.html */ },
    },
  },
}
```

---

## index.html

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SeaCool — Command Center</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
  <style>
    .material-symbols-outlined {
      font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>
```

---

## api/client.js

```js
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`)
  return res.json()
}
```

---

## App.jsx — routing

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import TopNavBar from './components/layout/TopNavBar'
import SideNavBar from './components/layout/SideNavBar'
import GlobalDashboard from './pages/GlobalDashboard'
import AIAgentMonitor from './pages/AIAgentMonitor'
import FarmerPortal from './pages/FarmerPortal'
import ESGReports from './pages/ESGReports'

export default function App() {
  return (
    <BrowserRouter>
      <TopNavBar />
      <SideNavBar />
      <main className="ml-64 mt-16 p-xl">
        <div className="max-w-container-max mx-auto">
          <Routes>
            <Route path="/"       element={<GlobalDashboard />} />
            <Route path="/agents" element={<AIAgentMonitor />} />
            <Route path="/farmer" element={<FarmerPortal />} />
            <Route path="/esg"    element={<ESGReports />} />
          </Routes>
        </div>
      </main>
    </BrowserRouter>
  )
}
```

SideNavBar debe marcar el enlace activo usando `useLocation()` de react-router-dom.
La ruta activa usa las clases del nav seleccionado en `code.html` (bg-blue-50, text-[#003366], font-semibold).
Las rutas inactivas usan las clases del nav no seleccionado (text-slate-600, hover:bg-slate-50).

---

## Páginas — instrucciones por pantalla

### GlobalDashboard.jsx (`/`)
- Lee `client/seacool_global_dashboard/code.html`
- Convierte el HTML completo a JSX
- Las metric cards hardcodeadas conéctalas a `GET /api/v1/seacool/metrics` (lee el endpoint real antes)
- El badge "System Online" debe ser dinámico: llama a `GET /health` y muestra verde si responde ok
- Añade un chart de Recharts debajo de las cards: línea azul (#003366) para calor recuperado, línea verde (#006d37) para agua producida

### AIAgentMonitor.jsx (`/agents`)
- Lee `client/seacool_ai_agent_monitor/code.html`
- Convierte el HTML a JSX
- Conecta los datos de agentes a `GET /api/v1/seacool/agents/status`
- Polling cada 5 segundos con `useEffect` + `setInterval` para simular tiempo real
- Cada agente muestra: nombre, estado (chip), última decisión, timestamp

### FarmerPortal.jsx (`/farmer`)
- Lee `client/seacool_farmer_portal/code.html`
- Convierte el HTML a JSX
- El formulario de simulación llama a `POST /api/v1/seacool/simulate`
- Lee `server/app/routes/seacool_routes.py` para saber exactamente qué body espera el endpoint
- Durante la llamada: muestra spinner + "Agentes procesando..."
- Con resultado: muestra litros producidos, hogares abastecidos, hectáreas regadas, reasoning del distribuidor
- Si `crisis_level === 'critical'`: AlertBanner rojo en la parte superior
- Si `crisis_level === 'warning'`: AlertBanner naranja

### ESGReports.jsx (`/esg`)
- Lee `client/seacool_esg_impact_reports/code.html`
- Convierte el HTML a JSX
- Métricas de impacto de `GET /api/v1/seacool/metrics`
- Botón "Download Report" genera PDF con jsPDF:
  - Incluye fecha actual, métricas clave, ODS conectados (6, 7, 2, 13)
  - Usa colores del DESIGN.md: #003366 para cabecera, #006d37 para valores positivos

---

## Componentes reutilizables

### TopNavBar.jsx
Extráelo del `<header>` de `seacool_global_dashboard/code.html`.
Es idéntico en todas las pantallas — no lo dupliques.

### SideNavBar.jsx
Extráelo del `<aside>` de `seacool_global_dashboard/code.html`.
Usa `useLocation()` para detectar la ruta activa y aplicar las clases correctas.
El botón "Simulate Impact" navega a `/farmer`.

### MetricCard.jsx
```jsx
export default function MetricCard({ label, value, unit, trend, trendPct, icon, barColor, barPct }) {
  return (
    <div className="bg-white p-lg rounded-xl border border-slate-200 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] relative overflow-hidden">
      <div className="flex justify-between items-start mb-4">
        <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">{label}</span>
        <span className="material-symbols-outlined" style={{ color: barColor }}>{icon}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-extrabold text-primary">{value}</span>
        <span className="text-xl font-bold text-on-surface-variant">{unit}</span>
      </div>
      <div className="mt-4 flex items-center gap-1 text-secondary font-bold text-sm">
        <span className="material-symbols-outlined text-sm">trending_up</span>
        <span>{trend}</span>
      </div>
      <div className="absolute bottom-0 left-0 w-full h-1" style={{ background: `${barColor}33` }}>
        <div className="h-full" style={{ width: `${barPct}%`, background: barColor }} />
      </div>
    </div>
  )
}
```

### StatusChip.jsx
```jsx
const styles = {
  active:   'bg-green-50  text-green-700',
  warning:  'bg-orange-50 text-orange-700',
  critical: 'bg-red-50    text-red-700',
  offline:  'bg-slate-100 text-slate-500',
}

export default function StatusChip({ status, label }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${styles[status] ?? styles.offline}`}>
      {label ?? status}
    </span>
  )
}
```

### AlertBanner.jsx
```jsx
export default function AlertBanner({ level, messages = [] }) {
  if (!messages.length) return null
  const styles = {
    warning:  { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800', icon: 'warning' },
    critical: { bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-800',    icon: 'error' },
  }
  const s = styles[level] ?? styles.warning
  return (
    <div className={`${s.bg} ${s.border} ${s.text} border rounded-xl p-md mb-lg flex gap-3 items-start`}>
      <span className="material-symbols-outlined">{s.icon}</span>
      <div>
        {messages.map((m, i) => <p key={i} className="text-sm font-medium">{m}</p>)}
      </div>
    </div>
  )
}
```

---

## package.json

```json
{
  "name": "seacool-client",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.23.0",
    "recharts": "^2.12.0",
    "jspdf": "^2.5.1"
  },
  "devDependencies": {
    "vite": "^5.2.0",
    "@vitejs/plugin-react": "^4.2.1",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38"
  }
}
```

Material Symbols se carga desde Google Fonts en `index.html` — no instalar paquete npm.

---

## .env (dentro de `client/`)

```
VITE_API_URL=http://localhost:8000
```

---

## Arranque

```bash
# Terminal 1 — backend (si no lo ha arrancado ya tu compañera)
cd server
source venv/bin/activate
uvicorn main:app --reload --port 8000

# Terminal 2 — frontend
cd client
npm install
npm run dev        # http://localhost:5173
```

---

## Orden de implementación

Sigue este orden exacto. No saltes pasos.

1. Leer `DESIGN.md` + los 4 `code.html` antes de escribir nada
2. Leer `server/app/routes/seacool_routes.py` y `server/app/services/seacool_service.py`
3. Setup: `package.json`, `vite.config.js`, `tailwind.config.js`, `index.html`, `main.jsx`
4. `api/client.js`
5. `TopNavBar.jsx` y `SideNavBar.jsx` extraídos del HTML
6. `App.jsx` con las 4 rutas — verificar navegación antes de continuar
7. `GlobalDashboard.jsx` con datos reales de métricas
8. `FarmerPortal.jsx` con sliders y llamada a `/simulate` — es la demo del pitch
9. `AIAgentMonitor.jsx` con polling
10. `ESGReports.jsx` con descarga PDF