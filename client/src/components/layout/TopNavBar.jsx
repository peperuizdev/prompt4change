import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import logo from '../../assets/Untitled design.svg'

const NAV = [
  { to: '/',    label: 'Mapa Global',     end: true },
  { to: '/esg', label: 'Impact Reports',  end: false },
]

export default function TopNavBar() {

  return (
    <header className="fixed top-0 inset-x-0 z-50 flex items-center gap-3 border-b border-slate-200 bg-white px-3 py-2 text-sm font-['Inter'] h-14 md:px-8 md:py-0">
      <img src={logo} alt="SeaCool" className="h-6 w-auto md:h-8" />

      <nav className="flex items-center gap-1 md:ml-2">
        {NAV.map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
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

      {/* Stats removed from top nav */}
    </header>
  )
}
