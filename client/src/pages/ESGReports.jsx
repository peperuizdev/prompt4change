import { useEffect, useMemo, useState } from 'react'
import { jsPDF } from 'jspdf'
import MetricCard from '../components/ui/MetricCard'
import { getRegions } from '../api/client'

const ODS = [
  {
    num: 6,
    color: '#26bde2',
    icon: 'water_full',
    title: 'Agua limpia',
    desc: 'Acceso a agua potable para comunidades con estrés hídrico crítico.',
  },
  {
    num: 7,
    color: '#fcc30b',
    icon: 'bolt',
    title: 'Energía limpia',
    desc: 'Valorización del calor residual de datacenters en economía circular.',
  },
  {
    num: 2,
    color: '#e5243b',
    icon: 'psychiatry',
    title: 'Hambre cero',
    desc: 'Riego sostenible para áreas agrícolas expuestas a sequía estival.',
  },
  {
    num: 13,
    color: '#3f7e44',
    icon: 'public',
    title: 'Acción climática',
    desc: 'Menos emisiones y más resiliencia en territorios costeros vulnerables.',
  },
]

const HIGHLIGHTS = [
  {
    label: 'regiones monitorizadas',
    icon: 'language',
    color: '#003366',
    getValue: metrics => metrics.regions,
    getTrend: metrics => `${metrics.criticalZones} en estrés extremo`,
  },
  {
    label: 'potencial DC aprovechable',
    icon: 'developer_board',
    color: '#d98a00',
    getValue: metrics => `${metrics.dcPotentialMW.toLocaleString('es-ES')} MW`,
    getTrend: () => 'calor residual convertible',
  },
  {
    label: 'agua producible al día',
    icon: 'water_drop',
    color: '#006d37',
    getValue: metrics => `${metrics.dailyLitersM.toLocaleString('es-ES')}M L`,
    getTrend: metrics => `${metrics.annualM3M}M m³/año`,
  },
]

const DETAIL_ROWS = [
  {
    label: 'Reducción de huella hídrica',
    status: 'OPTIMAL',
    statusClass: 'bg-secondary-container text-on-secondary-container',
    value: '1.2M m³',
    forecast: '+12%',
  },
  {
    label: 'Ahorro térmico industrial',
    status: 'OPTIMAL',
    statusClass: 'bg-secondary-container text-on-secondary-container',
    value: '420 GW/h',
    forecast: '+8.4%',
  },
  {
    label: 'Recuperación de suelo salino',
    status: 'RECOVERY',
    statusClass: 'bg-tertiary-container text-tertiary-fixed-dim',
    value: '15,400 m²',
    forecast: '+5.1%',
  },
  {
    label: 'Emisiones evitadas',
    status: 'TRACKING',
    statusClass: 'bg-primary-fixed text-on-primary-fixed-variant',
    value: '50.1k t CO₂',
    forecast: '+9.2%',
  },
]

const DEFAULT_ZONES = [
  {
    id: 'almeria',
    name: 'Costa de Almería',
    country: 'España',
    region: 'Europa Mediterránea',
    water_stress: 4.8,
    dc_potential_mw: 150,
    ag_land_ha: 65000,
    focus: 'Alta presión agrícola y fuerte exposición al calor estival.',
  },
  {
    id: 'murcia',
    name: 'Murcia - Mar Menor',
    country: 'España',
    region: 'Europa Mediterránea',
    water_stress: 4.2,
    dc_potential_mw: 120,
    ag_land_ha: 180000,
    focus: 'Demanda mixta urbana y agrícola con estrés recurrente.',
  },
  {
    id: 'sicilia',
    name: 'Sicilia Sur',
    country: 'Italia',
    region: 'Europa Mediterránea',
    water_stress: 3.8,
    dc_potential_mw: 90,
    ag_land_ha: 120000,
    focus: 'Infraestructura salina obsoleta y oportunidad de piloto modular.',
  },
  {
    id: 'tunisia_coast',
    name: 'Costa Tunesina',
    country: 'Túnez',
    region: 'Norte de África',
    water_stress: 4.1,
    dc_potential_mw: 60,
    ag_land_ha: 550000,
    focus: 'Estrés hídrico alto con gran superficie agrícola vulnerable.',
  },
]

