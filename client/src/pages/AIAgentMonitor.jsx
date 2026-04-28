import { useEffect, useState } from 'react'

const AGENTS_STATIC = [
  {
    id: 'agricola',
    icon: 'agriculture',
    iconBg: 'bg-green-50',
    iconColor: 'text-secondary',
    statusBg: 'bg-secondary-container',
    statusText: 'text-on-secondary-container',
    statusLabel: 'OPTIMAL',
    name: 'Agrícola',
    description: 'Control de irrigación térmica',
    logColor: 'border-secondary',
    logs: [
      '09:41 - Temp. suelo estable',
      '09:45 - Flujo 2.4L/s OK',
      '09:48 - Escaneo sensores...',
    ],
  },
  {
    id: 'urbana',
    icon: 'location_city',
    iconBg: 'bg-blue-50',
    iconColor: 'text-primary-container',
    statusBg: 'bg-primary-fixed',
    statusText: 'text-on-primary-fixed-variant',
    statusLabel: 'ACTIVE',
    name: 'Urbana',
    description: 'Refrigeración distrital',
    logColor: 'border-primary-container',
    logs: [
      '09:42 - Carga nodo 12: 45%',
      '09:44 - Delta T: 4.2°C',
      '09:47 - Redirigiendo excedente',
    ],
  },
  {
    id: 'termica',
    icon: 'thermostat',
    iconBg: 'bg-orange-50',
    iconColor: 'text-tertiary-container',
    statusBg: 'bg-tertiary-fixed',
    statusText: 'text-on-tertiary-container',
    statusLabel: 'RECOVERY',
    name: 'Térmica',
    description: 'Captación de calor residual',
    logColor: 'border-tertiary-container',
    logs: [
      '09:40 - Intercambiador B ON',
      '09:43 - Eficiencia: 94.2%',
      '09:46 - Balance térmico listo',
    ],
  },
  {
    id: 'distribuidor',
    icon: 'account_tree',
    iconBg: 'bg-slate-50',
    iconColor: 'text-on-surface-variant',
    statusBg: 'bg-surface-container-highest',
    statusText: 'text-on-surface-variant',
    statusLabel: 'BALANCED',
    name: 'Distribuidor',
    description: 'Logística de fluidos',
    logColor: 'border-outline',
    logs: [
      '09:38 - Válvula 4 abierta',
      '09:41 - Presión estable',
      '09:44 - Sincronizando flujo',
    ],
  },
]

function getAlertState(temp) {
  if (temp >= 40) return 'critical'
  if (temp >= 35) return 'warning'
  return 'standby'
}

