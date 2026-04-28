import 'leaflet/dist/leaflet.css'
import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet'
import { getRegions } from '../../api/client'

const STRESS = {
  extreme: { fill: '#dc2626', stroke: '#991b1b', label: 'Extremo',   min: 4.5 },
  high:    { fill: '#f97316', stroke: '#9a3412', label: 'Alto',       min: 3.5 },
  medium:  { fill: '#eab308', stroke: '#854d0e', label: 'Medio-Alto', min: 0   },
}

function getStressStyle(score) {
  if (score >= 4.5) return STRESS.extreme
  if (score >= 3.5) return STRESS.high
  return STRESS.medium
}

const TILES = {
  dark: 'https://{s}.basemaps.cartocdn.com/dark_matter_nolabels/{z}/{x}/{y}{r}.png',
  light: 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png',
}

export default function SeaCoolMap({ height = '100%', onRegionClick, selectedId }) {
  const [regions, setRegions] = useState([])
  const [tileMode, setTileMode] = useState('dark')
  const [filter, setFilter]     = useState('all')

  useEffect(() => {
    getRegions().then(setRegions).catch(console.error)
  }, [])

  const filtered = filter === 'all' ? regions : regions.filter(r => {
    if (filter === 'extreme') return r.water_stress >= 4.5
    if (filter === 'high')    return r.water_stress >= 3.5 && r.water_stress < 4.5
    return true
  })

  return (
    <div className="relative w-full" style={{ height }}>
      {/* Tile toggle */}
      <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
        <div className="bg-white/95 backdrop-blur rounded-lg border border-slate-200 shadow p-1 flex gap-1">
          {['dark', 'light'].map(m => (
            <button key={m} onClick={() => setTileMode(m)}
              className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-all
                ${tileMode === m ? 'bg-[#003366] text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
              {m === 'dark' ? 'Dark' : 'Light'}
            </button>
          ))}
        </div>
        {/* Filter */}
        <div className="bg-white/95 backdrop-blur rounded-lg border border-slate-200 shadow p-2">
          <p className="text-[9px] font-bold text-slate-400 uppercase mb-1.5">Filtrar</p>
          {[
            { key: 'all',     label: 'Todas' },
            { key: 'extreme', label: 'Extremo', color: STRESS.extreme.fill },
            { key: 'high',    label: 'Alto',    color: STRESS.high.fill },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`flex items-center gap-1.5 w-full px-1.5 py-1 rounded text-[10px] font-bold transition-all
                ${filter === f.key ? 'bg-slate-100' : 'hover:bg-slate-50'}`}>
              {f.color && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: f.color }} />}
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-8 left-3 z-[1000] bg-white/90 backdrop-blur rounded-lg border border-slate-200 shadow p-2.5">
        <p className="text-[9px] font-bold text-slate-400 uppercase mb-1.5">Estrés Hídrico (WRI)</p>
        {Object.entries(STRESS).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1.5 mb-1">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: v.fill }} />
            <span className="text-[10px] font-medium text-slate-600">{v.label}</span>
          </div>
        ))}
        <div className="mt-2 pt-2 border-t border-slate-100">
          <p className="text-[9px] text-slate-400">Clic en un punto para analizar</p>
        </div>
      </div>

      <MapContainer
        center={[20, 15]}
        zoom={2}
        style={{ height: '100%', width: '100%', background: tileMode === 'dark' ? '#1a1a2e' : '#f8f9fa' }}
        zoomControl={true}
        minZoom={2}
      >
        <TileLayer
          url={TILES[tileMode]}
          attribution='&copy; <a href="https://carto.com">CARTO</a>'
          maxZoom={12}
        />

        {filtered.map(region => {
          const style     = getStressStyle(region.water_stress)
          const isSelected = region.id === selectedId
          const radius    = 6 + (region.water_stress - 2) * 3 + (region.population_m > 5 ? 4 : 0)

          return (
            <CircleMarker
              key={region.id}
              center={[region.lat, region.lng]}
              radius={isSelected ? radius + 4 : radius}
              pathOptions={{
                fillColor:   style.fill,
                color:       isSelected ? '#ffffff' : style.stroke,
                weight:      isSelected ? 3 : 1.5,
                fillOpacity: isSelected ? 1 : 0.8,
              }}
              eventHandlers={{ click: () => onRegionClick?.(region) }}
            >
              <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
                <div className="text-xs">
                  <strong>{region.flag} {region.name}</strong>
                  <br />
                  <span style={{ color: style.fill }}>⬤</span> Estrés {style.label} ({region.water_stress}/5)
                  <br />
                  {region.population_m}M hab. · {region.water_access_pct}% con agua potable
                </div>
              </Tooltip>
            </CircleMarker>
          )
        })}
      </MapContainer>
    </div>
  )
}
