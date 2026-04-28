export default function AlertBanner({ level, messages = [] }) {
  if (!messages.length) return null
  const styles = {
    warning:  { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800', icon: 'warning' },
    critical: { bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-800',    icon: 'error' },
  }
  const s = styles[level] ?? styles.warning
  return (
    <div className={`${s.bg} ${s.border} ${s.text} border rounded-xl p-md mb-lg flex gap-3 items-start`}>
      <span className="material-symbols-outlined">{s.icon}</span>
      <div>
        {messages.map((m, i) => <p key={i} className="text-sm font-medium">{m}</p>)}
      </div>
    </div>
  )
}