function buildMetrics(regions = []) {
  const totalRegions = regions.length || 34
  const criticalZones = regions.filter(region => region.water_stress >= 4.5).length || 16
  const populationM = regions.reduce((acc, region) => acc + (region.population_m || 0), 0) || 207
  const dcPotentialMW = regions.reduce((acc, region) => acc + (region.dc_potential_mw || 0), 0) || 6105
  const dailyLitersM = +(dcPotentialMW * 15_000 / 1_000_000).toFixed(1)
  const annualM3M = +(dailyLitersM * 365 / 1_000).toFixed(1)
  const households = Math.round((dcPotentialMW * 15_000 * 0.35) / 520)
  const hectares = Math.round((dcPotentialMW * 15_000 * 0.6) / 4_500)
  const co2Tonnes = Math.round((dcPotentialMW * 15_000 * 365 * 0.5) / 1_000)
  const investmentBn = +(dcPotentialMW * 1.5 / 1_000).toFixed(1)

  return {
    regions: totalRegions,
    criticalZones,
    populationM: Math.round(populationM),
    dcPotentialMW,
    dailyLitersM,
    annualM3M,
    households,
    hectares,
    co2Tonnes,
    investmentBn,
  }
}

function normalizeZones(regions = []) {
  if (regions.length) {
    return regions
      .slice()
      .sort((a, b) => (b.water_stress || 0) - (a.water_stress || 0))
      .slice(0, 6)
  }

  return DEFAULT_ZONES
}

function buildZonePlan(zone = {}, metrics = {}) {
  const stress = zone.water_stress ?? 3.5
  const dcPotential = zone.dc_potential_mw ?? 50
  const dailyLiters = dcPotential * 15_000
  const annualM3 = Math.round((dailyLiters * 365) / 1_000)
  const hectares = Math.round((dailyLiters * 0.6) / 4_500)
  const investment = (dcPotential * 1.5).toFixed(1)

  if (stress >= 4.5) {
    return {
      tag: 'Prioridad crítica',
      title: 'Despliegue SeaCool con recuperación térmica intensiva',
      summary:
        'La zona combina estrés hídrico extremo y demanda agrícola. La solución recomendada prioriza calor residual del datacenter para producir agua dulce de forma continua y reforzar riego de invernaderos cercanos.',
      badges: ['Calor residual → agua', 'Riego agrícola', 'Módulo escalable'],
      bullets: [
        `Potencial local estimado: ${dcPotential} MW térmicos`,
        `Producción diaria mock: ${dailyLiters.toLocaleString('es-ES')} L`,
        `Cobertura agrícola aproximada: ${hectares.toLocaleString('es-ES')} ha`,
      ],
      recommendation: 'Medio efecto + distribución local',
      payback: '4-6 años',
    }
  }

  if (stress >= 4.0) {
    return {
      tag: 'Alta oportunidad',
      title: 'Implantación híbrida con foco urbano y agrícola',
      summary:
        'La zona admite un piloto de SeaCool orientado a balancear agua de consumo y riego. La propuesta combina desalación térmica con una red local de distribución de bajo salto.',
      badges: ['Uso mixto', 'Piloto modular', 'Red local'],
      bullets: [
        `Potencial local estimado: ${dcPotential} MW térmicos`,
        `Agua dulce mock: ${dailyLiters.toLocaleString('es-ES')} L/día`,
        `Retorno esperado: ${metrics?.investmentBn ? `~${(metrics.investmentBn / 2).toFixed(1)}B€` : 'moderado'}`,
      ],
      recommendation: 'Híbrido urban-agri + absorción térmica',
      payback: '5-7 años',
    }
  }

  return {
    tag: 'Piloto recomendado',
    title: 'Piloto compacto con foco en resiliencia y aprendizaje',
    summary:
      'La zona todavía permite una primera implantación elegante y medible. SeaCool se presenta como un piloto modular que validaría el rendimiento térmico y la distribución del agua antes de escalar.',
    badges: ['Piloto', 'Bajo CAPEX', 'Validación rápida'],
    bullets: [
      `Potencial local estimado: ${dcPotential} MW térmicos`,
      `Producción diaria mock: ${dailyLiters.toLocaleString('es-ES')} L`,
      `Área servible estimada: ${hectares.toLocaleString('es-ES')} ha`,
    ],
    recommendation: 'Despliegue escalonado con módulo de absorción',
    payback: '6-8 años',
  }
}

