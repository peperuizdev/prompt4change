import { useState, useRef, useEffect } from 'react'
import SeaCoolMap from '../components/ui/SeaCoolMap'
import { analyzeRegion, analyzeDC } from '../api/client'
import { addReport } from '../store'

const URGENCY_COLOR = {
  critical: { badge: 'bg-red-100 text-red-700' },
  high:     { badge: 'bg-orange-100 text-orange-700' },
  medium:   { badge: 'bg-yellow-100 text-yellow-700' },
}

function getFlagEmoji(country) {
  if (!country || country.length !== 2) return null
  const codePoints = [...country.toUpperCase()].map(c => 127397 + c.charCodeAt())
  return String.fromCodePoint(...codePoints)
}

// ── Componentes de UI reutilizables ──────────────────────────────────────────

function AgentBlock({ icon, title, children, delay = 0 }) {
  return (
    <div
      className="p-4 bg-white border rounded-xl border-slate-200"
      style={{ animation: `fadeIn 0.4s ease ${delay}ms both` }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="material-symbols-outlined text-[18px] text-slate-500">{icon}</span>
        <span className="text-xs font-bold tracking-wide uppercase text-slate-500">{title}</span>
      </div>
      {children}
    </div>
  )
}

function ViabilityBadge({ viability }) {
  if (!viability) return null
  const cls = {
    green:  { wrap: 'bg-green-50 border-green-200',   icon: 'text-green-600',  label: 'text-green-700'  },
    blue:   { wrap: 'bg-blue-50 border-blue-200',     icon: 'text-blue-600',   label: 'text-blue-700'   },
    orange: { wrap: 'bg-orange-50 border-orange-200', icon: 'text-orange-500', label: 'text-orange-700' },
    gray:   { wrap: 'bg-slate-100 border-slate-200',  icon: 'text-slate-400',  label: 'text-slate-500'  },
  }[viability.color] ?? { wrap: 'bg-slate-100 border-slate-200', icon: 'text-slate-400', label: 'text-slate-500' }

  return (
    <div className={`mx-4 mt-3 rounded-xl px-3 py-2.5 flex items-start gap-2.5 border ${cls.wrap}`}>
      <span className={`material-symbols-outlined text-[18px] mt-0.5 shrink-0 ${cls.icon}`}>
        {viability.icon}
      </span>
      <div className="min-w-0">
        <div className={`text-[11px] font-bold leading-tight ${cls.label}`}>{viability.label}</div>
        <div className="text-[10px] text-slate-500 leading-snug mt-0.5">{viability.description}</div>
      </div>
    </div>
  )
}

function DataSource({ label, detail, value }) {
  return (
    <div className="flex items-center gap-2.5 bg-white rounded-lg border border-slate-100 px-3 py-2.5">
      <span className="material-symbols-outlined text-[15px] text-slate-400 shrink-0">hub</span>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-bold text-slate-700">{label}</div>
        <div className="text-[10px] text-slate-400 leading-tight">{detail}</div>
      </div>
      {value != null && (
        <span className="text-[11px] font-black text-[#003366] shrink-0 ml-2">{value}</span>
      )}
    </div>
  )
}

// Temperatura media anual real via Open-Meteo Archive (ERA5, 2023)
function useAnnualTemp(lat, lng) {
  const [temp, setTemp] = useState(null)
  useEffect(() => {
    if (lat == null || lng == null) return
    let cancelled = false
    fetch(
      `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}` +
      `&start_date=2023-01-01&end_date=2023-12-31&daily=temperature_2m_mean&timezone=GMT`
    )
      .then(r => r.json())
      .then(d => {
        if (cancelled) return
        const vals = (d?.daily?.temperature_2m_mean ?? []).filter(v => v != null)
        if (!vals.length) return
        const avg = vals.reduce((a, b) => a + b, 0) / vals.length
        setTemp(Math.round(avg * 10) / 10)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [lat, lng])
  return temp
}

// Intensidad de carbono IEA 2023 (g CO₂/kWh) por código ISO-2
const CARBON_BY_ISO2 = {
  ES: 175, FR:  65, DE: 385, IT: 260, PT: 130, GR: 480, MA: 580, TN: 480,
  TR: 440, IL: 420, LB: 690, AE: 400, SA: 650, EG: 530, LY: 700, DZ: 540,
  GB: 220, NL: 340, BE: 160, DK: 170, SE:  45, NO:  30, FI: 130, AT: 160,
  CH:  45, PL: 680, CZ: 450, IE: 280, IS:  30, HU: 230, RO: 290, BG: 450,
  US: 380, CA: 170, AU: 450, NZ: 150, JP: 450, KR: 450, CN: 550, IN: 700,
  BR:  90, ZA: 780, RU: 360, UA: 310, NG: 460, ID: 710, SG: 400, MY: 510,
  MX: 430, AR: 340, CL: 290, CO: 200, PE: 250, VN: 540, TH: 510, PH: 620,
}

// Nombres de país en español → ISO-2 (para las regiones predefinidas)
const COUNTRY_ES_TO_ISO2 = {
  'españa': 'ES', 'italia': 'IT', 'grecia': 'GR', 'portugal': 'PT',
  'marruecos': 'MA', 'túnez': 'TN', 'tunez': 'TN', 'libia': 'LY',
  'argelia': 'DZ', 'egipto': 'EG', 'jordania': 'JO', 'israel': 'IL',
  'turquía': 'TR', 'turquia': 'TR', 'líbano': 'LB', 'libano': 'LB',
  'india': 'IN', 'australia': 'AU', 'chile': 'CL', 'brasil': 'BR',
  'arabia saudí': 'SA', 'arabia saudi': 'SA', 'emiratos': 'AE',
  'china': 'CN', 'estados unidos': 'US', 'reino unido': 'GB',
  'alemania': 'DE', 'francia': 'FR', 'países bajos': 'NL', 'paises bajos': 'NL',
}

function getCarbonIntensity(countryOrIso2) {
  if (!countryOrIso2) return null
  const s = countryOrIso2.trim()
  if (s.length === 2) return CARBON_BY_ISO2[s.toUpperCase()] ?? null
  return CARBON_BY_ISO2[COUNTRY_ES_TO_ISO2[s.toLowerCase()]] ?? null
}

// ── Paneles de Preview (antes del análisis IA) ────────────────────────────────

function RegionPreviewPanel({ region, onAnalyze, onClose }) {
  const temp    = useAnnualTemp(region.lat, region.lng)
  const carbon  = getCarbonIntensity(region.country)
  return (
    <div className="flex flex-col w-full h-full overflow-y-auto bg-slate-50">
      <div className="bg-[#003366] text-white p-5 flex-shrink-0">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="text-2xl mb-0.5">{region.flag}</div>
            <h2 className="text-lg font-bold leading-tight">{region.name}</h2>
            <p className="text-sm text-blue-200">{region.country} · {region.region}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
            <span className="text-lg text-white material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${region.water_stress >= 4.5 ? 'bg-red-500' : 'bg-orange-500'} text-white`}>
            Estrés {region.stress_label} · {region.water_stress}/5
          </span>
          <span className="text-xs text-blue-200">{region.population_m}M hab.</span>
          <span className="text-xs text-blue-200">{region.annual_rainfall_mm}mm/año</span>
        </div>
      </div>

      <div className="flex-shrink-0 px-4 py-3 bg-white border-b border-slate-100">
        <p className="text-xs italic text-slate-600">"{region.key_challenge}"</p>
      </div>

      <div className="grid grid-cols-2 gap-3 p-4">
        <div className="p-3 text-center bg-white border rounded-xl border-slate-200">
          <div className="text-xl font-black text-[#003366]">{region.dc_potential_mw} MW</div>
          <div className="text-[10px] text-slate-500">potencial DC</div>
        </div>
        <div className="p-3 text-center bg-white border rounded-xl border-slate-200">
          <div className="text-xl font-black text-[#003366]">{region.annual_rainfall_mm}</div>
          <div className="text-[10px] text-slate-500">mm/año lluvia</div>
        </div>
      </div>

      <div className="px-4 pb-3">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Fuentes de datos</p>
        <div className="space-y-1.5">
          <DataSource
            label="WRI Aqueduct 2023"
            detail="Índice de estrés hídrico por cuenca hidrográfica"
            value={`${region.water_stress}/5`}
          />
          <DataSource
            label="World Bank Open Data"
            detail="Población total y densidad demográfica"
            value={`${region.population_m}M hab.`}
          />
          <DataSource
            label="Open-Meteo ERA5"
            detail="Precipitación anual histórica (reanálisis climático)"
            value={`${region.annual_rainfall_mm} mm/año`}
          />
          <DataSource
            label="Open-Meteo Archive · Temperatura media anual"
            detail="Media de temperatura diaria 2023 (ERA5 reanálisis)"
            value={temp != null ? `${temp}°C` : '…'}
          />
          {carbon != null && (
            <DataSource
              label="IEA Carbon Intensity 2023"
              detail="Intensidad de carbono de la red eléctrica nacional"
              value={`${carbon} g CO₂/kWh`}
            />
          )}
        </div>
      </div>

      <div className="px-4 pt-2 pb-6 mt-auto">
        <button
          onClick={onAnalyze}
          className="w-full bg-[#003366] hover:bg-[#00254d] text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">smart_toy</span>
          Analizar con 4 Agentes IA
        </button>
      </div>
    </div>
  )
}

function DCPreviewPanel({ dc, onAnalyze, onClose }) {
  const dcFlag = getFlagEmoji(dc.country)
  const estimatedMw = Math.max(5, Math.round(dc.net_count ** 0.65))
  const heatMw = (estimatedMw * 0.4).toFixed(1)
  const temp   = useAnnualTemp(dc.lat, dc.lng)
  const carbon = getCarbonIntensity(dc.country)

  return (
    <div className="flex flex-col w-full h-full overflow-y-auto bg-slate-50">
      <div className="bg-[#0e7490] text-white p-5 flex-shrink-0">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="mb-1 text-xs font-bold tracking-widest uppercase text-cyan-200">Datacenter · PeeringDB</div>
            {dcFlag && <div className="text-2xl mb-0.5">{dcFlag}</div>}
            <h2 className="text-lg font-bold leading-tight">{dc.name}</h2>
            <p className="text-sm text-cyan-200">{dc.city}{dc.city && dc.country ? ', ' : ''}{dc.country}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
            <span className="text-lg text-white material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="p-2 text-center rounded-lg bg-white/10">
            <div className="text-lg font-black">{dc.net_count}</div>
            <div className="text-[10px] text-cyan-200">redes IX</div>
          </div>
          <div className="p-2 text-center rounded-lg bg-white/10">
            <div className="text-lg font-black">~{estimatedMw} MW</div>
            <div className="text-[10px] text-cyan-200">potencia est.</div>
          </div>
          <div className="p-2 text-center rounded-lg bg-white/10">
            <div className="text-lg font-black">{heatMw} MW</div>
            <div className="text-[10px] text-cyan-200">calor residual</div>
          </div>
        </div>
      </div>

      <div className="px-4 py-2.5 bg-white border-b border-slate-100 flex-shrink-0 flex items-center gap-2">
        <span className="material-symbols-outlined text-[14px] text-slate-400">location_on</span>
        <span className="text-xs text-slate-500">{dc.lat?.toFixed(4)}, {dc.lng?.toFixed(4)}</span>
        <span className="text-[9px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-full font-bold ml-auto">GPS · PeeringDB</span>
      </div>

      <div className="p-4 pb-2">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Fuentes de datos</p>
        <div className="space-y-1.5">
          <DataSource
            label="PeeringDB"
            detail="Registro global de instalaciones de interconexión"
            value={`${dc.net_count} redes`}
          />
          <DataSource
            label="WRI Aqueduct 4.0"
            detail="Estrés hídrico de cuenca hidrográfica (CARTO SQL API)"
          />
          <DataSource
            label="Open-Meteo Archive · Temperatura media anual"
            detail="Media de temperatura diaria 2023 (ERA5 reanálisis)"
            value={temp != null ? `${temp}°C` : '…'}
          />
          {carbon != null && (
            <DataSource
              label="IEA Carbon Intensity 2023"
              detail="Intensidad de carbono de la red eléctrica nacional"
              value={`${carbon} g CO₂/kWh`}
            />
          )}
        </div>
      </div>

      <div className="px-4 pt-3 pb-6 mt-auto">
        <button
          onClick={onAnalyze}
          className="w-full bg-[#0e7490] hover:bg-[#0c6174] text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">play_arrow</span>
          Iniciar Análisis con IA
        </button>
      </div>
    </div>
  )
}

// ── Paneles de Resultados ─────────────────────────────────────────────────────

function AnalysisPanel({ region, analysis, viability, loading, onClose }) {
  if (!region) return null
  const urgencyStyle = URGENCY_COLOR[analysis?.hydro_agent?.urgency] ?? URGENCY_COLOR.high

  return (
    <div className="flex flex-col w-full h-full overflow-y-auto bg-slate-50">
      <div className="bg-[#003366] text-white p-5 flex-shrink-0">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="text-2xl mb-0.5">{region.flag}</div>
            <h2 className="text-lg font-bold leading-tight">{region.name}</h2>
            <p className="text-sm text-blue-200">{region.country} · {region.region}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
            <span className="text-lg text-white material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${region.water_stress >= 4.5 ? 'bg-red-500' : 'bg-orange-500'} text-white`}>
            Estrés {region.stress_label} · {region.water_stress}/5
          </span>
          <span className="text-xs text-blue-200">{region.population_m}M hab.</span>
        </div>
      </div>

      <ViabilityBadge viability={viability} />

      {loading && <LoadingSpinner color="[#003366]" msg="Evaluando potencial SeaCool" />}

      {!loading && analysis && (
        <div className="flex-1 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2 p-3 text-center bg-white border rounded-xl">
              <div className="text-2xl font-black text-[#003366]">
                {(analysis.thermal_agent.daily_water_liters / 1_000_000).toFixed(2)}M
              </div>
              <div className="text-xs text-slate-500">litros/día producibles</div>
            </div>
            <div className="p-3 text-center bg-white border rounded-xl">
              <div className="text-lg font-black text-secondary">
                {Number(analysis.distribution_agent.households_supplied).toLocaleString('es-ES')}
              </div>
              <div className="text-[10px] text-slate-500">hogares abastecidos</div>
            </div>
            <div className="p-3 text-center bg-white border rounded-xl">
              <div className="text-lg font-black text-secondary">
                {Number(analysis.distribution_agent.hectares_irrigated).toLocaleString('es-ES')}
              </div>
              <div className="text-[10px] text-slate-500">hectáreas regadas</div>
            </div>
            <div className="p-3 text-center bg-white border rounded-xl">
              <div className="text-lg font-black text-orange-500">
                {Number(analysis.impact_agent.co2_avoided_tonnes_year).toLocaleString('es-ES')}
              </div>
              <div className="text-[10px] text-slate-500">t CO₂ evitadas/año</div>
            </div>
            <div className="p-3 text-center bg-white border rounded-xl">
              <div className="text-lg font-black text-purple-600">{analysis.impact_agent.roi_years} años</div>
              <div className="text-[10px] text-slate-500">payback estimado</div>
            </div>
          </div>

          <AgentBlock icon="water_drop" title="Agente Hídrico" delay={0}>
            <p className="mb-2 text-xs text-slate-700">{analysis.hydro_agent.assessment}</p>
            <div className="flex flex-wrap gap-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${urgencyStyle.badge}`}>
                {String(analysis.hydro_agent.urgency ?? '').toUpperCase()}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                Tendencia: {analysis.hydro_agent.trend}
              </span>
            </div>
          </AgentBlock>

          <AgentBlock icon="thermostat" title="Agente Térmico" delay={150}>
            <p className="mb-2 text-xs text-slate-700">{analysis.thermal_agent.reasoning}</p>
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

          <AgentBlock icon="account_tree" title="Agente Distribuidor" delay={300}>
            <p className="mb-3 text-xs text-slate-700">{analysis.distribution_agent.reasoning}</p>
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

          <AgentBlock icon="trending_up" title="Agente Impacto" delay={450}>
            <div className="p-3 mb-3 rounded-lg bg-slate-50">
              <p className="text-xs italic text-slate-700">"{analysis.impact_agent.pitch}"</p>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3 text-center">
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

          <button
            onClick={() => onViewReport(region.id)}
            className="mt-4 w-full py-3 px-4 rounded-lg bg-[#003366] text-white font-bold text-sm transition-colors hover:bg-[#001e40] active:scale-95"
          >
            <span className="flex items-center justify-center gap-2">
              <span className="material-symbols-outlined">assessment</span>
              Ver en Impact Report
            </span>
          </button>
        </div>
      )}
    </div>
  )
}

function DCAnalysisPanel({ dc, wri, estimatedMw, viability, analysis, loading, onClose }) {
  const stressColor = wri?.bws_score >= 4.5 ? '#ef4444' : wri?.bws_score >= 3.5 ? '#f97316' : '#eab308'
  const urgencyStyle = URGENCY_COLOR[analysis?.hydro_agent?.urgency] ?? URGENCY_COLOR.high
  const dcFlag = getFlagEmoji(dc?.country)
  const displayMw = Number.isFinite(estimatedMw) ? estimatedMw : Math.max(5, Math.round((dc?.net_count ?? 0) ** 0.65))

  return (
    <div className="flex flex-col w-full h-full overflow-y-auto bg-slate-50">
      <div className="bg-[#0e7490] text-white p-5 flex-shrink-0">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="mb-1 text-xs font-bold tracking-widest uppercase text-cyan-200">Datacenter · PeeringDB</div>
            {dcFlag && <div className="text-2xl mb-0.5">{dcFlag}</div>}
            <h2 className="text-lg font-bold leading-tight">{dc.name}</h2>
            <p className="text-sm text-cyan-200">{dc.city}{dc.city && dc.country ? ', ' : ''}{dc.country}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
            <span className="text-lg text-white material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-3">
          <div className="p-2 text-center rounded-lg bg-white/10">
            <div className="text-lg font-black">{displayMw} MW</div>
            <div className="text-[10px] text-cyan-200">calor estimado</div>
          </div>
          <div className="p-2 text-center rounded-lg bg-white/10">
            <div className="text-lg font-black">{dc.net_count}</div>
            <div className="text-[10px] text-cyan-200">redes conectadas</div>
          </div>
        </div>
      </div>

      {wri && (
        <div className="flex-shrink-0 px-4 py-3 bg-white border-b border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Estrés hídrico · WRI Aqueduct 4.0</p>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: stressColor }} />
            <span className="text-sm font-semibold text-slate-700">{wri.bws_label}</span>
            <span className="text-xs text-slate-400">· {wri.bws_score?.toFixed(2)}/5</span>
          </div>
          {wri.basin && <p className="text-[11px] text-slate-400 mt-0.5">Cuenca: {wri.basin} · {wri.dist_km} km</p>}
          <p className="text-[10px] text-slate-400 mt-0.5">Consulta CARTO SQL API en tiempo real</p>
        </div>
      )}

      <ViabilityBadge viability={viability} />

      {loading && <LoadingSpinner color="[#0e7490]" msg="Cruzando WRI + PeeringDB + 4 agentes" />}

      {!loading && analysis && (
        <div className="flex-1 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2 p-3 text-center bg-white border rounded-xl">
              <div className="text-2xl font-black text-[#0e7490]">
                {((analysis.thermal_agent?.daily_water_liters ?? 0) / 1_000_000).toFixed(2)}M L/día
              </div>
              <div className="text-xs text-slate-500">agua/calor para la comunidad</div>
            </div>
            <div className="p-3 text-center bg-white border rounded-xl">
              <div className="text-lg font-black text-secondary">
                {Number(analysis.distribution_agent?.households_supplied ?? 0).toLocaleString('es-ES')}
              </div>
              <div className="text-[10px] text-slate-500">hogares/día</div>
            </div>
            <div className="p-3 text-center bg-white border rounded-xl">
              <div className="text-lg font-black text-purple-600">{analysis.impact_agent?.roi_years}a</div>
              <div className="text-[10px] text-slate-500">payback</div>
            </div>
          </div>

          <AgentBlock icon="water_drop" title="Agente Hídrico" delay={0}>
            <p className="mb-2 text-xs text-slate-700">{analysis.hydro_agent?.assessment}</p>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${urgencyStyle.badge}`}>
              {String(analysis.hydro_agent?.urgency ?? '').toUpperCase()}
            </span>
          </AgentBlock>

          <AgentBlock icon="thermostat" title="Agente Térmico" delay={150}>
            <p className="mb-2 text-xs text-slate-700">{analysis.thermal_agent?.reasoning}</p>
            <div className="flex gap-4">
              <div className="text-center">
                <div className="text-base font-bold text-cyan-600">{analysis.thermal_agent?.dc_heat_mw} MW</div>
                <div className="text-[9px] text-slate-400">calor DC</div>
              </div>
              <div className="text-center">
                <div className="text-base font-bold text-blue-600">
                  {((analysis.thermal_agent?.daily_water_liters ?? 0) / 1000).toFixed(0)}k L
                </div>
                <div className="text-[9px] text-slate-400">excedente/día</div>
              </div>
            </div>
          </AgentBlock>

          <AgentBlock icon="trending_up" title="Agente Impacto" delay={300}>
            <div className="p-3 mb-3 rounded-lg bg-slate-50">
              <p className="text-xs italic text-slate-700">"{analysis.impact_agent?.pitch}"</p>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-2 text-center">
              <div>
                <div className="text-sm font-bold text-purple-600">{analysis.impact_agent?.investment_m_eur}M€</div>
                <div className="text-[9px] text-slate-400">inversión</div>
              </div>
              <div>
                <div className="text-sm font-bold text-purple-600">{analysis.impact_agent?.bankability_score}/10</div>
                <div className="text-[9px] text-slate-400">bankabilidad</div>
              </div>
              <div>
                <div className="text-sm font-bold text-orange-500">
                  {Number(analysis.impact_agent?.co2_avoided_tonnes_year ?? 0).toLocaleString()}
                </div>
                <div className="text-[9px] text-slate-400">t CO₂/año</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {(analysis.impact_agent?.sdgs ?? []).map(s => (
                <span key={s} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary/10 text-secondary">ODS {s}</span>
              ))}
            </div>
          </AgentBlock>

          <div className="text-[9px] text-slate-400 pt-1">
            MW estimado: net_count^0.65 · WRI: CARTO SQL API tiempo real · IA: Groq llama-3.3-70b
          </div>

          <button
            onClick={() => onViewReport(`dc_${dc.name}`)}
            className="mt-4 w-full py-3 px-4 rounded-lg bg-[#0e7490] text-white font-bold text-sm transition-colors hover:bg-[#0d5c70] active:scale-95"
          >
            <span className="flex items-center justify-center gap-2">
              <span className="material-symbols-outlined">assessment</span>
              Ver en Impact Report
            </span>
          </button>
        </div>
      )}
    </div>
  )
}

function LoadingSpinner({ color, msg }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-4 py-12">
      <div className="relative w-14 h-14">
        <div className={`absolute inset-0 rounded-full border-4 border-slate-100`} />
        <div className={`absolute inset-0 rounded-full border-4 border-t-${color} animate-spin`} />
      </div>
      <div className="text-center">
        <p className={`text-sm font-semibold text-${color}`}>Agentes analizando...</p>
        <p className="mt-1 text-xs text-slate-400">{msg}</p>
      </div>
    </div>
  )
}

// ── Dashboard principal ───────────────────────────────────────────────────────

export default function GlobalDashboard() {
  const [selectedRegion, setSelectedRegion] = useState(null)
  const [selectedDC, setSelectedDC]         = useState(null)
  const [panelData, setPanelData]           = useState(null)
  const [panelMode, setPanelMode]           = useState(null)  // 'preview' | 'analysis'
  const [analysis, setAnalysis]             = useState(null)
  const [loading, setLoading]               = useState(false)
  const [error, setError]                   = useState(null)
  const dcCache = useRef({})

  function resetPanel() {
    setSelectedRegion(null)
    setSelectedDC(null)
    setPanelData(null)
    setPanelMode(null)
    setAnalysis(null)
    setError(null)
  }

  function handleRegionClick(region) {
    // Transición directa: nunca pasa por panelData=null (sin parpadeo)
    setSelectedDC(null)
    setSelectedRegion(region)
    setAnalysis(null)
    setError(null)
    setPanelData({ type: 'region', item: region })
    setPanelMode('preview')
  }

  function handleDCClick(dc) {
    const cached = dcCache.current[dc.id]
    setSelectedRegion(null)
    setSelectedDC(dc)
    setError(null)
    if (cached) {
      setAnalysis(cached.analysis)
      setPanelData({ type: 'dc', item: dc, wri: cached.wri, estimated_mw: cached.estimated_mw, viability: cached.viability })
      setPanelMode('analysis')
    } else {
      setAnalysis(null)
      setPanelData({ type: 'dc', item: dc })
      setPanelMode('preview')
    }
  }

  async function handleStartAnalysis() {
    setPanelMode('analysis')
    setLoading(true)
    setError(null)
    try {
      if (panelData.type === 'region') {
        const result = await analyzeRegion(panelData.item.id)
        setAnalysis(result.analysis)
        setPanelData(prev => ({ ...prev, viability: result.viability }))
        addReport({
          id:       panelData.item.id,
          type:     'region',
          name:     panelData.item.name,
          region:   panelData.item,
          analysis: result.analysis,
          viability: result.viability,
        })
      } else {
        const result = await analyzeDC(panelData.item)
        const cached = {
          analysis:     result.analysis,
          wri:          result.wri,
          estimated_mw: result.estimated_mw,
          viability:    result.viability,
        }
        dcCache.current[panelData.item.id] = cached
        setAnalysis(result.analysis)
        setPanelData(prev => ({
          ...prev,
          wri:          result.wri,
          estimated_mw: result.estimated_mw,
          viability:    result.viability,
        }))
        addReport({
          id:           `dc-${panelData.item.id}`,
          type:         'dc',
          name:         panelData.item.name,
          dc:           panelData.item,
          wri:          result.wri,
          estimated_mw: result.estimated_mw,
          viability:    result.viability,
          analysis:     result.analysis,
        })
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="flex" style={{ height: '100%' }}>
        <div className="relative flex-1 min-w-0">
          {error && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-2 rounded-lg shadow">
              Error: {error}
            </div>
          )}
          <SeaCoolMap
            height="100%"
            onRegionClick={handleRegionClick}
            onDCClick={handleDCClick}
            selectedId={selectedRegion?.id}
            selectedDCId={selectedDC?.id}
          />
        </div>

        {panelData && (
          <div className="w-[420px] flex-shrink-0 border-l border-slate-200 overflow-hidden">
            {panelMode === 'preview' && panelData.type === 'region' && (
              <RegionPreviewPanel region={panelData.item} onAnalyze={handleStartAnalysis} onClose={resetPanel} />
            )}
            {panelMode === 'preview' && panelData.type === 'dc' && (
              <DCPreviewPanel dc={panelData.item} onAnalyze={handleStartAnalysis} onClose={resetPanel} />
            )}
            {panelMode === 'analysis' && panelData.type === 'region' && (
              <AnalysisPanel region={panelData.item} analysis={analysis} viability={panelData.viability} loading={loading} onClose={resetPanel} />
            )}
            {panelMode === 'analysis' && panelData.type === 'dc' && (
              <DCAnalysisPanel
                dc={panelData.item}
                wri={panelData.wri}
                estimatedMw={panelData.estimated_mw}
                viability={panelData.viability}
                analysis={analysis}
                loading={loading}
                onClose={resetPanel}
              />
            )}
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
