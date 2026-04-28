import { useState } from 'react'
import SeaCoolMap from '../components/ui/SeaCoolMap'
import { analyzeRegion } from '../api/client'

const URGENCY_COLOR = {
  critical: { badge: 'bg-red-100 text-red-700' },
  high:     { badge: 'bg-orange-100 text-orange-700' },
  medium:   { badge: 'bg-yellow-100 text-yellow-700' },
}

function AgentBlock({ icon, title, color, children, delay = 0 }) {
  return (
    <div
      className={`rounded-xl border-l-4 ${color} p-4 bg-white`}
      style={{ animation: `fadeIn 0.4s ease ${delay}ms both` }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="material-symbols-outlined text-[18px] text-slate-500">{icon}</span>
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">{title}</span>
      </div>
      {children}
    </div>
  )
}

function AnalysisPanel({ region, analysis, loading, onClose }) {
  if (!region) return null
  const urgencyStyle = URGENCY_COLOR[analysis?.hydro_agent?.urgency] ?? URGENCY_COLOR.high

  return (
    <div className="w-full h-full flex flex-col bg-slate-50 overflow-y-auto">
      <div className="bg-[#003366] text-white p-5 flex-shrink-0">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="text-2xl mb-0.5">{region.flag}</div>
            <h2 className="text-lg font-bold leading-tight">{region.name}</h2>
            <p className="text-blue-200 text-sm">{region.country} · {region.region}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
            <span className="material-symbols-outlined text-white text-lg">close</span>
          </button>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${region.water_stress >= 4.5 ? 'bg-red-500' : 'bg-orange-500'} text-white`}>
            Estrés {region.stress_label} · {region.water_stress}/5
          </span>
          <span className="text-blue-200 text-xs">{region.population_m}M hab.</span>
          <span className="text-blue-200 text-xs">{region.annual_rainfall_mm}mm/año</span>
        </div>
      </div>

      <div className="px-4 py-3 bg-white border-b border-slate-100 flex-shrink-0">
        <p className="text-xs text-slate-600 italic">"{region.key_challenge}"</p>
      </div>

      {loading && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 py-12">
          <div className="relative w-14 h-14">
            <div className="absolute inset-0 rounded-full border-4 border-blue-100" />
            <div className="absolute inset-0 rounded-full border-4 border-t-[#003366] animate-spin" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-[#003366]">Agentes analizando...</p>
            <p className="text-xs text-slate-400 mt-1">Evaluando potencial SeaCool</p>
          </div>
        </div>
      )}

      {!loading && analysis && (
        <div className="flex-1 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white rounded-xl border p-3 text-center col-span-2">
              <div className="text-2xl font-black text-[#003366]">
                {(analysis.thermal_agent.daily_water_liters / 1_000_000).toFixed(2)}M
              </div>
              <div className="text-xs text-slate-500">litros/día producibles</div>
            </div>
            <div className="bg-white rounded-xl border p-3 text-center">
              <div className="text-lg font-black text-secondary">
                {Number(analysis.distribution_agent.households_supplied).toLocaleString('es-ES')}
              </div>
              <div className="text-[10px] text-slate-500">hogares abastecidos</div>
            </div>
            <div className="bg-white rounded-xl border p-3 text-center">
              <div className="text-lg font-black text-secondary">
                {Number(analysis.distribution_agent.hectares_irrigated).toLocaleString('es-ES')}
              </div>
              <div className="text-[10px] text-slate-500">hectáreas regadas</div>
            </div>
            <div className="bg-white rounded-xl border p-3 text-center">
              <div className="text-lg font-black text-orange-500">
                {Number(analysis.impact_agent.co2_avoided_tonnes_year).toLocaleString('es-ES')}
              </div>
              <div className="text-[10px] text-slate-500">t CO₂ evitadas/año</div>
            </div>
            <div className="bg-white rounded-xl border p-3 text-center">
              <div className="text-lg font-black text-purple-600">{analysis.impact_agent.roi_years} años</div>
              <div className="text-[10px] text-slate-500">payback estimado</div>
            </div>
          </div>

          <AgentBlock icon="water_drop" title="Agente Hídrico" color="border-blue-400" delay={0}>
            <p className="text-xs text-slate-700 mb-2">{analysis.hydro_agent.assessment}</p>
            <div className="flex gap-2 flex-wrap">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${urgencyStyle.badge}`}>
                {String(analysis.hydro_agent.urgency ?? '').toUpperCase()}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                Tendencia: {analysis.hydro_agent.trend}
              </span>
            </div>
          </AgentBlock>

          <AgentBlock icon="thermostat" title="Agente Térmico" color="border-orange-400" delay={150}>
            <p className="text-xs text-slate-700 mb-2">{analysis.thermal_agent.reasoning}</p>
            <div className="flex gap-4">
              <div className="text-center">
                <div className="text-base font-bold text-orange-500">{analysis.thermal_agent.dc_heat_mw} MW</div>
                <div className="text-[9px] text-slate-400">calor disponible</div>
              </div>
              <div className="text-center">
                <div className="text-base font-bold text-blue-600">
                  {(analysis.thermal_agent.daily_water_liters / 1000).toFixed(0)}k L
                </div>
                <div className="text-[9px] text-slate-400">agua/día</div>
              </div>
            </div>
          </AgentBlock>

          <AgentBlock icon="account_tree" title="Agente Distribuidor" color="border-green-400" delay={300}>
            <p className="text-xs text-slate-700 mb-3">{analysis.distribution_agent.reasoning}</p>
            <div className="space-y-1.5">
              {[
                { label: 'Urbano',     pct: analysis.distribution_agent.urban_pct,      color: 'bg-blue-500'   },
                { label: 'Agrícola',   pct: analysis.distribution_agent.agri_pct,       color: 'bg-green-500'  },
                { label: 'Industrial', pct: analysis.distribution_agent.industrial_pct, color: 'bg-purple-500' },
              ].filter(x => x.pct > 0).map(({ label, pct, color }) => (
                <div key={label}>
                  <div className="flex justify-between text-[10px] font-bold mb-0.5">
                    <span>{label}</span><span>{pct}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </AgentBlock>

          <AgentBlock icon="trending_up" title="Agente Impacto" color="border-purple-400" delay={450}>
            <div className="bg-slate-50 rounded-lg p-3 mb-3">
              <p className="text-xs text-slate-700 italic">"{analysis.impact_agent.pitch}"</p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center mb-3">
              <div>
                <div className="text-sm font-bold text-purple-600">{analysis.impact_agent.investment_m_eur}M€</div>
                <div className="text-[9px] text-slate-400">inversión</div>
              </div>
              <div>
                <div className="text-sm font-bold text-purple-600">{analysis.impact_agent.roi_years}a</div>
                <div className="text-[9px] text-slate-400">payback</div>
              </div>
              <div>
                <div className="text-sm font-bold text-purple-600">{analysis.impact_agent.bankability_score}/10</div>
                <div className="text-[9px] text-slate-400">bankabilidad</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {(analysis.impact_agent.sdgs ?? []).map(s => (
                <span key={s} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary/10 text-secondary">
                  ODS {s}
                </span>
              ))}
            </div>
          </AgentBlock>
        </div>
      )}
    </div>
  )
}

export default function GlobalDashboard() {
  const [selectedRegion, setSelectedRegion] = useState(null)
  const [analysis, setAnalysis]             = useState(null)
  const [loading, setLoading]               = useState(false)
  const [error, setError]                   = useState(null)

  async function handleRegionClick(region) {
    setSelectedRegion(region)
    setAnalysis(null)
    setError(null)
    setLoading(true)
    try {
      const result = await analyzeRegion(region.id)
      setAnalysis(result.analysis)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="flex" style={{ height: 'calc(100vh - 64px)', margin: '-40px' }}>
        <div className="flex-1 relative min-w-0">
          {error && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[1000] bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-2 rounded-lg shadow">
              Error: {error}
            </div>
          )}
          <SeaCoolMap height="100%" onRegionClick={handleRegionClick} selectedId={selectedRegion?.id} />
        </div>

        {selectedRegion && (
          <div className="w-80 flex-shrink-0 border-l border-slate-200 overflow-hidden">
            <AnalysisPanel
              region={selectedRegion}
              analysis={analysis}
              loading={loading}
              onClose={() => { setSelectedRegion(null); setAnalysis(null) }}
            />
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  )
}
