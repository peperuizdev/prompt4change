import { NavLink, useNavigate } from 'react-router-dom'

const navItems = [
  { to: '/',       icon: 'dashboard',   label: 'Global Dashboard',  fill: true },
  { to: '/agents', icon: 'smart_toy',   label: 'AI Agent Monitor',  fill: true },
  { to: '/farmer', icon: 'agriculture', label: 'Farmer Portal',     fill: true },
  { to: '/esg',    icon: 'assessment',  label: 'ESG Reports',       fill: true },
  { to: '/audit',  icon: 'fact_check',  label: 'Solution Audit',    fill: true },
]

export default function SideNavBar() {
  const navigate = useNavigate()

  return (
    <aside className="fixed left-0 top-16 h-[calc(100vh-64px)] w-64 bg-white border-r border-slate-100 flex flex-col p-4 space-y-2 z-40 font-['Inter'] text-sm tracking-wide">
      <div className="px-2 py-4 mb-4">
        <h2 className="text-lg font-bold text-[#003366]">Command Center</h2>
        <p className="text-xs text-slate-500">Thermal Recovery Systems</p>
      </div>
      <nav className="flex-1 space-y-1">
        {navItems.map(({ to, icon, label, fill }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg hover:translate-x-1 transition-transform duration-200 ${
                isActive
                  ? 'bg-blue-50 text-[#003366] font-semibold'
                  : 'text-slate-600 hover:bg-slate-50'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className="material-symbols-outlined"
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
      <div className="mt-auto pt-4 border-t border-slate-100 space-y-1">
        <button
          onClick={() => navigate('/farmer')}
          className="w-full bg-[#003366] text-white py-2.5 rounded-lg font-bold mb-4 active:scale-95 transition-all"
        >
          Simulate Impact
        </button>
        <a className="flex items-center gap-3 px-3 py-2 text-slate-500 hover:bg-slate-50 rounded-lg" href="#">
          <span className="material-symbols-outlined">lan</span>
          <span>System Status</span>
        </a>
        <a className="flex items-center gap-3 px-3 py-2 text-slate-500 hover:bg-slate-50 rounded-lg" href="#">
          <span className="material-symbols-outlined">description</span>
          <span>Documentation</span>
        </a>
      </div>
    </aside>
  )
}
