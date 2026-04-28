import { jsPDF } from 'jspdf'

// Numbers derived from WRI Aqueduct 2023 data (34 coastal regions, 6,105 MW total DC potential)
// Physics: 1 MW waste heat → 15,000 L/day freshwater (Multi-Effect Distillation)
// CO₂ factor: 1.5 kg/m³ avoided vs conventional electric desalination (3 kWh/m³ × 0.5 kg CO₂/kWh)
const METRICS = {
  regions:       34,
  criticalZones: 16,
  populationM:   207,
  dcPotentialMW: 6105,
  dailyLitersM:  91.6,       // millions
  dailyM3:       91575,
  annualM3M:     33.4,       // millions
  households:    114000,
  co2Tonnes:     50100,      // tonnes/year
  hectares:      9158,
  investmentBn:  9.2,        // billion EUR
}

const SDGS = [
  { num: 6,  color: '#26bde2', icon: 'water_full',  title: 'Agua Limpia',       desc: 'Acceso a agua potable para comunidades en crisis hídrica extrema' },
  { num: 7,  color: '#fcc30b', icon: 'bolt',         title: 'Energía Limpia',    desc: 'Valorización de calor residual de datacentros — economía circular' },
  { num: 2,  color: '#e5243b', icon: 'psychiatry',   title: 'Hambre Cero',       desc: 'Riego sostenible para 9.158 hectáreas agrícolas en zonas áridas' },
  { num: 13, color: '#3f7e44', icon: 'public',        title: 'Acción Climática',  desc: '50.100 t CO₂/año evitadas respecto a desalinización convencional' },
]

const STAT_ROWS = [
  { label: 'Regiones monitorizadas',   value: '34',        sub: '16 en estrés extremo (≥4.5/5 WRI)',  icon: 'language',         color: '#003366' },
  { label: 'Población alcanzable',     value: '207M',      sub: 'hab. en zonas costeras críticas',     icon: 'groups',           color: '#003366' },
  { label: 'Potencial DC instalado',   value: '6.105 MW',  sub: 'calor residual aprovechable',         icon: 'developer_board',  color: '#d98a00' },
  { label: 'Agua producible/día',      value: '91,6M L',   sub: '91.575 m³ · 33,4M m³/año',           icon: 'water_drop',       color: '#006d37' },
  { label: 'Hogares abastecidos',      value: '114.000',   sub: 'por día, a 200 L/persona × 4 p/h',   icon: 'home',             color: '#006d37' },
  { label: 'CO₂ evitado',             value: '50.100 t',  sub: 'por año vs. desalinización eléctrica', icon: 'eco',             color: '#006d37' },
]

function generatePDF() {
  const doc = new jsPDF()
  const date = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })

  doc.setFillColor(0, 51, 102)
  doc.rect(0, 0, 210, 45, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text('SeaCool — Informe de Impacto ESG', 15, 22)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`Generado: ${date}  ·  Datos: WRI Aqueduct 2023 · CC BY 4.0`, 15, 34)

  doc.setTextColor(0, 0, 0)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('Impacto potencial a escala global (34 regiones)', 15, 60)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  const rows = [
    ['Regiones con estrés hídrico crítico', '34  (16 en nivel extremo)'],
    ['Población en zonas cubiertas', '207 millones de habitantes'],
    ['Potencial DC total aprovechable', '6.105 MW de calor residual'],
    ['Agua producible por día', '91,6M litros  (91.575 m³)'],
    ['Agua producible por año', '33,4 millones de m³'],
    ['Hogares abastecidos/día', '114.000 hogares'],
    ['Hectáreas agrícolas regadas', '9.158 ha/día'],
    ['CO₂ evitado por año', '50.100 toneladas'],
    ['Inversión total estimada', '~9.200 M€  (1,5 M€/MW)'],
  ]
  rows.forEach(([label, val], i) => {
    const y = 72 + i * 10
    doc.setTextColor(80, 80, 80)
    doc.text(label, 15, y)
    doc.setTextColor(0, 109, 55)
    doc.setFont('helvetica', 'bold')
    doc.text(val, 125, y)
    doc.setFont('helvetica', 'normal')
  })

  doc.setTextColor(0, 0, 0)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('ODS alineados', 15, 170)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  const sdgLines = [
    'ODS 6 — Agua Limpia y Saneamiento',
    'ODS 7 — Energía Asequible y No Contaminante',
    'ODS 2 — Hambre Cero (Agricultura Sostenible)',
    'ODS 13 — Acción por el Clima',
  ]
  doc.setTextColor(60, 60, 60)
  sdgLines.forEach((s, i) => doc.text(`• ${s}`, 15, 182 + i * 10))

  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text('Metodología: WRI Aqueduct 2023 (CC BY 4.0) · Física MED: 15.000 L/día por MW térmico · CO₂: 1,5 kg/m³ vs. desalinización eléctrica convencional', 15, 278, { maxWidth: 180 })
  doc.text('SeaCool © 2025 — Circular Economy · Digital Infrastructure & Water Security', 15, 286)

  doc.save(`seacool-esg-${new Date().toISOString().slice(0, 10)}.pdf`)
}

