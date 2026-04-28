import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { getRegions } from '../../api/client'
import logo from '../../assets/Untitled design.svg'

const NAV = [
  { to: '/',    label: 'Mapa Global',     end: true },
  { to: '/esg', label: 'Impact Reports',  end: false },
]

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
    <header className="fixed top-0 w-full z-50 flex items-center px-8 h-14 bg-white border-b border-slate-200 font-['Inter'] text-sm">
      <img src={logo} alt="SeaCool" className="h-8 w-auto mr-8" />

      <nav className="flex items-center gap-1">
        {NAV.map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-slate-100 text-[#003366]'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>

      {totalRegions && (
        <div className="hidden md:flex items-center gap-5 ml-auto">
          <Stat label="Regiones" value={totalRegions} color="text-[#003366]" />
          <Stat label="Estrés extremo" value={criticalCount} color="text-red-600" dot="bg-red-500" />
        </div>
      )}
    </header>
  )
}

function Stat({ label, value, color, dot }) {
  return (
    <div className="flex items-center gap-2">
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />}
      <div>
        <div className={`text-sm font-bold leading-none ${color}`}>{value}</div>
        <div className="text-[10px] text-slate-400 font-normal">{label}</div>
      </div>
    </div>
  )
}
