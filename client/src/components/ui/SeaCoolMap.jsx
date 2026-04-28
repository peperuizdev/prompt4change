import 'leaflet/dist/leaflet.css'
import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet'
import { getRegions } from '../../api/client'

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

const DATACENTERS = [
  { id: 'ae-dxb', name: 'Dubai Digital Park',    country: 'EAU',          lat: 25.18,  lng: 55.26,  mw: 300, tier: 'Hyperscale', providers: 'AWS · Azure · Google' },
  { id: 'ae-auh', name: 'Abu Dhabi DC Hub',       country: 'EAU',          lat: 24.45,  lng: 54.37,  mw: 180, tier: 'Grande',      providers: 'Khazna · G42' },
  { id: 'sa-ruh', name: 'Riyadh Cloud Region',    country: 'Arabia Saudí', lat: 24.68,  lng: 46.72,  mw: 250, tier: 'Hyperscale', providers: 'AWS · Google · STC' },
  { id: 'qa-doh', name: 'Qatar Data Hub',         country: 'Qatar',        lat: 25.28,  lng: 51.53,  mw: 90,  tier: 'Grande',      providers: 'Ooredoo · Azure' },
  { id: 'om-mct', name: 'Muscat DC Zone',         country: 'Omán',         lat: 23.61,  lng: 58.59,  mw: 60,  tier: 'Mediano',     providers: 'Omantel · Ericsson' },
  { id: 'il-tlv', name: 'Tel Aviv Cloud Zone',    country: 'Israel',       lat: 32.08,  lng: 34.78,  mw: 120, tier: 'Grande',      providers: 'AWS · Azure' },
  { id: 'eg-cai', name: 'Cairo DC Cluster',       country: 'Egipto',       lat: 30.06,  lng: 31.24,  mw: 80,  tier: 'Mediano',     providers: 'Equinix · Orange' },
  { id: 'es-mad', name: 'Madrid Campus',          country: 'España',       lat: 40.42,  lng: -3.70,  mw: 420, tier: 'Hyperscale', providers: 'AWS · Azure · Google · Equinix' },
  { id: 'es-bcn', name: 'Barcelona Campus',       country: 'España',       lat: 41.39,  lng: 2.17,   mw: 160, tier: 'Grande',      providers: 'Equinix · Nabiax' },
  { id: 'it-mil', name: 'Milan Campus',           country: 'Italia',       lat: 45.47,  lng: 9.19,   mw: 380, tier: 'Hyperscale', providers: 'AWS · Azure · Google' },
  { id: 'gr-ath', name: 'Athens DC',              country: 'Grecia',       lat: 37.98,  lng: 23.73,  mw: 60,  tier: 'Mediano',     providers: 'Lamda Hellix · OTE' },
  { id: 'tr-ist', name: 'Istanbul Hub',           country: 'Turquía',      lat: 41.02,  lng: 28.97,  mw: 200, tier: 'Grande',      providers: 'Türk Telekom · Equinix' },
  { id: 'ma-cas', name: 'Casablanca Hub',         country: 'Marruecos',    lat: 33.57,  lng: -7.59,  mw: 45,  tier: 'Mediano',     providers: 'Maroc Telecom · AWS' },
  { id: 'in-bom', name: 'Mumbai Hyperscale Zone', country: 'India',        lat: 19.08,  lng: 72.88,  mw: 550, tier: 'Hyperscale', providers: 'AWS · Azure · Google · Jio' },
  { id: 'in-che', name: 'Chennai DC Hub',         country: 'India',        lat: 13.08,  lng: 80.27,  mw: 200, tier: 'Grande',      providers: 'Azure · NTT' },
  { id: 'pk-kar', name: 'Karachi DC',             country: 'Pakistán',     lat: 24.86,  lng: 67.01,  mw: 50,  tier: 'Mediano',     providers: 'PTCL · Zong' },
  { id: 'za-cpt', name: 'Cape Town Campus',       country: 'Sudáfrica',    lat: -33.93, lng: 18.42,  mw: 90,  tier: 'Grande',      providers: 'Teraco · AWS' },
  { id: 'ke-nbo', name: 'Nairobi Hub',            country: 'Kenia',        lat: -1.29,  lng: 36.82,  mw: 40,  tier: 'Mediano',     providers: 'SEACOM · Raxio' },
  { id: 'pe-lim', name: 'Lima DC Zone',           country: 'Perú',         lat: -12.05, lng: -77.04, mw: 60,  tier: 'Mediano',     providers: 'AWS · Equinix' },
  { id: 'cl-scl', name: 'Santiago Campus',        country: 'Chile',        lat: -33.45, lng: -70.67, mw: 90,  tier: 'Grande',      providers: 'AWS · Azure · Entel' },
  { id: 'mx-mex', name: 'Ciudad de México Hub',   country: 'México',       lat: 19.43,  lng: -99.13, mw: 300, tier: 'Grande',      providers: 'AWS · Azure · Equinix' },
  { id: 'au-per', name: 'Perth DC Zone',          country: 'Australia',    lat: -31.95, lng: 115.86, mw: 100, tier: 'Grande',      providers: 'Equinix · NextDC' },
  { id: 'cn-sha', name: 'Shanghai Coastal Hub',   country: 'China',        lat: 31.23,  lng: 121.47, mw: 600, tier: 'Hyperscale', providers: 'Alibaba · Tencent' },
]

const DC_RADIUS = { Hyperscale: 13, Grande: 9, Mediano: 6 }

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png'

