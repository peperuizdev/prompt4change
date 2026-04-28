export default function TopNavBar() {
  return (
    <header className="fixed top-0 w-full z-50 flex justify-between items-center px-10 h-16 bg-white border-b border-slate-200 shadow-sm font-['Inter'] text-sm font-medium">
      <div className="flex items-center gap-4">
        <span className="text-xl font-black tracking-tighter text-[#003366]">SeaCool</span>
      </div>
      <div className="flex items-center gap-6">
        <div className="relative hidden md:flex items-center bg-surface-container-low rounded-full px-4 py-1.5 border border-outline-variant">
          <span className="material-symbols-outlined text-slate-500 mr-2 text-lg">search</span>
          <input
            className="bg-transparent border-none focus:ring-0 text-sm w-64 outline-none"
            placeholder="Search system metrics..."
            type="text"
          />
        </div>
        <div className="flex items-center gap-4">
          <span className="material-symbols-outlined text-slate-500 cursor-pointer hover:bg-slate-50 p-2 rounded-full transition-colors">notifications</span>
          <span className="material-symbols-outlined text-slate-500 cursor-pointer hover:bg-slate-50 p-2 rounded-full transition-colors">settings</span>
          <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-white overflow-hidden">
            <span className="material-symbols-outlined text-sm">person</span>
          </div>
        </div>
      </div>
    </header>
  )
}