export default function AIAgentMonitor() {
  const [temp, setTemp] = useState(32)
  const [tick, setTick] = useState(0)

  // Polling every 5 seconds to simulate real-time
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 5000)
    return () => clearInterval(id)
  }, [])

  const alertState = getAlertState(temp)

  const alertConfig = {
    standby:  { statusBg: 'bg-slate-100',          statusText: 'text-slate-500',                label: 'STANDBY',  iconBg: 'bg-slate-50',       iconColor: 'text-slate-400',   overlay: false },
    warning:  { statusBg: 'bg-tertiary-fixed',      statusText: 'text-on-tertiary-container',    label: 'WARNING',  iconBg: 'bg-orange-50',      iconColor: 'text-orange-500',  overlay: false },
    critical: { statusBg: 'bg-error-container',     statusText: 'text-on-error-container',       label: 'CRITICAL', iconBg: 'bg-error-container', iconColor: 'text-error',       overlay: true  },
  }
  const ac = alertConfig[alertState]

  const now = () => {
    const d = new Date()
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
  }

  return (
    <>
      {/* Header */}
      <header className="mb-10">
        <div className="flex items-center gap-2 text-primary font-label-caps text-label-caps mb-2">
          <span className="material-symbols-outlined text-[16px]">monitoring</span>
          REAL-TIME MONITORING
        </div>
        <h1 className="font-display-lg text-display-lg text-primary mb-2">Monitor de Agentes Inteligentes</h1>
        <p className="text-on-surface-variant max-w-2xl font-body-md">
          Supervisión autónoma del ecosistema SeaCool. Los agentes gestionan la recuperación térmica y la optimización de recursos basándose en variables ambientales.
        </p>
      </header>

      {/* Bento Grid Agents */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-12">
        {AGENTS_STATIC.map(agent => (
          <div key={agent.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full">
            <div className="flex justify-between items-start mb-4">
              <div className={`w-10 h-10 rounded-lg ${agent.iconBg} flex items-center justify-center ${agent.iconColor}`}>
                <span className="material-symbols-outlined">{agent.icon}</span>
              </div>
              <span className={`px-2 py-1 ${agent.statusBg} ${agent.statusText} text-[10px] font-bold rounded-full`}>{agent.statusLabel}</span>
            </div>
            <h3 className="font-headline-md text-body-md font-bold mb-1">{agent.name}</h3>
            <p className="text-xs text-on-surface-variant mb-4">{agent.description}</p>
            <div className="flex-1 bg-slate-50 rounded-lg p-3 font-data-mono text-[10px] text-slate-600 space-y-1 overflow-hidden">
              {agent.logs.map((log, i) => (
                <p key={i} className={`border-l-2 border-slate-200 pl-2 ${i === agent.logs.length - 1 ? 'opacity-50' : ''}`}>
                  {log}
                </p>
              ))}
            </div>
          </div>
        ))}

        {/* Alert Agent — dynamic */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm transition-all duration-500 flex flex-col h-full relative overflow-hidden">
          <div className="flex justify-between items-start mb-4">
            <div className={`w-10 h-10 rounded-lg ${ac.iconBg} flex items-center justify-center ${ac.iconColor}`}>
              <span className="material-symbols-outlined">warning</span>
            </div>
            <span className={`px-2 py-1 ${ac.statusBg} ${ac.statusText} text-[10px] font-bold rounded-full transition-colors duration-500`}>{ac.label}</span>
          </div>
          <h3 className="font-headline-md text-body-md font-bold mb-1">Alerta</h3>
          <p className="text-xs text-on-surface-variant mb-4">Gestión de emergencias</p>
          <div className="flex-1 bg-slate-50 rounded-lg p-3 font-data-mono text-[10px] text-slate-600 space-y-1 overflow-hidden">
            <p className="border-l-2 border-slate-200 pl-2">{now()} - {alertState === 'standby' ? 'Sistema nominal' : alertState === 'warning' ? 'Temperatura elevada' : 'ALERTA CRÍTICA'}</p>
            <p className="border-l-2 border-slate-200 pl-2">{now()} - Monitor activo</p>
            <p className="border-l-2 border-slate-200 pl-2 opacity-50">{now()} - {alertState === 'standby' ? 'Sin incidencias' : 'Evaluando respuesta'}</p>
          </div>
          {ac.overlay && (
            <div className="absolute inset-0 bg-error/5 pointer-events-none" />
          )}
        </div>
      </div>

      {/* Temperature Slider */}
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <h2 className="font-headline-md text-headline-md text-primary flex items-center gap-2">
              <span className="material-symbols-outlined">thermostat_auto</span>
              Escenario de Temperatura
            </h2>
            <p className="text-on-surface-variant font-body-sm mt-1">
              Simula condiciones ambientales extremas para observar la respuesta de los agentes inteligentes.
            </p>
          </div>
          <div className="text-right">
            <div
              className="text-[48px] font-black tracking-tighter leading-none transition-colors duration-300"
              style={{ color: alertState === 'critical' ? '#ba1a1a' : '#003366' }}
            >
              {temp}°C
            </div>
            <div className="text-label-caps font-label-caps text-on-surface-variant">TEMPERATURA EXTERIOR SIMULADA</div>
          </div>
        </div>
        <div className="relative w-full h-12 flex items-center px-2">
          <input
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer custom-slider transition-all duration-300"
            type="range"
            min="20"
            max="45"
            value={temp}
            onChange={e => setTemp(parseInt(e.target.value))}
          />
          <div className="absolute -bottom-6 left-0 right-0 flex justify-between text-[10px] font-bold text-slate-400 font-label-caps uppercase">
            <span>20°C - Cold</span>
            <span>32.5°C - Nominal</span>
            <span>45°C - Critical</span>
          </div>
        </div>
      </div>

      {/* Footer Metrics */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface-container-low p-6 rounded-xl border border-outline-variant flex items-center gap-4">
          <div className="p-3 bg-white rounded-lg shadow-sm">
            <span className="material-symbols-outlined text-[#003366]">energy_savings_leaf</span>
          </div>
          <div>
            <div className="text-2xl font-bold text-primary tracking-tight">12.4 MW/h</div>
            <div className="text-label-caps font-label-caps text-on-surface-variant">AHORRO ENERGÉTICO TOTAL</div>
          </div>
        </div>
        <div className="bg-surface-container-low p-6 rounded-xl border border-outline-variant flex items-center gap-4">
          <div className="p-3 bg-white rounded-lg shadow-sm">
            <span className="material-symbols-outlined text-secondary">water_drop</span>
          </div>
          <div>
            <div className="text-2xl font-bold text-primary tracking-tight">85,200 L</div>
            <div className="text-label-caps font-label-caps text-on-surface-variant">AGUA RECUPERADA (24H)</div>
          </div>
        </div>
        <div className="bg-surface-container-low p-6 rounded-xl border border-outline-variant flex items-center gap-4">
          <div className="p-3 bg-white rounded-lg shadow-sm">
            <span className="material-symbols-outlined text-tertiary-container">hub</span>
          </div>
          <div>
            <div className="text-2xl font-bold text-primary tracking-tight">99.98%</div>
            <div className="text-label-caps font-label-caps text-on-surface-variant">ESTABILIDAD DEL SISTEMA</div>
          </div>
        </div>
      </div>
    </>
  )
}
