import { NavLink } from 'react-router-dom'

const navItems = [
<<<<<<< HEAD
  { to: '/',       icon: 'dashboard',   label: 'Global Dashboard',  fill: true },
  { to: '/agents', icon: 'smart_toy',   label: 'AI Agent Monitor',  fill: true },
  { to: '/farmer', icon: 'agriculture', label: 'Farmer Portal',     fill: true },
  { to: '/esg',    icon: 'assessment',  label: 'ESG Reports',       fill: true },
  { to: '/audit',  icon: 'fact_check',  label: 'Solution Audit',    fill: true },
=======
  { to: '/',    icon: 'public',     label: 'Mapa Global',    fill: true },
  { to: '/esg', icon: 'assessment', label: 'Impact Reports', fill: true },
>>>>>>> origin/feature/prototipe
]

export default function SideNavBar() {
  return (
    <aside className="fixed left-0 top-16 h-[calc(100vh-64px)] w-64 bg-white border-r border-slate-100 flex flex-col p-4 space-y-2 z-40 font-['Inter'] text-sm tracking-wide">
      <div className="px-2 py-4 mb-2">
        <h2 className="text-sm font-bold text-[#003366] uppercase tracking-widest">Command Center</h2>
        <p className="text-xs text-slate-400 mt-0.5">Water Crisis Intelligence Platform</p>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map(({ to, icon, label, fill }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 ${
                isActive
                  ? 'bg-blue-50 text-[#003366] font-semibold'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className="material-symbols-outlined text-[20px]"
                  style={isActive && fill ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  {icon}
                </span>
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto pt-4 border-t border-slate-100">
        <div className="px-2 py-2 bg-slate-50 rounded-lg">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mb-1">Fuentes de datos</p>
          <p className="text-[10px] text-slate-500">WRI Aqueduct 2023 · FAO AQUASTAT · CC BY 4.0</p>
        </div>
      </div>
    </aside>
  )
}
