import 'leaflet/dist/leaflet.css'
import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet'
import { getRegions, getDatacenters } from '../../api/client'

const STRESS = {
  extreme: { fill: '#ef4444', stroke: '#b91c1c', label: 'Extremo',   min: 4.5 },
  high:    { fill: '#f97316', stroke: '#c2410c', label: 'Alto',       min: 3.5 },
  medium:  { fill: '#eab308', stroke: '#a16207', label: 'Medio-Alto', min: 0   },
}
function getStressStyle(score) {
  if (score >= 4.5) return STRESS.extreme
  if (score >= 3.5) return STRESS.high
  return STRESS.medium
}

function dcRadius(net_count) {
  if (net_count >= 100) return 10
  if (net_count >= 20)  return 7
  return 4
}

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png'

export default function SeaCoolMap({ height = '100%', onRegionClick, onDCClick, selectedId, selectedDCId }) {
  const [regions, setRegions]     = useState([])
  const [datacenters, setDCs]     = useState([])
  const [dcLoading, setDcLoading] = useState(false)
  const [layer, setLayer]         = useState('water')
  const [filter, setFilter]       = useState('all')

  useEffect(() => {
    getRegions().then(setRegions).catch(console.error)
  }, [])

  useEffect(() => {
    if (layer !== 'dc' || datacenters.length > 0) return
    setDcLoading(true)
    getDatacenters()
      .then(setDCs)
      .catch(console.error)
      .finally(() => setDcLoading(false))
  }, [layer])

  return (
    <div className="flex flex-col" style={{ height }}>

      {/* ── Top control bar ── */}
      <div className="flex items-center gap-3 px-4 h-12 bg-white border-b border-slate-200 shrink-0 flex-wrap">

        {/* Layer tabs */}
        <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
          <button
            onClick={() => setLayer('water')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-[11px] font-bold transition-all ${
              layer === 'water' ? 'bg-white text-[#003366] shadow-sm' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-500" />
            Estrés Hídrico
          </button>
          <button
            onClick={() => setLayer('dc')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-[11px] font-bold transition-all ${
              layer === 'dc' ? 'bg-white text-[#003366] shadow-sm' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            Datacenters
          </button>
        </div>

        <div className="w-px h-5 bg-slate-200 shrink-0" />

        {/* Water filters */}
        {layer === 'water' && (
          <div className="flex items-center gap-1">
            {[
              { key: 'all',     label: 'Todas',     dot: null      },
              { key: 'extreme', label: 'Extremo',   dot: '#ef4444' },
              { key: 'high',    label: 'Alto',      dot: '#f97316' },
            ].map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all border ${
                  filter === f.key
                    ? 'bg-[#003366] text-white border-[#003366]'
                    : 'text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700'
                }`}>
                {f.dot && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: f.dot }} />}
                {f.label}
              </button>
            ))}
            <span className="text-[11px] text-slate-400 ml-1">{regions.length} regiones · clic para análisis IA</span>
          </div>
        )}

        {/* DC loading / count */}
        {layer === 'dc' && (
          dcLoading
            ? <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                Cargando PeeringDB...
              </span>
            : <span className="text-[11px] font-semibold text-slate-500">
                {datacenters.length.toLocaleString()} datacenters reales
              </span>
        )}

        {/* Source */}
        <div className="ml-auto flex items-center gap-1 text-[10px] text-slate-400 font-medium">
          {layer === 'water'
            ? <><span className="material-symbols-outlined text-[12px]">verified</span> WRI Aqueduct 4.0 · CARTO · CC BY 4.0</>
            : <><span className="material-symbols-outlined text-[12px]">link</span> PeeringDB · CC BY 4.0</>
          }
        </div>
      </div>

      {/* ── Map ── */}
      <div className="flex-1 relative">
        <MapContainer
          center={[20, 15]}
          zoom={2}
          style={{ height: '100%', width: '100%', background: '#e8edf2' }}
          zoomControl={true}
          minZoom={2}
        >
          <TileLayer
            url={TILE_URL}
            attribution='&copy; <a href="https://carto.com">CARTO</a>'
            maxZoom={12}
          />

          {/* Regions — clickable, AI analysis */}
          {layer === 'water' && regions.filter(r => {
            if (filter === 'extreme') return r.water_stress >= 4.5
            if (filter === 'high')    return r.water_stress >= 3.5 && r.water_stress < 4.5
            return true
          }).map(region => {
            const style      = getStressStyle(region.water_stress)
            const isSelected = region.id === selectedId
            return (
              <CircleMarker
                key={region.id}
                center={[region.lat, region.lng]}
                radius={isSelected ? 14 : 10}
                pathOptions={{
                  fillColor:   isSelected ? '#003366' : style.fill,
                  color:       '#ffffff',
                  weight:      isSelected ? 3 : 2,
                  fillOpacity: 1,
                }}
                eventHandlers={{ click: () => onRegionClick?.(region) }}
              >
                <Tooltip direction="top" offset={[0, -8]} opacity={0.98}>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, minWidth: 190 }}>
                    <div style={{ fontWeight: 700, marginBottom: 3 }}>{region.flag} {region.name}</div>
                    <div style={{ color: style.fill, fontWeight: 700, marginBottom: 3 }}>
                      {style.label} · {region.water_stress}/5 WRI
                    </div>
                    <div style={{ color: '#555', lineHeight: 1.6 }}>
                      {region.population_m}M hab. · {region.dc_potential_mw} MW DC potencial
                    </div>
                    <div style={{ color: '#003366', fontWeight: 600, fontSize: 10, marginTop: 3 }}>
                      ▶ Clic para análisis IA
                    </div>
                  </div>
                </Tooltip>
              </CircleMarker>
            )
          })}

          {/* Datacenter markers — PeeringDB, clicables para análisis SeaCool */}
          {layer === 'dc' && !dcLoading && datacenters.map(dc => {
            const isSelected = dc.id === selectedDCId
            return (
              <CircleMarker
                key={dc.id}
                center={[dc.lat, dc.lng]}
                radius={isSelected ? dcRadius(dc.net_count) + 4 : dcRadius(dc.net_count)}
                pathOptions={{
                  fillColor:   isSelected ? '#003366' : '#06b6d4',
                  color:       isSelected ? '#ffffff'  : '#0e7490',
                  weight:      isSelected ? 3 : 1,
                  fillOpacity: isSelected ? 1 : 0.7,
                }}
                eventHandlers={{ click: () => onDCClick?.(dc) }}
              >
                <Tooltip direction="top" offset={[0, -6]} opacity={0.98}>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, minWidth: 180 }}>
                    <div style={{ fontWeight: 700, marginBottom: 3 }}>🏢 {dc.name}</div>
                    <div style={{ color: '#0e7490', fontWeight: 600, marginBottom: 3 }}>
                      ~{Math.max(5, Math.round(dc.net_count ** 0.65))} MW est. · {dc.net_count} redes
                    </div>
                    <div style={{ color: '#666', lineHeight: 1.6 }}>
                      {dc.city}{dc.city && dc.country ? ', ' : ''}{dc.country}
                    </div>
                    <div style={{ color: '#003366', fontWeight: 600, fontSize: 10, marginTop: 3 }}>
                      ▶ Clic para análisis SeaCool
                    </div>
                  </div>
                </Tooltip>
              </CircleMarker>
            )
          })}
        </MapContainer>

        {/* ── Legend (bottom-left overlay) ── */}
        <div className="absolute bottom-6 left-3 z-[1000] bg-white/95 backdrop-blur rounded-xl border border-slate-200 shadow-md p-3">
          {layer === 'water' ? (
            <>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">WRI Aqueduct 4.0</p>
              {Object.values(STRESS).map(v => (
                <div key={v.label} className="flex items-center gap-2 mb-1.5">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ background: v.fill }} />
                  <span className="text-[11px] font-medium text-slate-600">{v.label}</span>
                </div>
              ))}
              <div className="mt-2 pt-2 border-t border-slate-100 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full border-2 border-white bg-[#003366] shrink-0" />
                  <span className="text-[10px] text-slate-500">Región analizable (IA)</span>
                </div>
                <p className="text-[9px] text-slate-400">Clic en ⬤ blanco para análisis</p>
              </div>
            </>
          ) : (
            <>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Redes conectadas</p>
              {[
                { label: '≥ 100 redes',  r: 10 },
                { label: '20 – 99 redes', r: 7  },
                { label: '< 20 redes',   r: 4  },
              ].map(({ label, r }) => (
                <div key={label} className="flex items-center gap-2 mb-1.5">
                  <span className="rounded-full bg-cyan-400 border border-cyan-600 shrink-0"
                    style={{ width: r, height: r, display: 'inline-block' }} />
                  <span className="text-[11px] font-medium text-slate-600">{label}</span>
                </div>
              ))}
              {datacenters.length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-100">
                  <p className="text-[9px] text-slate-400">{datacenters.length.toLocaleString()} instalaciones</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
