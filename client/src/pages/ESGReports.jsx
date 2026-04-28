import { jsPDF } from 'jspdf'

const impactData = [
  { indicator: 'Reducción de Huella Hídrica', status: 'OPTIMAL', statusBg: 'bg-secondary-container', statusText: 'text-on-secondary-container', value: '1.2M m³', projection: '+12%', verified: true },
  { indicator: 'Ahorro Térmico Industrial',    status: 'OPTIMAL', statusBg: 'bg-secondary-container', statusText: 'text-on-secondary-container', value: '420 GW/h', projection: '+8.4%', verified: true },
  { indicator: 'Recuperación de Suelo Salino', status: 'RECOVERY', statusBg: 'bg-tertiary-container', statusText: 'text-tertiary-fixed-dim', value: '15,400 m²', projection: '+3.2%', verified: false },
]

const sdgs = [
  { num: 2,  bg: '#e5243b', icon: 'psychiatry', label: 'Hambre Cero (Agricultura Sostenible)' },
  { num: 6,  bg: '#26bde2', icon: 'water_full',  label: 'Agua Limpia y Saneamiento' },
  { num: 7,  bg: '#fcc30b', icon: 'bolt',         label: 'Energía Asequible y No Contaminante' },
  { num: 13, bg: '#3f7e44', icon: 'public',        label: 'Acción por el Clima' },
]