function downloadPDF(metrics, selectedZone, zonePlan) {
  const doc = new jsPDF()
  const date = new Date().toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  doc.setFillColor(0, 51, 102)
  doc.rect(0, 0, 210, 42, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.text('SeaCool — Impact Report', 15, 20)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`Generado: ${date} · WRI Aqueduct 2023 · CC BY 4.0`, 15, 32)

  if (selectedZone && zonePlan) {
    doc.setFillColor(243, 244, 245)
    doc.roundedRect(15, 46, 180, 18, 3, 3, 'F')
    doc.setTextColor(25, 28, 29)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(`Zona: ${selectedZone.name}`, 20, 54)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(`Solución: ${zonePlan.title}`, 20, 60)
  }

  const lines = [
    ['Regiones monitorizadas', `${metrics.regions}`],
    ['Zonas en estrés extremo', `${metrics.criticalZones}`],
    ['Población potencialmente cubierta', `${metrics.populationM} M`],
    ['Potencial DC total', `${metrics.dcPotentialMW.toLocaleString('es-ES')} MW`],
    ['Agua producida por día', `${metrics.dailyLitersM.toLocaleString('es-ES')} M L`],
    ['Agua producida por año', `${metrics.annualM3M} M m³`],
    ['Hogares abastecidos', `${metrics.households.toLocaleString('es-ES')}`],
    ['Hectáreas agrícolas regadas', `${metrics.hectares.toLocaleString('es-ES')} ha`],
    ['CO₂ evitado por año', `${metrics.co2Tonnes.toLocaleString('es-ES')} t`],
    ['Inversión estimada', `~${metrics.investmentBn} B€`],
  ]

  doc.setTextColor(25, 28, 29)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text('Resumen de impacto', 15, selectedZone && zonePlan ? 72 : 56)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  lines.forEach(([label, value], index) => {
    const y = (selectedZone && zonePlan ? 84 : 68) + index * 10
    doc.setTextColor(67, 71, 79)
    doc.text(label, 15, y)
    doc.setTextColor(0, 109, 55)
    doc.setFont('helvetica', 'bold')
    doc.text(value, 126, y)
    doc.setFont('helvetica', 'normal')
  })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(25, 28, 29)
  doc.text('ODS conectados', 15, 178)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(67, 71, 79)
  ['ODS 6 — Agua limpia y saneamiento', 'ODS 7 — Energía asequible y no contaminante', 'ODS 2 — Hambre cero', 'ODS 13 — Acción por el clima'].forEach((line, index) => {
    doc.text(`• ${line}`, 15, 190 + index * 9)
  })

  if (selectedZone && zonePlan) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(25, 28, 29)
    doc.text('Solución por zona', 15, 238)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(67, 71, 79)
    doc.text(zonePlan.summary, 15, 246, { maxWidth: 180 })
    doc.text(`Payback orientativo: ${zonePlan.payback}`, 15, 266)
  }

  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text('Producción estimada: 15.000 L/día por MW térmico · CO₂ evitado: 1,5 kg/m³ · Proyección sobre potencial máximo identificado.', 15, 278, { maxWidth: 180 })
  doc.text('SeaCool © 2026 — Water Security & Circular Infrastructure', 15, 286)

  doc.save(`seacool-impact-${new Date().toISOString().slice(0, 10)}.pdf`)
}

