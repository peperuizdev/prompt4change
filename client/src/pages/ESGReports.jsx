import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { jsPDF } from 'jspdf'
import MetricCard from '../components/ui/MetricCard'
import { getRegions } from '../api/client'
import { useReports } from '../store'

// Abrevia números grandes para que no se salgan de las cards
function fmt(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

// ── Constantes ────────────────────────────────────────────────────────────────

const ODS = [
  { num: 6,  color: '#26bde2', icon: 'water_full',  title: 'Agua limpia',     desc: 'Acceso a agua potable para comunidades con estrés hídrico crítico.' },
  { num: 7,  color: '#fcc30b', icon: 'bolt',         title: 'Energía limpia',  desc: 'Valorización del calor residual de datacenters en economía circular.' },
  { num: 2,  color: '#e5243b', icon: 'psychiatry',   title: 'Hambre cero',     desc: 'Riego sostenible para áreas agrícolas expuestas a sequía estival.' },
  { num: 13, color: '#3f7e44', icon: 'public',        title: 'Acción climática', desc: 'Menos emisiones y más resiliencia en territorios costeros vulnerables.' },
]

const HIGHLIGHTS = [
  { label: 'regiones monitorizadas',   icon: 'language',        color: '#003366', getValue: m => m.regions,       getTrend: m => `${m.criticalZones} en estrés extremo` },
  { label: 'potencial DC aprovechable', icon: 'developer_board', color: '#d98a00', getValue: m => `${m.dcPotentialMW.toLocaleString('es-ES')} MW`, getTrend: () => 'calor residual convertible' },
  { label: 'agua producible al día',   icon: 'water_drop',      color: '#006d37', getValue: m => `${m.dailyLitersM.toLocaleString('es-ES')}M L`, getTrend: m => `${m.annualM3M}M m³/año` },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildMetrics(regions = []) {
  const totalRegions    = regions.length || 34
  const criticalZones   = regions.filter(r => r.water_stress >= 4.5).length || 16
  const populationM     = regions.reduce((a, r) => a + (r.population_m || 0), 0) || 207
  const dcPotentialMW   = regions.reduce((a, r) => a + (r.dc_potential_mw || 0), 0) || 6105
  const dailyLitersM    = +(dcPotentialMW * 15_000 / 1_000_000).toFixed(1)
  const annualM3M       = +(dailyLitersM * 365 / 1_000).toFixed(1)
  const households      = Math.round((dcPotentialMW * 15_000 * 0.35) / 520)
  const hectares        = Math.round((dcPotentialMW * 15_000 * 0.6) / 4_500)
  const co2Tonnes       = Math.round((dcPotentialMW * 15_000 * 365 * 0.5) / 1_000)
  const investmentBn    = +(dcPotentialMW * 1.5 / 1_000).toFixed(1)
  return { regions: totalRegions, criticalZones, populationM: Math.round(populationM), dcPotentialMW, dailyLitersM, annualM3M, households, hectares, co2Tonnes, investmentBn }
}

function sortedOpportunities(regions = []) {
  return [...regions].sort((a, b) => (b.water_stress || 0) - (a.water_stress || 0))
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 text-sm font-bold rounded-lg transition-colors ${
        active
          ? 'bg-[#003366] text-white shadow-sm'
          : 'text-slate-500 hover:text-[#003366] hover:bg-slate-100'
      }`}
    >
      {children}
    </button>
  )
}

function StressBar({ score }) {
  const pct   = Math.min((score / 5) * 100, 100)
  const color = score >= 4.5 ? '#ef4444' : score >= 4.0 ? '#f97316' : score >= 3.5 ? '#eab308' : '#22c55e'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[10px] font-black" style={{ color }}>{score?.toFixed(1)}</span>
    </div>
  )
}

function OpportunityCard({ region }) {
  const stress      = region.water_stress ?? 0
  const stressLabel = stress >= 4.5 ? 'Crítico' : stress >= 4.0 ? 'Alto' : stress >= 3.5 ? 'Moderado' : 'Bajo'
  const stressBg    = stress >= 4.5 ? 'bg-red-100 text-red-700' : stress >= 4.0 ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'

  return (
    <div className="flex flex-col gap-3 p-5 transition-shadow bg-white border shadow-sm rounded-xl border-slate-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div>
          {region.flag && <div className="mb-1 text-xl">{region.flag}</div>}
          <h3 className="font-bold text-[#001e40] text-sm leading-tight">{region.name}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{region.country}{region.region ? ` · ${region.region}` : ''}</p>
        </div>
        <span className={`text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ${stressBg}`}>{stressLabel}</span>
      </div>

      <div>
        <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
          <span>ESTRÉS HÍDRICO</span>
          <span>{stress.toFixed(1)}/5</span>
        </div>
        <StressBar score={stress} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-slate-50 rounded-lg p-2.5 text-center">
          <div className="text-base font-black text-[#003366]">{region.dc_potential_mw} MW</div>
          <div className="text-[9px] text-slate-400 uppercase tracking-wide">potencial DC</div>
        </div>
        <div className="bg-slate-50 rounded-lg p-2.5 text-center">
          <div className="text-base font-black text-[#006d37]">{region.population_m}M</div>
          <div className="text-[9px] text-slate-400 uppercase tracking-wide">habitantes</div>
        </div>
      </div>

      {(region.key_challenge || region.annual_rainfall_mm) && (
        <p className="text-[11px] text-slate-500 italic leading-snug border-t border-slate-100 pt-2">
          {region.key_challenge ?? `${region.annual_rainfall_mm} mm/año de precipitación`}
        </p>
      )}
    </div>
  )
}

function ReportCard({ report }) {
  const isRegion = report.type === 'region'
  const analysis = report.analysis
  const time     = report.timestamp
    ? new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }).format(new Date(report.timestamp))
    : ''

  const waterLiters = analysis?.thermal_agent?.daily_water_liters
  const households  = analysis?.distribution_agent?.households_supplied
  const co2         = analysis?.impact_agent?.co2_avoided_tonnes_year
  const pitch       = analysis?.impact_agent?.pitch
  const sdgs        = analysis?.impact_agent?.sdgs ?? []
  const roi         = analysis?.impact_agent?.roi_years
  const viability   = report.viability

  const viabilityCls = {
    green:  'bg-green-50 text-green-700 border-green-200',
    blue:   'bg-blue-50 text-blue-700 border-blue-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    gray:   'bg-slate-100 text-slate-500 border-slate-200',
  }[viability?.color] ?? ''

  return (
    <div className="flex flex-col gap-3 p-5 transition-shadow bg-white border shadow-sm rounded-xl border-slate-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg shrink-0 ${isRegion ? 'bg-blue-50' : 'bg-cyan-50'}`}>
            <span className={`material-symbols-outlined text-[18px] ${isRegion ? 'text-[#003366]' : 'text-[#0e7490]'}`}>
              {isRegion ? 'location_on' : 'developer_board'}
            </span>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-[#001e40] text-sm leading-tight">{report.name}</h3>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${isRegion ? 'bg-blue-100 text-blue-700' : 'bg-cyan-100 text-cyan-700'}`}>
                {isRegion ? 'REGIÓN' : 'DATACENTER'}
              </span>
            </div>
            {isRegion && report.region && (
              <p className="text-xs text-slate-500 mt-0.5">{report.region.country}{report.region.region ? ` · ${report.region.region}` : ''}</p>
            )}
            {!isRegion && report.dc && (
              <p className="text-xs text-slate-500 mt-0.5">{report.dc.city}{report.dc.city && report.dc.country ? ', ' : ''}{report.dc.country}</p>
            )}
          </div>
        </div>
        <span className="text-[10px] text-slate-400 shrink-0 mt-0.5">{time}</span>
      </div>

      {viability && (
        <div className={`rounded-lg px-3 py-2 border text-[11px] font-semibold flex items-center gap-1.5 ${viabilityCls}`}>
          <span className="material-symbols-outlined text-[14px]">{viability.icon}</span>
          {viability.label}
        </div>
      )}

      {pitch && (
        <div className="px-3 py-2 rounded-lg bg-slate-50">
          <p className="text-xs italic leading-snug text-slate-600">"{pitch}"</p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {waterLiters != null && (
          <div className="p-2 text-center rounded-lg bg-slate-50">
            <div className="text-sm font-black text-[#003366]">{(waterLiters / 1_000_000).toFixed(2)}M</div>
            <div className="text-[9px] text-slate-400">L/día</div>
          </div>
        )}
        {households != null && (
          <div className="p-2 text-center rounded-lg bg-slate-50">
            <div className="text-sm font-black text-[#006d37]">{fmt(Number(households))}</div>
            <div className="text-[9px] text-slate-400">hogares</div>
          </div>
        )}
        {co2 != null && (
          <div className="p-2 text-center rounded-lg bg-slate-50">
            <div className="text-sm font-black text-orange-500">{fmt(Number(co2))}</div>
            <div className="text-[9px] text-slate-400">t CO₂/año</div>
          </div>
        )}
      </div>

      {(sdgs.length > 0 || roi) && (
        <div className="flex flex-wrap gap-1 pt-1 border-t border-slate-100">
          {sdgs.map(s => (
            <span key={s} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary/10 text-secondary">ODS {s}</span>
          ))}
          {roi && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">{roi}a payback</span>
          )}
        </div>
      )}
    </div>
  )
}

function EmptyAnalyses() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="flex items-center justify-center w-16 h-16 mb-4 bg-slate-100 rounded-2xl">
        <span className="material-symbols-outlined text-[32px] text-slate-400">analytics</span>
      </div>
      <h3 className="font-bold text-[#001e40] text-base mb-2">Aún no hay análisis</h3>
      <p className="max-w-xs text-sm text-slate-500">
        Ve al mapa, pulsa sobre una región o datacenter y lanza un análisis IA. Los resultados aparecerán aquí automáticamente.
      </p>
    </div>
  )
}

