import { useEffect, useState } from 'react'

const AGENTS = [
  { id: 'distribuidor', label: 'Agente Distribuidor', icon: 'account_tree', color: '#003366', desc: 'Reparto urbano/agrícola' },
  { id: 'alerta',       label: 'Agente Alerta',       icon: 'warning',      color: '#d98a00', desc: 'Detección de crisis' },
  { id: 'roi',          label: 'Agente ROI',           icon: 'trending_up',  color: '#006d37', desc: 'Optimización económica' },
]

const MESSAGES = [
  { from: 'user',         to: 'orchestrator', text: 'Simulación iniciada' },
  { from: 'orchestrator', to: 'distribuidor', text: 'Analiza distribución' },
  { from: 'orchestrator', to: 'alerta',       text: 'Evalúa riesgos' },
  { from: 'orchestrator', to: 'roi',          text: 'Calcula ahorro' },
  { from: 'distribuidor', to: 'orchestrator', text: '65% agríc. / 35% urban.' },
  { from: 'alerta',       to: 'orchestrator', text: 'Nominal ✓' },
  { from: 'roi',          to: 'orchestrator', text: '+7,500 kW ahorrados' },
  { from: 'orchestrator', to: 'user',         text: 'Resultado consolidado' },
]

export default function AgentFlowDiagram({ running = false, result = null }) {
  const [step, setStep] = useState(-1)
  const [logs, setLogs] = useState([])

  useEffect(() => {
    if (!running) { setStep(-1); setLogs([]); return }
    setStep(0); setLogs([])
    const timers = MESSAGES.map((msg, i) =>
      setTimeout(() => {
        setStep(i)
        setLogs(prev => [...prev, msg])
      }, i * 600)
    )
    return () => timers.forEach(clearTimeout)
  }, [running])

  return (
    <div className="bg-[#001e40] rounded-2xl p-6 overflow-hidden relative">
      <div className="absolute inset-0 opacity-5"
        style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}
      />
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-6">
          <span className="material-symbols-outlined text-secondary text-sm">hub</span>
          <span className="font-label-caps text-label-caps text-secondary uppercase">Flujo de Orquestación Multiagente</span>
          {running && (
            <span className="ml-auto flex items-center gap-1.5 text-[10px] font-bold text-secondary">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />PROCESANDO
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-4">
          <NodeBox icon="person" label="Usuario" sublabel="SeaCool UI" color="#a7c8ff" active={step >= 0} pulse={step === 0 || step === 7} />
          <FlowArrow active={step >= 0} label={step >= 0 ? MESSAGES[0].text : ''} />
          <div className="flex flex-col items-center gap-1">
            <div className={`w-16 h-16 rounded-2xl border-2 flex flex-col items-center justify-center transition-all duration-300
              ${step >= 0 ? 'border-[#a7c8ff] bg-[#003366] shadow-lg shadow-blue-500/20' : 'border-white/10 bg-white/5'}`}>
              <span className="material-symbols-outlined text-[#a7c8ff] text-2xl">smart_toy</span>
            </div>
            <span className="text-[10px] font-bold text-white/80 text-center leading-tight">Orchestrator<br/>SeaCool AI</span>
            {step >= 1 && step <= 3 && <span className="text-[9px] text-amber-300 animate-pulse font-bold">distribuyendo...</span>}
            {step >= 6 && <span className="text-[9px] text-secondary font-bold">consolidando</span>}
          </div>

          <div className="flex flex-col gap-8 items-center">
            {AGENTS.map((agent, i) => (
              <div key={agent.id} className="flex items-center gap-2">
                <AnimatedDash active={step >= i + 1} reverse={step >= i + 4} />
                <NodeBox icon={agent.icon} label={agent.label} sublabel={agent.desc} color={agent.color}
                  active={step >= i + 1} pulse={step === i + 1} small />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 bg-black/30 rounded-xl p-3 h-28 overflow-hidden font-mono text-[10px] space-y-1">
          {logs.length === 0 && <p className="text-white/20 italic">Esperando simulación...</p>}
          {logs.map((msg, i) => (
            <div key={i} className={`flex items-start gap-2 transition-opacity duration-300 ${i === logs.length - 1 ? 'opacity-100' : 'opacity-60'}`}>
              <span className="text-white/40 shrink-0">{String(i).padStart(2, '0')}</span>
              <span className="text-secondary shrink-0">{msg.from}</span>
              <span className="text-white/40">→</span>
              <span className="text-[#a7c8ff] shrink-0">{msg.to}</span>
              <span className="text-white/70 truncate">{msg.text}</span>
            </div>
          ))}
        </div>

        {result && (
          <div className="mt-4 grid grid-cols-3 gap-3">
            <ResultPill icon="water_drop" label="Agua" value={`${(result.metricas_tecnicas.agua_generada_litros / 1000).toFixed(1)}k L`} color="text-secondary" />
            <ResultPill icon="account_tree" label="Agrícola" value={`${result.distribucion.agricola_porcentaje}%`} color="text-amber-400" />
            <ResultPill icon="bolt" label="Ahorro" value={`${result.metricas_tecnicas.ahorro_refrigeracion_kw} kW`} color="text-[#a7c8ff]" />
          </div>
        )}
      </div>
    </div>
  )
}

function NodeBox({ icon, label, sublabel, color, active, pulse, small = false }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`${small ? 'w-12 h-12' : 'w-14 h-14'} rounded-xl border-2 flex items-center justify-center relative transition-all duration-500
        ${active ? 'bg-white/10 shadow-lg' : 'bg-white/5'} ${pulse ? 'scale-110' : 'scale-100'}`}
        style={{ borderColor: active ? color : 'rgba(255,255,255,0.1)', boxShadow: pulse ? `0 0 20px ${color}66` : 'none' }}
      >
        <span className="material-symbols-outlined" style={{ color, fontSize: small ? '20px' : '24px' }}>{icon}</span>
        {pulse && <span className="absolute inset-0 rounded-xl animate-ping opacity-20" style={{ background: color }} />}
      </div>
      <span className="text-[9px] font-bold text-white/80 text-center leading-tight max-w-[64px]">{label}</span>
      {sublabel && <span className="text-[8px] text-white/40 text-center leading-tight max-w-[64px]">{sublabel}</span>}
    </div>
  )
}

function FlowArrow({ active, label }) {
  return (
    <div className="flex flex-col items-center gap-1 min-w-[60px]">
      <div className={`h-0.5 w-full transition-all duration-500 ${active ? 'bg-[#a7c8ff]' : 'bg-white/10'}`}
        style={{ background: active ? 'linear-gradient(90deg, #a7c8ff, #003366)' : undefined }} />
      {label && <span className="text-[8px] text-[#a7c8ff]/70 text-center max-w-[80px] leading-tight">{label}</span>}
    </div>
  )
}

function AnimatedDash({ active, reverse }) {
  return (
    <div className="relative w-12 h-0.5 overflow-hidden">
      <div className={`absolute inset-0 transition-colors duration-300 ${active ? '' : 'bg-white/10'}`}
        style={active ? {
          background: `repeating-linear-gradient(90deg, ${reverse ? '#006d37' : '#a7c8ff'} 0px, ${reverse ? '#006d37' : '#a7c8ff'} 4px, transparent 4px, transparent 8px)`,
          animation: `dash-flow ${reverse ? '0.6s' : '0.8s'} linear infinite ${reverse ? 'reverse' : ''}`,
        } : {}}
      />
    </div>
  )
}

function ResultPill({ icon, label, value, color }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-2 text-center">
      <span className={`material-symbols-outlined text-sm ${color}`}>{icon}</span>
      <div className={`text-sm font-black ${color}`}>{value}</div>
      <div className="text-[9px] text-white/40 uppercase font-bold">{label}</div>
    </div>
  )
}
