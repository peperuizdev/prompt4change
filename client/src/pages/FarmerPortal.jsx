import { useState, useEffect, useRef } from 'react'
import AlertBanner from '../components/ui/AlertBanner'
import AgentFlowDiagram from '../components/ui/AgentFlowDiagram'
import { getRegions, simulateSeacool } from '../api/client'

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']

function getCrisisLevel(msg) {
  if (!msg || msg === 'Nominal') return null
  const u = msg.toUpperCase()
  if (u.includes('CRÍTICO') || u.includes('CRITICO')) return 'critical'
  if (u.includes('ALERTA')) return 'warning'
  return null
}

function Slider({ label, min, max, value, unit, onChange }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <label className="font-label-caps text-label-caps text-on-surface-variant uppercase">{label}</label>
        <span className="text-2xl font-black text-[#003366]">{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer custom-slider"
      />
      <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-1">
        <span>{min}{unit}</span><span>{max}{unit}</span>
      </div>
    </div>
  )
}

export default function FarmerPortal() {
  const [regions, setRegions]   = useState([])
  const [regionId, setRegionId] = useState('')
  const [tempExt, setTempExt]   = useState(28)
  const [cargaDc, setCargaDc]   = useState(65)
  const [mes, setMes]           = useState('julio')
  const [loading, setLoading]   = useState(false)
  const [result, setResult]     = useState(null)
  const [error, setError]       = useState(null)
  const [agentRunning, setAgentRunning] = useState(false)

  useEffect(() => {
    getRegions().then(r => {
      setRegions(r)
      if (r.length > 0) setRegionId(r[0].id)
    }).catch(console.error)
  }, [])

  const selectedRegion = regions.find(r => r.id === regionId)

  async function handleSimulate() {
    setLoading(true)
    setAgentRunning(true)
    setError(null)
    setResult(null)
    try {
      const data = await simulateSeacool({ temp_ext: tempExt, carga_dc: cargaDc, mes })
      setResult(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
      setTimeout(() => setAgentRunning(false), 5000)
    }
  }

  const crisisLevel = result ? getCrisisLevel(result.mensajes_agentes?.agente_alerta) : null
  const hogares     = result ? Math.round(result.metricas_tecnicas.agua_generada_litros / 200) : null
  const hectareas   = result ? Math.round((result.metricas_tecnicas.agua_generada_litros * result.distribucion.agricola_porcentaje / 100) / 4000) : null

  return (
    <>
      {crisisLevel && (
        <AlertBanner level={crisisLevel} messages={[result.mensajes_agentes.agente_alerta]} />
      )}

      <div className="flex justify-between items-end mb-lg">
        <div>
          <h1 className="font-display-lg text-headline-md text-[#001e40] font-bold">Simulador de Escenarios</h1>
          <p className="text-on-surface-variant font-body-sm mt-1">Ajusta los parámetros para cualquier región del mundo y analiza el impacto SeaCool.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg mb-lg">
        {/* Controls */}
        <div className="lg:col-span-1 space-y-lg">
          {/* Region selector */}
          <div className="bg-white p-lg rounded-xl border border-slate-200 shadow-sm">
            <h4 className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-3">Región objetivo</h4>
            <select
              value={regionId}
              onChange={e => setRegionId(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#003366]/20 outline-none mb-3"
            >
              {regions.map(r => (
                <option key={r.id} value={r.id}>{r.flag} {r.name} ({r.country})</option>
              ))}
            </select>
            {selectedRegion && (
              <div className="text-xs text-slate-500 space-y-1 bg-slate-50 rounded-lg p-3">
                <p><span className="font-semibold">Estrés hídrico:</span> {selectedRegion.water_stress}/5 — {selectedRegion.stress_label}</p>
                <p><span className="font-semibold">Población:</span> {selectedRegion.population_m}M hab.</p>
                <p><span className="font-semibold">DC potencial:</span> {selectedRegion.dc_potential_mw} MW</p>
              </div>
            )}
          </div>

          {/* Sliders */}
          <div className="bg-white p-lg rounded-xl border border-slate-200 shadow-sm space-y-6">
            <h4 className="font-label-caps text-label-caps text-on-surface-variant uppercase">Parámetros</h4>
            <Slider label="Temperatura exterior" min={-10} max={55} value={tempExt} unit="°C" onChange={setTempExt} />
            <Slider label="Carga datacenter"     min={0}   max={100} value={cargaDc} unit="%"  onChange={setCargaDc} />
            <div>
              <label className="font-label-caps text-label-caps text-on-surface-variant uppercase block mb-2">Mes</label>
              <select value={mes} onChange={e => setMes(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#003366]/20 outline-none">
                {MESES.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
              </select>
            </div>
            <button onClick={handleSimulate} disabled={loading}
              className="w-full bg-[#003366] text-white py-3 rounded-lg font-bold active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
              {loading ? (
                <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>Simulando...</>
              ) : (<><span className="material-symbols-outlined text-sm">play_circle</span>Ejecutar simulación</>)}
            </button>
            {error && <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-sm">{error}</div>}
          </div>
        </div>

        {/* Right side: flow + results */}
        <div className="lg:col-span-2 space-y-lg">
          <AgentFlowDiagram running={agentRunning} result={result} />

          {result && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-lg">
              <h4 className="font-headline-md text-[#001e40] mb-lg text-sm font-bold">Resultados</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-lg mb-lg">
                {[
                  { icon: 'water_drop', color: 'text-secondary', val: result.metricas_tecnicas.agua_generada_litros.toLocaleString(), label: 'Litros/día' },
                  { icon: 'home',       color: 'text-primary-container', val: hogares?.toLocaleString(), label: 'Hogares' },
                  { icon: 'agriculture',color: 'text-tertiary-container', val: hectareas?.toLocaleString(), label: 'Hectáreas' },
                  { icon: 'bolt',       color: 'text-orange-500', val: result.metricas_tecnicas.ahorro_refrigeracion_kw.toLocaleString(), label: 'kW ahorrados' },
                ].map(({ icon, color, val, label }) => (
                  <div key={label} className="bg-surface-container-low p-md rounded-xl text-center">
                    <span className={`material-symbols-outlined ${color} text-3xl block mb-2`}>{icon}</span>
                    <div className="text-2xl font-black text-primary">{val}</div>
                    <div className="font-label-caps text-label-caps text-on-surface-variant">{label}</div>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <p className="font-label-caps text-label-caps text-on-surface-variant uppercase">Razonamiento de agentes</p>
                {[
                  { key: 'agente_distribuidor', label: 'Distribuidor', icon: 'account_tree', color: 'border-primary-container' },
                  { key: 'agente_alerta',       label: 'Alerta',       icon: 'warning',      color: crisisLevel === 'critical' ? 'border-error' : 'border-secondary' },
                  { key: 'agente_roi',          label: 'ROI',          icon: 'trending_up',  color: 'border-secondary' },
                ].map(({ key, label, icon, color }) => (
                  <div key={key} className={`border-l-4 ${color} pl-4 py-2`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="material-symbols-outlined text-sm text-on-surface-variant">{icon}</span>
                      <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">{label}</span>
                    </div>
                    <p className="text-body-sm text-on-surface">{result.mensajes_agentes[key]}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