export default function ESGReports() {
  return (
    <div className="max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Impacto potencial · Escala global</p>
          <h1 className="text-3xl font-black text-[#003366] leading-tight">SeaCool Impact Report</h1>
          <p className="text-slate-500 text-sm mt-1.5 max-w-lg">
            Proyección basada en datos reales de 34 regiones costeras con estrés hídrico crítico (WRI Aqueduct 2023).
            Física: 1 MW de calor residual de datacenter → 15.000 L/día de agua potable.
          </p>
        </div>
        <button
          onClick={generatePDF}
          className="flex items-center gap-2 bg-[#003366] text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-[#002244] transition-colors shrink-0"
        >
          <span className="material-symbols-outlined text-sm">download</span>
          Descargar PDF
        </button>
      </div>

      {/* Hero number */}
      <div className="bg-[#001e40] rounded-2xl p-8 mb-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '40px 40px' }}
        />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="flex-1">
            <p className="text-blue-300 text-xs font-bold uppercase tracking-widest mb-2">Agua potable producible por día</p>
            <div className="flex items-baseline gap-3">
              <span className="text-6xl font-black text-white">91,6M</span>
              <span className="text-2xl font-bold text-blue-300">litros</span>
            </div>
            <p className="text-blue-200 text-sm mt-2">si SeaCool se desplegara al máximo potencial en las 34 regiones identificadas</p>
          </div>
          <div className="flex gap-6 sm:flex-col sm:text-right">
            <div>
              <div className="text-2xl font-black text-[#a7c8ff]">33,4M m³</div>
              <div className="text-[10px] text-blue-300 uppercase font-bold">al año</div>
            </div>
            <div>
              <div className="text-2xl font-black text-[#a7c8ff]">6.105 MW</div>
              <div className="text-[10px] text-blue-300 uppercase font-bold">potencial DC total</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {STAT_ROWS.map(({ label, value, sub, icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}15` }}>
              <span className="material-symbols-outlined text-[20px]" style={{ color }}>{icon}</span>
            </div>
            <div>
              <div className="text-xl font-black text-[#003366]">{value}</div>
              <div className="text-xs font-semibold text-slate-700 leading-tight">{label}</div>
              <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">{sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ODS */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-5">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Alineación estratégica</span>
          <span className="ml-auto text-[10px] font-bold text-slate-300 border border-slate-200 px-2 py-0.5 rounded">UN SDGs</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {SDGS.map(({ num, color, icon, title, desc }) => (
            <div key={num} className="rounded-xl p-4" style={{ background: `${color}12`, borderLeft: `3px solid ${color}` }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-[18px]" style={{ color }}>{icon}</span>
                <span className="text-xs font-black" style={{ color }}>ODS {num}</span>
              </div>
              <div className="font-bold text-sm text-slate-800 mb-1">{title}</div>
              <p className="text-[11px] text-slate-500 leading-snug">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Methodology note */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex gap-3 items-start">
        <span className="material-symbols-outlined text-slate-400 text-[18px] shrink-0 mt-0.5">info</span>
        <div>
          <p className="text-xs font-bold text-slate-600 mb-0.5">Metodología y fuentes</p>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Datos de estrés hídrico: <strong>WRI Aqueduct 2023</strong> (CC BY 4.0).
            Física de producción: destilación multi-efecto (MED), <strong>15.000 L/día por MW</strong> de calor residual.
            CO₂ evitado: <strong>1,5 kg/m³</strong> respecto a desalinización eléctrica convencional (3 kWh/m³ × 0,5 kg CO₂/kWh).
            Inversión estimada: <strong>1,5 M€/MW</strong> (referencia plantas MED existentes en el Mediterráneo).
            Proyección sobre potencial máximo identificado — no representa instalaciones operativas.
          </p>
        </div>
      </div>

    </div>
  )
}