function generatePDF() {
  const doc = new jsPDF()
  const date = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })

  // Header
  doc.setFillColor(0, 51, 102)
  doc.rect(0, 0, 210, 40, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text('SeaCool — Informe ESG', 20, 20)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Fecha: ${date}`, 20, 32)

  // Key metrics
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Métricas Clave de Impacto', 20, 60)

  const metrics = [
    ['CO₂ Reducido', '14,200 ton'],
    ['Agua Desalinizada', '1.2M m³'],
    ['Ahorro Térmico', '420 GW/h'],
    ['Familias Beneficiadas', '8,450'],
    ['Hectáreas Salvadas', '1,240'],
    ['Eficiencia Energética', '94.8%'],
  ]

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  metrics.forEach(([label, val], i) => {
    const y = 72 + i * 10
    doc.text(label, 20, y)
    doc.setTextColor(0, 109, 55)
    doc.text(val, 120, y)
    doc.setTextColor(0, 0, 0)
  })

  // ODS
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('ODS Alineados', 20, 140)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  ;[
    'ODS 6 — Agua Limpia y Saneamiento',
    'ODS 7 — Energía Asequible y No Contaminante',
    'ODS 2 — Hambre Cero (Agricultura Sostenible)',
    'ODS 13 — Acción por el Clima',
  ].forEach((ods, i) => {
    doc.text(`• ${ods}`, 20, 152 + i * 10)
  })

  // Footer
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text('SeaCool © 2024 — Digital Infrastructure & Sustainability', 20, 285)

  doc.save(`seacool-esg-report-${new Date().toISOString().slice(0,10)}.pdf`)
}

export default function ESGReports() {
  return (
    <>
      {/* Header */}
      <div className="flex justify-between items-end mb-10">
        <div>
          <h1 className="font-display-lg text-primary mb-2">Impacto ESG</h1>
          <p className="text-on-surface-variant font-body-md max-w-2xl">
            Visualización técnica del desempeño de SeaCool bajo los estándares de los Objetivos de Desarrollo Sostenible (ODS).
          </p>
        </div>
        <button
          onClick={generatePDF}
          className="flex items-center gap-2 bg-secondary text-on-secondary px-6 py-3 rounded-lg font-label-caps hover:opacity-90 transition-all shadow-md"
        >
          <span className="material-symbols-outlined">download</span>
          Exportar Informe para Inversores
        </button>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-12 gap-6 mb-10">
        {/* Main KPI */}
        <div className="col-span-12 lg:col-span-8 bg-white p-8 rounded-xl border border-outline-variant shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <span className="material-symbols-outlined text-[120px]">eco</span>
          </div>
          <div className="relative z-10">
            <span className="text-label-caps text-secondary mb-4 block uppercase tracking-widest">Resumen de Eficiencia Térmica</span>
            <div className="flex items-baseline gap-4 mb-6">
              <span className="text-6xl font-black text-primary font-display-lg">14.2k</span>
              <span className="text-headline-md text-on-secondary-container">Toneladas CO₂</span>
            </div>
            <p className="font-body-md text-on-surface-variant max-w-md">
              Reducción acumulada de emisiones mediante sistemas de recuperación de calor residual en plantas industriales costeras.
            </p>
            <div className="mt-8 grid grid-cols-3 gap-8 border-t border-slate-100 pt-8">
              <div>
                <span className="block text-label-caps text-slate-400 mb-1">Impacto 2024</span>
                <span className="text-headline-md font-bold text-primary">+22%</span>
              </div>
              <div>
                <span className="block text-label-caps text-slate-400 mb-1">Eficiencia Energética</span>
                <span className="text-headline-md font-bold text-primary">94.8%</span>
              </div>
              <div>
                <span className="block text-label-caps text-slate-400 mb-1">Retorno Social</span>
                <span className="text-headline-md font-bold text-primary">1:3.4</span>
              </div>
            </div>
          </div>
        </div>

        {/* Families */}
        <div className="col-span-12 md:col-span-6 lg:col-span-4 bg-surface-container-low p-8 rounded-xl border border-outline-variant flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 bg-secondary-container rounded-lg flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-on-secondary-container">water_drop</span>
            </div>
            <h3 className="text-headline-md font-bold text-primary mb-2">8,450</h3>
            <p className="text-label-caps text-on-secondary-container mb-4">FAMILIAS BENEFICIADAS</p>
            <p className="text-body-sm text-on-surface-variant">Acceso a agua potable generado mediante procesos de desalinización de bajo impacto.</p>
          </div>
          <div className="mt-6 pt-4 border-t border-outline-variant/30">
            <div className="flex justify-between items-center text-xs font-bold text-secondary">
              <span>META 10k</span>
              <span>84.5%</span>
            </div>
            <div className="w-full h-1.5 bg-white rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-secondary" style={{ width: '84.5%' }} />
            </div>
          </div>
        </div>

        {/* Hectares */}
        <div className="col-span-12 md:col-span-6 lg:col-span-4 bg-white p-8 rounded-xl border border-outline-variant shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 bg-tertiary-container rounded-lg flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-tertiary-fixed">agriculture</span>
            </div>
            <h3 className="text-headline-md font-bold text-primary mb-2">1,240</h3>
            <p className="text-label-caps text-on-tertiary-container mb-4">HECTÁREAS SALVADAS</p>
            <p className="text-body-sm text-on-surface-variant">Cultivos protegidos mediante sistemas de micro-clima y riego sostenible.</p>
          </div>
          <div className="h-24 mt-4 bg-surface-variant/20 rounded-lg flex items-end p-2 gap-1">
            {[40, 60, 55, 80, 95].map((h, i) => (
              <div key={i} className={`${i === 4 ? 'bg-tertiary-container' : 'bg-tertiary-container/30'} w-full rounded-t`} style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>

        {/* ODS Grid */}
        <div className="col-span-12 lg:col-span-8 bg-[#001e40] p-8 rounded-xl text-white">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h3 className="text-headline-md font-bold mb-1">Alineación Estratégica ODS</h3>
              <p className="text-blue-300 text-body-sm">Contribución directa a los Objetivos de Desarrollo Sostenible de la ONU.</p>
            </div>
            <span className="bg-blue-900/50 px-3 py-1 rounded text-[10px] font-bold tracking-widest border border-blue-700">UNITED NATIONS STANDARD</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {sdgs.map(({ num, bg, icon, label }) => (
              <div key={num} className="sdg-card p-4 rounded-lg aspect-square flex flex-col justify-between cursor-pointer text-white" style={{ backgroundColor: bg }}>
                <div className="flex justify-between items-start">
                  <span className="text-2xl font-black opacity-40">{num}</span>
                  <span className="material-symbols-outlined text-3xl">{icon}</span>
                </div>
                <span className="font-bold text-[10px] leading-tight uppercase">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Impact Table */}
      <div className="bg-white rounded-xl border border-outline-variant overflow-hidden shadow-sm mb-10">
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h4 className="font-headline-md text-primary font-bold">Métricas Detalladas de Impacto Social</h4>
          <div className="flex gap-2">
            <button className="p-2 hover:bg-slate-200 rounded transition-colors"><span className="material-symbols-outlined text-slate-600">filter_list</span></button>
            <button className="p-2 hover:bg-slate-200 rounded transition-colors"><span className="material-symbols-outlined text-slate-600">more_vert</span></button>
          </div>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-lowest text-label-caps text-slate-500 uppercase tracking-tighter">
              <th className="px-8 py-4 font-bold border-b border-slate-100">Indicador de Impacto</th>
              <th className="px-8 py-4 font-bold border-b border-slate-100">Estado</th>
              <th className="px-8 py-4 font-bold border-b border-slate-100">Valor Acumulado</th>
              <th className="px-8 py-4 font-bold border-b border-slate-100">Proyección Q4</th>
              <th className="px-8 py-4 font-bold border-b border-slate-100 text-right">Verificado</th>
            </tr>
          </thead>
          <tbody className="text-body-sm">
            {impactData.map(({ indicator, status, statusBg, statusText, value, projection, verified }) => (
              <tr key={indicator} className="hover:bg-slate-50 transition-colors">
                <td className="px-8 py-5 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${verified ? 'bg-secondary' : 'bg-tertiary-container'}`}></div>
                    <span className="font-semibold text-primary">{indicator}</span>
                  </div>
                </td>
                <td className="px-8 py-5 border-b border-slate-100">
                  <span className={`${statusBg} ${statusText} px-2 py-1 rounded text-[10px] font-bold`}>{status}</span>
                </td>
                <td className="px-8 py-5 border-b border-slate-100 font-data-mono">{value}</td>
                <td className="px-8 py-5 border-b border-slate-100 font-data-mono">{projection}</td>
                <td className="px-8 py-5 border-b border-slate-100 text-right">
                  {verified
                    ? <span className="material-symbols-outlined text-secondary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                    : <span className="material-symbols-outlined text-slate-300 text-lg">pending</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Visual Context */}
      <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="h-64 rounded-xl overflow-hidden relative bg-blue-900 flex items-end">
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="material-symbols-outlined text-blue-300 text-8xl opacity-30">waves</span>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent flex items-end p-6">
            <div>
              <span className="text-white font-bold block">Proyecto SeaCool Delta</span>
              <span className="text-blue-200 text-xs">Instalación activa - Generando 500m³/día</span>
            </div>
          </div>
        </div>
        <div className="h-64 rounded-xl overflow-hidden relative bg-green-800 flex items-end">
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="material-symbols-outlined text-green-300 text-8xl opacity-30">agriculture</span>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent flex items-end p-6">
            <div>
              <span className="text-white font-bold block">Impacto en Comunidad Local</span>
              <span className="text-blue-200 text-xs">Zonas de cultivo recuperadas - Q3 2024</span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
