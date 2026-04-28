import { useState } from 'react'
import AlertBanner from '../components/ui/AlertBanner'
import { apiFetch } from '../api/client'

const MESES = [
  'enero','febrero','marzo','abril','mayo','junio',
  'julio','agosto','septiembre','octubre','noviembre','diciembre',
]

function getCrisisLevel(alertMsg) {
  if (!alertMsg || alertMsg === 'Nominal') return null
  const upper = alertMsg.toUpperCase()
  if (upper.includes('CRÍTICO') || upper.includes('CRITICO')) return 'critical'
  if (upper.includes('ALERTA')) return 'warning'
  return null
}

export default function FarmerPortal() {
  const [tempExt, setTempExt] = useState(28)
  const [cargaDc, setCargaDc] = useState(65)
  const [mes, setMes] = useState('julio')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  async function handleSimulate() {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await apiFetch('/api/seacool/simulate', {
        method: 'POST',
        body: JSON.stringify({ temp_ext: tempExt, carga_dc: cargaDc, mes }),
      })
      setResult(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const crisisLevel = result ? getCrisisLevel(result.mensajes_agentes?.agente_alerta) : null
  const hogaresAbastecidos = result ? Math.round(result.metricas_tecnicas.agua_generada_litros / 200) : null
  const hectareasRegadas = result
    ? Math.round((result.metricas_tecnicas.agua_generada_litros * result.distribucion.agricola_porcentaje / 100) / 4000)
    : null

  return (
    <>
      {/* AlertBanner */}
      {crisisLevel && (
        <AlertBanner
          level={crisisLevel}
          messages={[result.mensajes_agentes.agente_alerta]}
        />
      )}

      {/* Header */}
      <div className="flex justify-between items-end mb-lg">
        <div>
          <h1 className="font-display-lg text-display-lg text-[#001e40]">Panel de Control Agrícola</h1>
          <p className="text-on-surface-variant font-body-md">Optimización de recursos hídricos mediante recuperación térmica.</p>
        </div>
        <button className="flex items-center gap-2 bg-secondary text-white px-6 py-3 rounded-lg font-bold shadow-md hover:brightness-110 active:scale-95 transition-all">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>water_drop</span>
          Solicitar Agua Extra
        </button>
      </div>

      {/* Bento Grid Metrics */}
      <div className="grid grid-cols-12 gap-gutter mb-lg">
        {/* Metric 1 */}
        <div className="col-span-12 md:col-span-4 bg-white p-lg rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <span className="material-symbols-outlined text-6xl">schedule</span>
          </div>
          <p className="font-label-caps text-label-caps text-secondary mb-2">PRÓXIMO RIEGO PROGRAMADO</p>
          <h3 className="font-display-lg text-headline-md text-[#001e40] mb-1">Mañana, 05:30 AM</h3>
          <p className="text-body-sm text-on-surface-variant">Duración estimada: 45 minutos</p>
          <div className="mt-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
            <span className="text-xs font-bold text-secondary uppercase">Sistema Listo</span>
          </div>
        </div>
        {/* Metric 2 */}
        <div className="col-span-12 md:col-span-4 bg-white p-lg rounded-xl border border-slate-200 shadow-sm">
          <p className="font-label-caps text-label-caps text-primary-container mb-2">CUOTA DE AGUA ASIGNADA</p>
          <div className="flex items-baseline gap-2">
            <h3 className="font-display-lg text-display-lg text-[#001e40]">850</h3>
            <span className="text-headline-md text-slate-400 font-light">/ 1,200 m³</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-4 overflow-hidden">
            <div className="bg-secondary-fixed-dim h-full" style={{ width: '70.8%' }}></div>
          </div>
          <p className="text-body-sm text-on-surface-variant mt-2">70.8% del cupo mensual utilizado</p>
        </div>
        {/* Metric 3 */}
        <div className="col-span-12 md:col-span-4 bg-white p-lg rounded-xl border border-slate-200 shadow-sm">
          <p className="font-label-caps text-label-caps text-tertiary-container mb-2">HUMEDAD DEL SUELO</p>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display-lg text-display-lg text-[#001e40]">42%</h3>
              <p className="text-body-sm text-secondary font-semibold">Nivel Óptimo</p>
            </div>
            <div className="h-16 w-16 flex items-center justify-center rounded-full bg-blue-50">
              <span className="material-symbols-outlined text-primary-container text-3xl">opacity</span>
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="col-span-12 lg:col-span-4 bg-[#001e40] text-white p-lg rounded-xl shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-secondary-fixed">verified_user</span>
              <span className="font-label-caps text-label-caps">ESTADO DEL SISTEMA SEACOOL</span>
            </div>
            <h4 className="text-headline-md font-bold mb-4">Eficiencia Térmica: 94%</h4>
            <ul className="space-y-3 text-body-sm text-slate-300">
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-xs">check_circle</span>
                Intercambiadores de calor operativos
              </li>
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-xs">check_circle</span>
                Filtración oceánica estable
              </li>
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-xs">check_circle</span>
                Sensores de parcela activos (4/4)
              </li>
            </ul>
          </div>
          <div className="mt-6 p-4 bg-white/5 rounded-lg border border-white/10">
            <p className="text-xs text-slate-400 italic">"La mayor actividad de procesamiento en el nodo local está permitiendo un incremento del 12% en la desalinización térmica para su zona."</p>
          </div>
        </div>

        {/* Simulation Form */}
        <div className="col-span-12 lg:col-span-8 bg-white p-lg rounded-xl border border-slate-200 shadow-sm">
          <h4 className="font-headline-md text-[#001e40] mb-1">Simulación Multiagente SeaCool</h4>
          <p className="text-body-sm text-on-surface-variant mb-lg">Ajusta los parámetros para calcular agua generada y distribución óptima.</p>

          <div className="space-y-6">
            {/* Temp slider */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="font-label-caps text-label-caps text-on-surface-variant uppercase">Temperatura Exterior</label>
                <span className="text-2xl font-black text-[#003366]">{tempExt}°C</span>
              </div>
              <input
                type="range" min="-10" max="55" value={tempExt}
                onChange={e => setTempExt(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer custom-slider"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-1">
                <span>-10°C</span><span>22.5°C</span><span>55°C</span>
              </div>
            </div>

            {/* DC Load slider */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="font-label-caps text-label-caps text-on-surface-variant uppercase">Carga Datacenter</label>
                <span className="text-2xl font-black text-[#003366]">{cargaDc}%</span>
              </div>
              <input
                type="range" min="0" max="100" value={cargaDc}
                onChange={e => setCargaDc(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer custom-slider"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-1">
                <span>0%</span><span>50%</span><span>100%</span>
              </div>
            </div>

            {/* Month select */}
            <div>
              <label className="font-label-caps text-label-caps text-on-surface-variant uppercase block mb-2">Mes</label>
              <select
                value={mes}
                onChange={e => setMes(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-[#003366]/20 focus:border-[#003366] outline-none"
              >
                {MESES.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
              </select>
            </div>

            {/* Submit */}
            <button
              onClick={handleSimulate}
              disabled={loading}
              className="w-full bg-[#003366] text-white py-3 rounded-lg font-bold active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Agentes procesando...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">play_circle</span>
                  Ejecutar Simulación
                </>
              )}
            </button>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-sm">{error}</div>
            )}
          </div>
        </div>
      </div>

      {/* Simulation Results */}
      {result && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-lg mb-lg">
          <h4 className="font-headline-md text-[#001e40] mb-lg">Resultados de la Simulación</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-lg mb-lg">
            <div className="bg-surface-container-low p-md rounded-xl text-center">
              <span className="material-symbols-outlined text-secondary text-3xl block mb-2">water_drop</span>
              <div className="text-3xl font-black text-primary">{result.metricas_tecnicas.agua_generada_litros.toLocaleString()}</div>
              <div className="font-label-caps text-label-caps text-on-surface-variant">LITROS PRODUCIDOS/DÍA</div>
            </div>
            <div className="bg-surface-container-low p-md rounded-xl text-center">
              <span className="material-symbols-outlined text-primary-container text-3xl block mb-2">home</span>
              <div className="text-3xl font-black text-primary">{hogaresAbastecidos?.toLocaleString()}</div>
              <div className="font-label-caps text-label-caps text-on-surface-variant">HOGARES ABASTECIDOS</div>
            </div>
            <div className="bg-surface-container-low p-md rounded-xl text-center">
              <span className="material-symbols-outlined text-tertiary-container text-3xl block mb-2">agriculture</span>
              <div className="text-3xl font-black text-primary">{hectareasRegadas?.toLocaleString()}</div>
              <div className="font-label-caps text-label-caps text-on-surface-variant">HECTÁREAS REGADAS</div>
            </div>
            <div className="bg-surface-container-low p-md rounded-xl text-center">
              <span className="material-symbols-outlined text-orange-500 text-3xl block mb-2">bolt</span>
              <div className="text-3xl font-black text-primary">{result.metricas_tecnicas.ahorro_refrigeracion_kw.toLocaleString()}</div>
              <div className="font-label-caps text-label-caps text-on-surface-variant">AHORRO kW REFRIGERACIÓN</div>
            </div>
          </div>

          {/* Distribution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-lg mb-lg">
            <div>
              <p className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-2">Distribución del Agua</p>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span>AGRÍCOLA ({result.distribucion.agricola_porcentaje}%)</span>
                    <span>{Math.round(result.metricas_tecnicas.agua_generada_litros * result.distribucion.agricola_porcentaje / 100).toLocaleString()} L</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-secondary" style={{ width: `${result.distribucion.agricola_porcentaje}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1 text-slate-500">
                    <span>URBANA ({result.distribucion.urbana_porcentaje}%)</span>
                    <span>{Math.round(result.metricas_tecnicas.agua_generada_litros * result.distribucion.urbana_porcentaje / 100).toLocaleString()} L</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#003366]" style={{ width: `${result.distribucion.urbana_porcentaje}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Agent Messages */}
          <div className="space-y-3">
            <p className="font-label-caps text-label-caps text-on-surface-variant uppercase">Razonamiento de Agentes</p>
            {[
              { key: 'agente_distribuidor', label: 'Distribuidor', icon: 'account_tree', color: 'border-primary-container' },
              { key: 'agente_alerta',       label: 'Alerta',        icon: 'warning',      color: crisisLevel === 'critical' ? 'border-error' : crisisLevel === 'warning' ? 'border-orange-400' : 'border-secondary' },
              { key: 'agente_roi',          label: 'ROI',           icon: 'trending_up',  color: 'border-secondary' },
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

      {/* Irrigation History */}
      <div className="grid grid-cols-12 gap-gutter">
        <div className="col-span-12 md:col-span-6 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-lg border-b border-slate-100 flex justify-between items-center">
            <h5 className="font-headline-md text-sm font-bold text-[#001e40] uppercase tracking-wider">Historial de Riegos</h5>
            <button className="text-xs font-bold text-[#003366] hover:underline">Ver todo</button>
          </div>
          <div className="divide-y divide-slate-50">
            {[
              { date: '12 Oct, 2023', cycle: 'Ciclo de Mañana • 42 m³' },
              { date: '11 Oct, 2023', cycle: 'Ciclo de Mañana • 38 m³' },
            ].map(({ date, cycle }) => (
              <div key={date} className="px-lg py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded bg-slate-50 flex items-center justify-center text-slate-400">
                    <span className="material-symbols-outlined">calendar_today</span>
                  </div>
                  <div>
                    <p className="font-bold text-sm text-on-surface">{date}</p>
                    <p className="text-xs text-on-surface-variant">{cycle}</p>
                  </div>
                </div>
                <span className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded font-bold">Completado</span>
              </div>
            ))}
          </div>
        </div>
        <div className="col-span-12 md:col-span-6 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-lg border-b border-slate-100">
            <h5 className="font-headline-md text-sm font-bold text-[#001e40] uppercase tracking-wider">Vista de Satélite - Parcela A2</h5>
          </div>
          <div className="h-48 relative bg-green-50 flex items-center justify-center">
            <div className="text-center text-slate-400">
              <span className="material-symbols-outlined text-5xl text-green-300 block mb-2">satellite_alt</span>
              <p className="text-xs font-medium">Vista satelital no disponible</p>
            </div>
            <div className="absolute inset-x-0 bottom-4 flex justify-center">
              <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-full border border-secondary shadow-lg flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-secondary"></span>
                <span className="text-xs font-bold text-[#001e40]">Caudal Activo: 1.2L/s</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