// ── PDF ───────────────────────────────────────────────────────────────────────

function downloadPDF(metrics, regions, reports) {
  const doc  = new jsPDF()
  const date = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })

  doc.setFillColor(0, 51, 102)
  doc.rect(0, 0, 210, 42, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.text('SeaCool — Impact Report', 15, 20)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`Generado: ${date} · WRI Aqueduct 2023 · CC BY 4.0`, 15, 32)

  // Resumen global
  doc.setTextColor(25, 28, 29)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text('Resumen de impacto global', 15, 56)

  const lines = [
    ['Regiones monitorizadas',       `${metrics.regions}`],
    ['Zonas en estrés extremo',       `${metrics.criticalZones}`],
    ['Potencial DC total',            `${metrics.dcPotentialMW.toLocaleString('es-ES')} MW`],
    ['Agua producida por día',        `${metrics.dailyLitersM.toLocaleString('es-ES')} M L`],
    ['Agua producida por año',        `${metrics.annualM3M} M m³`],
    ['Hogares abastecidos',           `${metrics.households.toLocaleString('es-ES')}`],
    ['CO₂ evitado por año',           `${metrics.co2Tonnes.toLocaleString('es-ES')} t`],
    ['Inversión estimada',            `~${metrics.investmentBn} B€`],
  ]
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  lines.forEach(([label, value], i) => {
    const y = 68 + i * 10
    doc.setTextColor(67, 71, 79)
    doc.text(label, 15, y)
    doc.setTextColor(0, 109, 55)
    doc.setFont('helvetica', 'bold')
    doc.text(value, 126, y)
    doc.setFont('helvetica', 'normal')
  })

  // ODS
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(25, 28, 29)
  doc.text('ODS conectados', 15, 160)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(67, 71, 79)
  ;['ODS 6 — Agua limpia y saneamiento', 'ODS 7 — Energía asequible y no contaminante', 'ODS 2 — Hambre cero', 'ODS 13 — Acción por el clima'].forEach((line, i) => {
    doc.text(`• ${line}`, 15, 172 + i * 9)
  })

  // Session analyses
  if (reports.length > 0) {
    doc.addPage()
    doc.setFillColor(0, 51, 102)
    doc.rect(0, 0, 210, 28, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.text(`Análisis realizados (${reports.length})`, 15, 18)

    let y = 40
    reports.slice(0, 8).forEach(r => {
      const tag = r.type === 'region' ? 'REGIÓN' : 'DATACENTER'
      doc.setTextColor(0, 51, 102)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.text(`${tag}: ${r.name}`, 15, y)
      y += 7
      const wa = r.analysis?.thermal_agent?.daily_water_liters
      const hh = r.analysis?.distribution_agent?.households_supplied
      const co = r.analysis?.impact_agent?.co2_avoided_tonnes_year
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(67, 71, 79)
      if (wa) doc.text(`Agua: ${(wa / 1_000_000).toFixed(2)}M L/día`, 20, y)
      if (hh) doc.text(`Hogares: ${Number(hh).toLocaleString('es-ES')}`, 80, y)
      if (co) doc.text(`CO₂: ${Number(co).toLocaleString('es-ES')} t/año`, 145, y)
      y += 9
      if (r.analysis?.impact_agent?.pitch) {
        doc.setTextColor(100, 100, 100)
        doc.text(`"${r.analysis.impact_agent.pitch}"`, 20, y, { maxWidth: 170 })
        y += 14
      }
      y += 3
    })
  }

  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text('Producción estimada: 15.000 L/día por MW térmico · SeaCool © 2026', 15, 290)

  doc.save(`seacool-impact-${new Date().toISOString().slice(0, 10)}.pdf`)
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function ESGReports() {
  const [activeTab, setActiveTab] = useState('opportunities')
  const [regions,   setRegions]   = useState([])
  const reports = useReports()

  useEffect(() => {
    getRegions().then(setRegions).catch(() => setRegions([]))
  }, [])

  const metrics      = useMemo(() => buildMetrics(regions), [regions])
  const opportunities = useMemo(() => sortedOpportunities(regions), [regions])

  const dateLabel = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date())

  return (
    <div className="min-h-screen px-4 py-6 mx-auto max-w-container-max sm:px-6 lg:px-10 sm:py-8">
      <div className="flex flex-col gap-6">

        {/* ── Header ── */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
              <span className="px-2.5 py-1 rounded-full bg-white border border-slate-200 text-[#003366]">Impacto ESG</span>
              <span>Escala global</span>
              <span>·</span>
              <span>{dateLabel}</span>
            </div>
            <h1 className="text-[clamp(2rem,4vw,3.25rem)] leading-[1.05] font-black tracking-tight text-[#001e40]">
              Oportunidades SeaCool &amp; análisis realizados.
            </h1>
            <p className="max-w-2xl text-sm sm:text-base text-on-surface-variant">
              Explora las zonas con mayor potencial para implantar SeaCool y consulta los análisis de IA completados durante la sesión.
            </p>
          </div>

          <button
            onClick={() => downloadPDF(metrics, opportunities, reports)}
            className="inline-flex items-center justify-center gap-2 self-start rounded-lg bg-[#003366] px-5 py-3 text-sm font-bold text-white shadow-[0_8px_24px_-14px_rgba(0,30,64,0.55)] transition-transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            Descargar PDF
          </button>
        </div>

        {/* ── Tabs ── */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-fit">
          <TabButton active={activeTab === 'opportunities'} onClick={() => setActiveTab('opportunities')}>
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px]">travel_explore</span>
              Oportunidades
            </span>
          </TabButton>
          <TabButton active={activeTab === 'analyses'} onClick={() => setActiveTab('analyses')}>
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px]">analytics</span>
              Análisis realizados
              {reports.length > 0 && (
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${activeTab === 'analyses' ? 'bg-white/20 text-white' : 'bg-[#003366] text-white'}`}>
                  {reports.length}
                </span>
              )}
            </span>
          </TabButton>
        </div>

        {/* ── Tab: Oportunidades ── */}
        {activeTab === 'opportunities' && (
          <>
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-[16px] text-slate-400">info</span>
              <p className="text-xs text-slate-500">Regiones con mayor estrés hídrico, ordenadas por urgencia. Potencial para desplegar infraestructura SeaCool.</p>
            </div>

            {opportunities.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {opportunities.map(r => <OpportunityCard key={r.id} region={r} />)}
              </div>
            ) : (
              <div className="flex items-center justify-center py-12 text-sm text-slate-400">
                <span className="mr-2 material-symbols-outlined">hourglass_empty</span>
                Cargando regiones...
              </div>
            )}

            {/* Resumen ejecutivo */}
            <section className="grid gap-6 mt-2 lg:grid-cols-12">
              <div className="lg:col-span-8 rounded-2xl border border-slate-200 bg-[#001e40] p-6 sm:p-8 text-white shadow-[0_12px_36px_-24px_rgba(0,0,0,0.5)] overflow-hidden relative">
                <div className="absolute inset-0 opacity-[0.04] bg-[linear-gradient(90deg,rgba(255,255,255,0.8)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.8)_1px,transparent_1px)] bg-[size:36px_36px]" />
                <div className="relative z-10 flex flex-col gap-6">
                  <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-200">
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">Resumen ejecutivo</span>
                    <span>WRI Aqueduct 2023</span>
                  </div>
                  <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                    <div className="space-y-3">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-200">Agua potencial al día</p>
                      <div className="flex flex-wrap items-baseline gap-3">
                        <span className="text-[clamp(3rem,8vw,5rem)] font-black leading-none text-white">
                          {metrics.dailyLitersM.toLocaleString('es-ES')}M
                        </span>
                        <span className="text-lg font-semibold text-blue-200 sm:text-2xl">litros</span>
                      </div>
                      <p className="max-w-2xl text-sm sm:text-base text-blue-100/80">
                        Si el potencial detectado en regiones costeras se activara con SeaCool, el sistema podría convertir calor residual en un flujo continuo de agua útil para consumo y agricultura.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:min-w-[260px]">
                      {[
                        { label: 'Al año',      value: `${metrics.annualM3M}M`, unit: 'm³' },
                        { label: 'CO₂ evitado', value: fmt(metrics.co2Tonnes),  unit: 't'  },
                        { label: 'Hogares',     value: fmt(metrics.households),  unit: ''   },
                        { label: 'Inversión',   value: `~${metrics.investmentBn}B€`, unit: '' },
                      ].map(({ label, value, unit }) => (
                        <div key={label} className="p-4 border rounded-xl border-white/10 bg-white/5">
                          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-200">{label}</div>
                          <div className="mt-2 text-[clamp(1.35rem,3vw,1.8rem)] font-black leading-none text-white break-all">{value}</div>
                          {unit && <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-200">{unit}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <aside className="lg:col-span-4 rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Lectura rápida</p>
                    <h2 className="mt-1 text-xl font-bold text-[#001e40]">Señales clave</h2>
                  </div>
                  <span className="rounded-full bg-secondary-container px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-on-secondary-container">Stable</span>
                </div>
                <div className="mt-5 space-y-4">
                  <div className="p-4 rounded-xl bg-slate-50">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Población cubierta</p>
                    <div className="mt-2 text-2xl font-black text-[#003366]">{metrics.populationM}M</div>
                    <p className="mt-1 text-sm text-on-surface-variant">personas en regiones monitorizadas</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 border rounded-xl border-slate-200">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Zonas críticas</p>
                      <p className="mt-2 text-2xl font-black text-[#ba1a1a]">{metrics.criticalZones}</p>
                    </div>
                    <div className="p-4 border rounded-xl border-slate-200">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Potencial DC</p>
                      <p className="mt-2 text-2xl font-black text-[#003366]">{metrics.dcPotentialMW.toLocaleString('es-ES')}</p>
                    </div>
                  </div>
                </div>
              </aside>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {HIGHLIGHTS.map(card => (
                <MetricCard
                  key={card.label}
                  label={card.label}
                  value={card.getValue(metrics)}
                  unit=""
                  trend={card.getTrend(metrics)}
                  icon={card.icon}
                  barColor={card.color}
                  barPct={card.label === 'regiones monitorizadas' ? 84 : card.label === 'potencial DC aprovechable' ? 72 : 92}
                />
              ))}
            </section>

            {/* ODS */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)]">
              <div className="flex items-end justify-between gap-4 mb-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Alineación estratégica</p>
                  <h2 className="mt-1 text-xl font-bold text-[#001e40]">ODS relevantes</h2>
                </div>
                <span className="rounded-full border border-slate-200 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">UN SDGs</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {ODS.map(({ num, color, icon, title, desc }) => (
                  <article key={num} className="rounded-xl border border-slate-200 p-4 transition-transform hover:-translate-y-0.5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg" style={{ backgroundColor: `${color}15` }}>
                        <span className="material-symbols-outlined text-[20px]" style={{ color }}>{icon}</span>
                      </div>
                      <span className="text-xs font-black" style={{ color }}>ODS {num}</span>
                    </div>
                    <h3 className="text-sm font-bold text-[#001e40]">{title}</h3>
                    <p className="mt-1 text-sm leading-6 text-on-surface-variant">{desc}</p>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}

        {/* ── Tab: Análisis realizados ── */}
        {activeTab === 'analyses' && (
          <>
            {reports.length === 0 ? (
              <EmptyAnalyses />
            ) : (
              <>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-slate-500">
                    {reports.length} análisis completado{reports.length !== 1 ? 's' : ''} en esta sesión
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {reports.map(r => <ReportCard key={r.id} report={r} />)}
                </div>
              </>
            )}

            {/* ODS también en tab 2 */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)]">
              <div className="flex items-end justify-between gap-4 mb-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Alineación estratégica</p>
                  <h2 className="mt-1 text-xl font-bold text-[#001e40]">ODS relevantes</h2>
                </div>
                <span className="rounded-full border border-slate-200 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">UN SDGs</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {ODS.map(({ num, color, icon, title, desc }) => (
                  <article key={num} className="rounded-xl border border-slate-200 p-4 transition-transform hover:-translate-y-0.5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg" style={{ backgroundColor: `${color}15` }}>
                        <span className="material-symbols-outlined text-[20px]" style={{ color }}>{icon}</span>
                      </div>
                      <span className="text-xs font-black" style={{ color }}>ODS {num}</span>
                    </div>
                    <h3 className="text-sm font-bold text-[#001e40]">{title}</h3>
                    <p className="mt-1 text-sm leading-6 text-on-surface-variant">{desc}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="flex items-start gap-3 p-5 border rounded-2xl border-slate-200 bg-slate-50 sm:p-6">
              <span className="material-symbols-outlined text-slate-400 text-[18px] shrink-0 mt-0.5">info</span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Metodología y fuentes</p>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                  Análisis generados por 4 agentes IA (Hídrico, Térmico, Distribuidor, Impacto) usando datos de WRI Aqueduct 4.0, PeeringDB, Open-Meteo ERA5 e IEA Carbon Intensity 2023. Producción estimada: 15.000 L/día por MW térmico. CO₂ reducido frente a desalinización eléctrica convencional.
                </p>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}
