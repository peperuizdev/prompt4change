import { useState, useEffect } from 'react'
import { getRegions } from '../../api/client'

export default function TopNavBar() {
  const [totalRegions, setTotalRegions]   = useState(null)
  const [criticalCount, setCriticalCount] = useState(null)

  useEffect(() => {
    getRegions()
      .then(regions => {
        setTotalRegions(regions.length)
        setCriticalCount(regions.filter(r => r.water_stress >= 4.5).length)
      })
      .catch(() => {})
  }, [])

  return (
    <header className="fixed top-0 w-full z-50 flex justify-between items-center px-8 h-16 bg-white border-b border-slate-200 shadow-sm font-['Inter'] text-sm font-medium">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#003366] flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>water_drop</span>
          </div>
          <div>
            <span className="text-base font-black tracking-tight text-[#003366]">SeaCool</span>
            <span className="text-xs text-slate-400 ml-2 font-normal hidden md:inline">Global Water Intelligence</span>
          </div>
        </div>

        {totalRegions && (
          <div className="hidden md:flex items-center gap-4 pl-6 border-l border-slate-100">
            <Stat label="Regiones monitorizadas" value={totalRegions} color="text-[#003366]" />
            <Stat label="En estrés extremo" value={criticalCount} color="text-red-600" dot="bg-red-500" />
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <span className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-secondary bg-secondary/10 px-3 py-1.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
          Datos WRI Aqueduct 2023
        </span>
        <div className="w-8 h-8 rounded-full bg-[#003366]/10 flex items-center justify-center">
          <span className="material-symbols-outlined text-[#003366] text-sm">person</span>
        </div>
      </div>
    </header>
  )
}

function Stat({ label, value, color, dot }) {
  return (
    <div className="flex items-center gap-2">
      {dot && <span className={`w-2 h-2 rounded-full ${dot}`} />}
      <div>
        <div className={`text-base font-bold leading-none ${color}`}>{value}</div>
        <div className="text-[10px] text-slate-400 font-normal">{label}</div>
      </div>
    </div>
  )
}
