export default function MetricCard({ label, value, unit, trend, trendPct, icon, barColor, barPct }) {
  return (
    <div className="bg-white p-lg rounded-xl border border-slate-200 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] relative overflow-hidden">
      <div className="flex justify-between items-start mb-4">
        <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">{label}</span>
        <span className="material-symbols-outlined" style={{ color: barColor }}>{icon}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-extrabold text-primary">{value}</span>
        <span className="text-xl font-bold text-on-surface-variant">{unit}</span>
      </div>
      <div className="mt-4 flex items-center gap-1 text-secondary font-bold text-sm">
        <span className="material-symbols-outlined text-sm">trending_up</span>
        <span>{trend}</span>
      </div>
      <div className="absolute bottom-0 left-0 w-full h-1" style={{ background: `${barColor}33` }}>
        <div className="h-full" style={{ width: `${barPct}%`, background: barColor }} />
      </div>
    </div>
  )
}
