import { useState } from 'react'

export default function AuditReport({ report, onBack, onClose }) {
  const [selectedDC, setSelectedDC] = useState(0)

  function downloadPDF() {
    // Mock de descarga - en producción usarías jsPDF
    const text = `
INFORME DE AUDITORÍA SEACOOL
Fecha: ${report.timestamp}

RESUMEN EJECUTIVO
Ubicación: ${report.location.value}
Prioridad: ${report.summary.priority}
Escala: ${report.summary.scale}
Viabilidad: ${report.summary.viability}

CENTROS DE DATOS CERCANOS
${report.datacenters.map(dc => `- ${dc.name} (${dc.distance} km)`).join('\n')}

RECOMENDACIÓN TÉCNICA
Centro de Datos Primario: ${report.recommendation.primaryDC}
Tecnología: ${report.recommendation.coolingType}
Desalinización: ${report.recommendation.desalinization}

SIZING
Producción de Agua: ${report.sizing.waterProductionDaily}
Área Servible: ${report.sizing.servableArea}
CAPEX Estimado: ${report.sizing.estimatedCapex}
Payback: ${report.sizing.paybackYears} años

ODS RELACIONADOS
${report.ods.map(o => `- ODS ${o.code}: ${o.name}`).join('\n')}

RIESGOS IDENTIFICADOS
${report.risks.map(r => `- ${r}`).join('\n')}

PLAN DE IMPLEMENTACIÓN
${report.implementation.map(p => `${p.phase} (${p.duration}): ${p.task}`).join('\n')}
    `
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `seacool-audit-${new Date().getTime()}.txt`
    a.click()
  }

  const dc = report.datacenters[selectedDC]
  const { priority, seasonality, scale } = report.summary

  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#003366] to-[#006d37] text-white p-6 flex justify-between items-center sticky top-0 z-10">
        <div>
          <h2 className="font-display-md text-headline-lg">Informe de Auditoría</h2>
          <p className="text-body-sm opacity-90">{report.location.value}</p>
        </div>
        <button
          onClick={onClose}
          className="material-symbols-outlined text-2xl hover:scale-110 transition-transform"
        >
          close
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Resumen Ejecutivo */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h3 className="font-headline-md text-headline-md text-[#003366] mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined">summarize</span>
            Resumen Ejecutivo
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-xs font-bold text-on-surface-variant uppercase mb-1">Ubicación</p>
              <p className="font-bold text-on-surface">{report.location.value}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-xs font-bold text-on-surface-variant uppercase mb-1">Prioridad</p>
              <p className="font-bold text-on-surface capitalize">{priority}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-xs font-bold text-on-surface-variant uppercase mb-1">Escala</p>
              <p className="font-bold text-on-surface capitalize">{scale}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-xs font-bold text-green-700 uppercase mb-1">Viabilidad</p>
              <p className="font-bold text-green-700">{report.summary.viability}</p>
            </div>
          </div>
        </section>

        {/* Centros de Datos Cercanos */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h3 className="font-headline-md text-headline-md text-[#003366] mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined">domain</span>
            Centros de Datos Cercanos
          </h3>
          <div className="space-y-3">
            {report.datacenters.map((dcItem, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedDC(idx)}
                className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                  selectedDC === idx
                    ? 'border-[#003366] bg-[#003366]/5'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-bold text-on-surface">{dcItem.name}</p>
                    <p className="text-sm text-on-surface-variant">{dcItem.distance} km de distancia</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-[#003366] text-lg">{dcItem.capacity} MW</p>
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                        dcItem.available
                          ? 'bg-green-100 text-green-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {dcItem.available ? 'Disponible' : 'Planificado'}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-on-surface-variant">{dcItem.cooling}</p>
              </button>
            ))}
          </div>

          {/* Detalles del DC seleccionado */}
          {dc && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="font-bold text-on-surface mb-2">Recomendación técnica</p>
              <p className="text-sm text-on-surface-variant mb-3">
                Usaremos {dc.name} como centro de datos primario por su proximidad ({dc.distance} km) y capacidad de {dc.capacity} MW.
              </p>
              <div className="space-y-2 text-sm">
                <p className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-[#006d37]">check_circle</span>
                  <strong>Refrigeración:</strong> {report.recommendation.coolingType}
                </p>
                <p className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-[#006d37]">check_circle</span>
                  <strong>Desalinización:</strong> {report.recommendation.desalinization}
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Sizing */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h3 className="font-headline-md text-headline-md text-[#003366] mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined">straighten</span>
            Sizing y Dimensionamiento
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-xs font-bold text-blue-700 uppercase mb-2">Producción de Agua</p>
              <p className="font-bold text-blue-900 text-lg">{report.sizing.waterProductionDaily}</p>
              <p className="text-xs text-blue-700 mt-1">por día</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-xs font-bold text-green-700 uppercase mb-2">Área Servible</p>
              <p className="font-bold text-green-900 text-lg">{report.sizing.servableArea}</p>
              <p className="text-xs text-green-700 mt-1">hectáreas</p>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <p className="text-xs font-bold text-orange-700 uppercase mb-2">CAPEX Estimado</p>
              <p className="font-bold text-orange-900 text-lg">{report.sizing.estimatedCapex}</p>
              <p className="text-xs text-orange-700 mt-1">inversión inicial</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <p className="text-xs font-bold text-purple-700 uppercase mb-2">Payback</p>
              <p className="font-bold text-purple-900 text-lg">{report.sizing.paybackYears}</p>
              <p className="text-xs text-purple-700 mt-1">años</p>
            </div>
          </div>
        </section>

        {/* ODS Conectados */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h3 className="font-headline-md text-headline-md text-[#003366] mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined">public</span>
            Objetivos de Desarrollo Sostenible
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {report.ods.map(o => (
              <div
                key={o.code}
                className="p-4 rounded-lg border-l-4 flex items-center gap-3"
                style={{ borderColor: o.color, backgroundColor: o.color + '10' }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg"
                  style={{ backgroundColor: o.color }}
                >
                  {o.code}
                </div>
                <div>
                  <p className="text-xs font-bold text-on-surface-variant">ODS {o.code}</p>
                  <p className="text-sm font-bold text-on-surface">{o.name}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Riesgos */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h3 className="font-headline-md text-headline-md text-orange-600 mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined">warning</span>
            Riesgos Identificados
          </h3>
          <ul className="space-y-2">
            {report.risks.map((risk, idx) => (
              <li key={idx} className="flex items-start gap-3 text-sm text-on-surface">
                <span className="material-symbols-outlined text-orange-500 text-lg flex-shrink-0">
                  error
                </span>
                <span>{risk}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Plan de Implementación */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h3 className="font-headline-md text-headline-md text-[#003366] mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined">construction</span>
            Plan de Implementación
          </h3>
          <div className="space-y-3">
            {report.implementation.map((phase, idx) => (
              <div key={idx} className="relative pl-10 pb-6">
                {/* Timeline dot */}
                <div className="absolute left-0 top-0 w-6 h-6 rounded-full bg-[#003366] border-4 border-white shadow-sm" />
                {/* Timeline line */}
                {idx < report.implementation.length - 1 && (
                  <div className="absolute left-3 top-6 bottom-0 w-0.5 bg-slate-200" />
                )}

                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="font-bold text-[#003366] mb-1">{phase.phase}</p>
                  <p className="text-sm text-on-surface-variant mb-2">{phase.task}</p>
                  <p className="text-xs font-bold text-on-surface uppercase">
                    <span className="material-symbols-outlined text-xs align-middle mr-1">schedule</span>
                    {phase.duration}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Metadata */}
        <div className="text-center text-xs text-on-surface-variant pb-4">
          <p>Informe generado: {report.timestamp}</p>
          <p>Este es un informe preliminar basado en datos públicos y estimaciones.</p>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="border-t border-slate-200 bg-white p-6 flex gap-3 sticky bottom-0">
        <button
          onClick={onBack}
          className="px-6 py-2 text-on-surface-variant hover:bg-slate-100 rounded-lg font-bold text-sm"
        >
          ← Atrás
        </button>
        <button
          onClick={downloadPDF}
          className="flex-1 px-6 py-2 bg-gradient-to-r from-[#003366] to-[#006d37] text-white rounded-lg hover:brightness-110 transition-all font-bold text-sm flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">download</span>
          Descargar Informe (PDF)
        </button>
      </div>
    </div>
  )
}
