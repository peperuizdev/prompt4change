import { useState, useEffect } from 'react'

// Store de sesión — persiste mientras la SPA no se recargue
let _reports = []
const _subs   = new Set()

export function addReport(report) {
  const idx = _reports.findIndex(r => r.id === report.id)
  if (idx >= 0) {
    _reports = _reports.map((r, i) => (i === idx ? { ...r, ...report } : r))
  } else {
    _reports = [{ ...report, timestamp: new Date() }, ..._reports]
  }
  _subs.forEach(fn => fn([..._reports]))
}

export function useReports() {
  const [reports, setReports] = useState([..._reports])
  useEffect(() => {
    _subs.add(setReports)
    setReports([..._reports])
    return () => _subs.delete(setReports)
  }, [])
  return reports
}
