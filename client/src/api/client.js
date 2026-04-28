const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`)
  return res.json()
}

export const getRegions      = ()         => apiFetch('/api/global/regions')
export const getDatacenters  = ()         => apiFetch('/api/global/datacenters')
export const analyzeDC       = (dc)       => apiFetch('/api/global/analyze-dc', {
  method: 'POST',
  body: JSON.stringify(dc),
})
export const analyzeRegion   = (regionId) => apiFetch('/api/global/analyze', {
  method: 'POST',
  body: JSON.stringify({ region_id: regionId }),
})
export const simulateSeacool = (body)    => apiFetch('/api/seacool/simulate', {
  method: 'POST',
  body: JSON.stringify(body),
})
