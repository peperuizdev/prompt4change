export default function AgentCard({ icon, iconBg, iconColor, statusBg, statusText, statusLabel, name, description, logs, borderColor }) {
  return (
    <div className={`bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full ${borderColor ?? ''}`}>
      <div className="flex justify-between items-start mb-4">
        <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center ${iconColor}`}>
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        <span className={`px-2 py-1 ${statusBg} ${statusText} text-[10px] font-bold rounded-full`}>{statusLabel}</span>
      </div>
      <h3 className="font-headline-md text-body-md font-bold mb-1">{name}</h3>
      <p className="text-xs text-on-surface-variant mb-4">{description}</p>
      <div className="flex-1 bg-slate-50 rounded-lg p-3 font-data-mono text-[10px] text-slate-600 space-y-1 overflow-hidden">
        {logs.map((log, i) => (
          <p key={i} className={`border-l-2 pl-2 ${log.color ?? 'border-slate-300'} ${i === logs.length - 1 ? 'opacity-50' : ''}`}>
            {log.text}
          </p>
        ))}
      </div>
    </div>
  )
}