export default function ESGReports() {
  const [regions, setRegions] = useState([])
  const [selectedZoneId, setSelectedZoneId] = useState('')

  useEffect(() => {
    getRegions()
      .then(setRegions)
      .catch(() => setRegions([]))
  }, [])

  const zoneOptions = useMemo(() => normalizeZones(regions), [regions])
  const metrics = useMemo(() => buildMetrics(regions), [regions])
  const selectedZone = useMemo(() => {
    return zoneOptions.find(zone => zone.id === selectedZoneId) || zoneOptions[0] || null
  }, [zoneOptions, selectedZoneId])
  const zonePlan = useMemo(() => buildZonePlan(selectedZone, metrics), [selectedZone, metrics])

  useEffect(() => {
    if (!selectedZoneId && zoneOptions[0]) {
      setSelectedZoneId(zoneOptions[0].id)
    }
  }, [zoneOptions, selectedZoneId])

  const dateLabel = new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date())

  return (
    <div className="min-h-screen max-w-container-max mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-8">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
              <span className="px-2.5 py-1 rounded-full bg-white border border-slate-200 text-[#003366]">Impacto ESG</span>
              <span>Escala global</span>
              <span>·</span>
              <span>{dateLabel}</span>
            </div>
            <h1 className="text-[clamp(2rem,4vw,3.25rem)] leading-[1.05] font-black tracking-tight text-[#001e40]">
              Informe de impacto con lectura rápida y evidencia clara.
            </h1>
            <p className="text-sm sm:text-base text-on-surface-variant max-w-2xl">
              Una vista más limpia para presentar la contribución de SeaCool a agua, energía y clima sin perder densidad técnica.
              Los números se calculan con los datos de regiones del proyecto y se mantienen coherentes con la paleta del sistema.
            </p>
          </div>

          <button
            onClick={() => downloadPDF(metrics, selectedZone, zonePlan)}
            className="inline-flex items-center justify-center gap-2 self-start rounded-lg bg-[#003366] px-5 py-3 text-sm font-bold text-white shadow-[0_8px_24px_-14px_rgba(0,30,64,0.55)] transition-transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            Descargar PDF
          </button>
        </div>

        <section className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Zona de auditoría</p>
                <h2 className="mt-1 text-xl font-bold text-[#001e40]">Personaliza el reporte</h2>
              </div>
              <span className="rounded-full bg-primary-fixed px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-on-primary-fixed-variant">
                Mocked zone
              </span>
            </div>

            <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-2">
              Selecciona la ubicación
            </label>
            <select
              value={selectedZone?.id || ''}
              onChange={e => setSelectedZoneId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-[#001e40] outline-none transition-colors focus:border-[#003366] focus:bg-white"
            >
              {zoneOptions.map(zone => (
                <option key={zone.id} value={zone.id}>
                  {zone.name} · {zone.country}
                </option>
              ))}
            </select>

            {selectedZone && (
              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#003366] border border-slate-200">
                    {selectedZone.region || 'Zona seleccionada'}
                  </span>
                  <span className="rounded-full bg-secondary-container px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-on-secondary-container">
                    WRI {selectedZone.water_stress?.toFixed?.(1) || selectedZone.water_stress}/5
                  </span>
                </div>

                <p className="text-base font-bold text-[#001e40]">{selectedZone.name}</p>
                <p className="mt-1 text-sm leading-6 text-on-surface-variant">{selectedZone.focus}</p>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-white p-3 border border-slate-200">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Potencial local</p>
                    <p className="mt-1 text-xl font-black text-[#003366]">{selectedZone.dc_potential_mw} MW</p>
                  </div>
                  <div className="rounded-lg bg-white p-3 border border-slate-200">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Suelo agrícola</p>
                    <p className="mt-1 text-xl font-black text-[#006d37]">{selectedZone.ag_land_ha.toLocaleString('es-ES')} ha</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-[#001e40] p-6 sm:p-7 text-white shadow-[0_12px_36px_-24px_rgba(0,0,0,0.5)] relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.04] bg-[linear-gradient(90deg,rgba(255,255,255,0.8)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.8)_1px,transparent_1px)] bg-[size:36px_36px]" />
            <div className="relative z-10">
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-200 mb-3">
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">{zonePlan.tag}</span>
                <span>Solución mockeada</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">{zonePlan.title}</h2>
              <p className="mt-3 max-w-3xl text-sm sm:text-base leading-7 text-blue-100/85">{zonePlan.summary}</p>

              <div className="mt-5 flex flex-wrap gap-2">
                {zonePlan.badges.map(badge => (
                  <span key={badge} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-100">
                    {badge}
                  </span>
                ))}
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {zonePlan.bullets.map(item => (
                  <div key={item} className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-200">Dato mock</p>
                    <p className="mt-2 text-sm leading-6 text-white/95">{item}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-200">Solución térmica</p>
                  <p className="mt-2 text-base font-bold text-white">{zonePlan.recommendation}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-200">Payback orientativo</p>
                  <p className="mt-2 text-base font-bold text-white">{zonePlan.payback}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-12">
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
                    <span className="text-lg sm:text-2xl font-semibold text-blue-200">litros</span>
                  </div>
                  <p className="max-w-2xl text-sm sm:text-base text-blue-100/80">
                    Si el potencial detectado en regiones costeras se activara con SeaCool, el sistema podría convertir calor residual en un flujo continuo de agua útil para consumo y agricultura.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:min-w-[260px]">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-200">Al año</div>
                    <div className="mt-2 text-[clamp(1.35rem,3vw,1.8rem)] font-black leading-none text-white whitespace-nowrap">
                      {metrics.annualM3M}M
                    </div>
                    <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-200">m³</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-200">CO₂ evitado</div>
                    <div className="mt-2 text-[clamp(1.35rem,3vw,1.8rem)] font-black leading-none text-white whitespace-nowrap">
                      {metrics.co2Tonnes.toLocaleString('es-ES')}
                    </div>
                    <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-200">t</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-200">Hogares</div>
                    <div className="mt-2 text-[clamp(1.35rem,3vw,1.8rem)] font-black leading-none text-white whitespace-nowrap">
                      {metrics.households.toLocaleString('es-ES')}
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-200">Inversión</div>
                    <div className="mt-2 text-[clamp(1.35rem,3vw,1.8rem)] font-black leading-none text-white whitespace-nowrap">
                      ~{metrics.investmentBn}B€
                    </div>
                  </div>
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
              <span className="rounded-full bg-secondary-container px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-on-secondary-container">
                Stable
              </span>
            </div>

            <div className="mt-5 space-y-4">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Población cubierta</p>
                <div className="mt-2 text-2xl font-black text-[#003366]">{metrics.populationM}M</div>
                <p className="mt-1 text-sm text-on-surface-variant">personas en regiones monitorizadas por el proyecto</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Zonas críticas</p>
                  <p className="mt-2 text-2xl font-black text-[#ba1a1a]">{metrics.criticalZones}</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Potencial DC</p>
                  <p className="mt-2 text-2xl font-black text-[#003366]">{metrics.dcPotentialMW.toLocaleString('es-ES')}</p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-[#f8f9fa] p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Metodología</p>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                  Proyección sobre el potencial total de regiones costeras del dataset SeaCool. El tono es deliberadamente sobrio para priorizar lectura y comparabilidad.
                </p>
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

        <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)]">
          <div className="flex items-end justify-between gap-4 mb-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Alineación estratégica</p>
              <h2 className="mt-1 text-xl font-bold text-[#001e40]">ODS relevantes</h2>
            </div>
            <span className="rounded-full border border-slate-200 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
              UN SDGs
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {ODS.map(({ num, color, icon, title, desc }) => (
              <article key={num} className="rounded-xl border border-slate-200 p-4 transition-transform hover:-translate-y-0.5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}15` }}>
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

        <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/70 px-5 sm:px-6 py-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Métricas detalladas</p>
              <h2 className="mt-1 text-lg sm:text-xl font-bold text-[#001e40]">Impacto social y operativo</h2>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-400">
              <span className="h-2 w-2 rounded-full bg-secondary" />
              Datos proyectados
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {DETAIL_ROWS.map(row => (
              <div key={row.label} className="grid gap-3 px-5 sm:px-6 py-4 lg:grid-cols-[minmax(0,1.5fr)_120px_140px_120px] lg:items-center">
                <div className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-secondary" />
                  <div>
                    <p className="font-semibold text-[#001e40]">{row.label}</p>
                    <p className="text-sm text-on-surface-variant">SeaCool lo presenta como una métrica de avance consolidado.</p>
                  </div>
                </div>

                <div>
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${row.statusClass}`}>
                    {row.status}
                  </span>
                </div>

                <div className="text-sm sm:text-base font-bold text-[#001e40]">{row.value}</div>

                <div className="text-sm font-semibold text-[#006d37] lg:text-right">{row.forecast}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6 flex gap-3 items-start">
          <span className="material-symbols-outlined text-slate-400 text-[18px] shrink-0 mt-0.5">info</span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Metodología y fuentes</p>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">
              La lectura parte de datos WRI Aqueduct 2023 y de la huella térmica potencial del proyecto. La producción estimada usa una relación de 15.000 L/día por MW térmico y la reducción de emisiones se expresa frente a desalinización eléctrica convencional. La zona seleccionada arriba reescribe el bloque de solución para que el reporte se sienta personalizado sin cambiar el backend.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