export default function SeaCoolMap({ height = '100%', onRegionClick, selectedId }) {
  const [regions, setRegions] = useState([])
  const [layer, setLayer]     = useState('water')
  const [filter, setFilter]   = useState('all')

  useEffect(() => {
    getRegions().then(setRegions).catch(console.error)
  }, [])

  const filteredRegions = layer === 'water'
    ? (filter === 'all' ? regions
      : filter === 'extreme' ? regions.filter(r => r.water_stress >= 4.5)
      : regions.filter(r => r.water_stress >= 3.5 && r.water_stress < 4.5))
    : []

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
              { key: 'all',     label: 'Todas',           dot: null        },
              { key: 'extreme', label: 'Extremo',         dot: '#ef4444'   },
              { key: 'high',    label: 'Alto',            dot: '#f97316'   },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all border ${
                  filter === f.key
                    ? 'bg-[#003366] text-white border-[#003366]'
                    : 'text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700'
                }`}
              >
                {f.dot && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: f.dot }} />}
                {f.label}
              </button>
            ))}
          </div>
        )}

        {/* DC provisional notice */}
        {layer === 'dc' && (
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
            <span className="material-symbols-outlined text-[13px]">info</span>
            Datos provisionales — Synergy Research · JLL
          </span>
        )}

        {/* Source */}
        <div className="ml-auto flex items-center gap-1 text-[10px] text-slate-400 font-medium">
          {layer === 'water'
            ? <><span className="material-symbols-outlined text-[12px]">verified</span> WRI Aqueduct 2023 · CC BY 4.0</>
            : <><span className="material-symbols-outlined text-[12px]">storage</span> {DATACENTERS.length} clusters identificados</>
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

          {/* Water stress markers */}
          {layer === 'water' && filteredRegions.map(region => {
            const style      = getStressStyle(region.water_stress)
            const isSelected = region.id === selectedId
            const radius     = 7 + (region.water_stress - 2) * 2.5 + (region.population_m > 5 ? 3 : 0)

            return (
              <CircleMarker
                key={region.id}
                center={[region.lat, region.lng]}
                radius={isSelected ? radius + 5 : radius}
                pathOptions={{
                  fillColor:   style.fill,
                  color:       isSelected ? '#003366' : style.stroke,
                  weight:      isSelected ? 3 : 1,
                  fillOpacity: isSelected ? 1 : 0.75,
                }}
                eventHandlers={{ click: () => onRegionClick?.(region) }}
              >
                <Tooltip direction="top" offset={[0, -6]} opacity={0.98}>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, minWidth: 180 }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{region.flag} {region.name}</div>
                    <div style={{ color: style.fill, fontWeight: 700, marginBottom: 4 }}>
                      Estrés {style.label} — {region.water_stress}/5
                    </div>
                    <div style={{ color: '#666', lineHeight: 1.6 }}>
                      {region.population_m}M hab. · {region.water_access_pct}% agua potable<br />
                      {region.annual_rainfall_mm} mm/año · {region.dc_potential_mw} MW DC potencial
                    </div>
                  </div>
                </Tooltip>
              </CircleMarker>
            )
          })}

          {/* Datacenter markers */}
          {layer === 'dc' && DATACENTERS.map(dc => (
            <CircleMarker
              key={dc.id}
              center={[dc.lat, dc.lng]}
              radius={DC_RADIUS[dc.tier] ?? 8}
              pathOptions={{
                fillColor:   '#06b6d4',
                color:       '#0e7490',
                weight:      1.5,
                fillOpacity: 0.75,
              }}
            >
              <Tooltip direction="top" offset={[0, -6]} opacity={0.98}>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, minWidth: 190 }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>🏢 {dc.name}</div>
                  <div style={{ color: '#0e7490', fontWeight: 700, marginBottom: 4 }}>
                    {dc.tier} · {dc.mw} MW
                  </div>
                  <div style={{ color: '#666', lineHeight: 1.6 }}>
                    {dc.country}<br />{dc.providers}
                  </div>
                  <div style={{ color: '#aaa', fontSize: 10, marginTop: 4, fontStyle: 'italic' }}>
                    Datos ilustrativos / fuentes públicas
                  </div>
                </div>
              </Tooltip>
            </CircleMarker>
          ))}
        </MapContainer>

        {/* ── Legend (bottom-left overlay) ── */}
        <div className="absolute bottom-6 left-3 z-[1000] bg-white/95 backdrop-blur rounded-xl border border-slate-200 shadow-md p-3">
          {layer === 'water' ? (
            <>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Estrés Hídrico WRI</p>
              {Object.values(STRESS).map(v => (
                <div key={v.label} className="flex items-center gap-2 mb-1.5">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ background: v.fill }} />
                  <span className="text-[11px] font-medium text-slate-600">{v.label}</span>
                </div>
              ))}
              <div className="mt-2 pt-2 border-t border-slate-100">
                <p className="text-[9px] text-slate-400">Clic para análisis IA</p>
              </div>
            </>
          ) : (
            <>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Capacidad DC</p>
              {[
                { label: 'Hyperscale  >200 MW', r: 13 },
                { label: 'Grande  80–200 MW',   r: 9  },
                { label: 'Mediano  <80 MW',      r: 6  },
              ].map(({ label, r }) => (
                <div key={label} className="flex items-center gap-2 mb-1.5">
                  <span className="rounded-full bg-cyan-400 border border-cyan-600 shrink-0"
                    style={{ width: r, height: r, display: 'inline-block' }} />
                  <span className="text-[11px] font-medium text-slate-600">{label}</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
