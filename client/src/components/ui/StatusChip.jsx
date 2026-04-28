const styles = {
  active:   'bg-green-50  text-green-700',
  warning:  'bg-orange-50 text-orange-700',
  critical: 'bg-red-50    text-red-700',
  offline:  'bg-slate-100 text-slate-500',
}

export default function StatusChip({ status, label }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${styles[status] ?? styles.offline}`}>
      {label ?? status}
    </span>
  )
}
