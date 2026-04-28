import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import MetricCard from '../components/ui/MetricCard'
import { apiFetch } from '../api/client'

const chartData = [
  { time: '00:00', heat: 620, water: 8200 },
  { time: '04:00', heat: 710, water: 9400 },
  { time: '08:00', heat: 780, water: 10800 },
  { time: '12:00', heat: 830, water: 11600 },
  { time: '16:00', heat: 842, water: 12450 },
  { time: '20:00', heat: 800, water: 11900 },
]

export default function GlobalDashboard() {
  const [systemOnline, setSystemOnline] = useState(null)

  useEffect(() => {
    apiFetch('/health')
      .then(data => setSystemOnline(data.status === 'ok'))
      .catch(() => setSystemOnline(false))
  }, [])

  return (
    <>
      {/* Header Section */}
      <div className="flex justify-between items-end mb-lg">
        <div>
          <h1 className="font-headline-md text-headline-md text-on-surface">Global Dashboard</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Real-time monitoring of thermal recovery and water desalination assets.
          </p>
        </div>
        <div className="flex gap-sm">
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-outline-variant shadow-sm">
            <div className={`w-2 h-2 rounded-full ${systemOnline === false ? 'bg-red-500' : 'bg-secondary'}`}></div>
            <span className={`font-label-caps text-label-caps uppercase ${systemOnline === false ? 'text-red-600' : 'text-secondary'}`}>
              {systemOnline === null ? 'Checking...' : systemOnline ? 'System Online' : 'System Offline'}
            </span>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-lg mb-lg">
        <MetricCard
          label="Residual Heat Recovered"
          value="842.5"
          unit="MW"
          trend="12.4% vs last month"
          icon="thermostat"
          barColor="#f97316"
          barPct={75}
        />
        <MetricCard
          label="Total Desalinated Water"
          value="12,450"
          unit="m³"
          trend="8.2% efficiency gain"
          icon="water_drop"
          barColor="#3b82f6"
          barPct={62}
        />
        {/* Distribution Card */}
        <div className="bg-white p-lg rounded-xl border border-slate-200 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)]">
          <div className="flex justify-between items-start mb-4">
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Current Distribution</span>
            <span className="material-symbols-outlined text-green-600">pie_chart</span>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span>AGRICULTURAL (65%)</span>
                <span>8,092 m³</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-secondary" style={{ width: '65%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-bold mb-1 text-slate-500">
                <span>URBAN (35%)</span>
                <span>4,358 m³</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#003366]" style={{ width: '35%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Map & Flow Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg mb-lg">
        {/* System Map */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col">
          <div className="p-md border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <span className="font-label-caps text-label-caps text-on-surface uppercase">Global Asset Map</span>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                <input defaultChecked className="rounded text-primary focus:ring-primary w-3 h-3" type="checkbox" />
                Datacenters
              </label>
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                <input defaultChecked className="rounded text-secondary focus:ring-secondary w-3 h-3" type="checkbox" />
                Agri-Zones
              </label>
            </div>
          </div>
          <div className="relative flex-1 min-h-[300px] bg-slate-100 flex items-center justify-center">
            <div className="text-center text-slate-400">
              <span className="material-symbols-outlined text-6xl mb-2 block">map</span>
              <p className="text-sm font-medium">Global Asset Map</p>
            </div>
            {/* Node overlays */}
            <div className="absolute top-1/4 left-1/3 group">
              <div className="w-4 h-4 bg-primary rounded-full animate-pulse flex items-center justify-center cursor-pointer">
                <div className="w-8 h-8 bg-primary/20 rounded-full animate-ping absolute"></div>
              </div>
              <div className="hidden group-hover:block absolute top-6 left-1/2 -translate-x-1/2 bg-white p-2 rounded shadow-lg border border-slate-200 z-10 w-48">
                <p className="text-xs font-bold text-primary mb-1">DC-NORTH-01 (Oslo)</p>
                <p className="text-[10px] text-slate-500">Recovery: 142 MW</p>
                <p className="text-[10px] text-slate-500">Efficiency: 98.2%</p>
              </div>
            </div>
            <div className="absolute bottom-1/3 right-1/4 group">
              <div className="w-4 h-4 bg-secondary rounded-full flex items-center justify-center cursor-pointer">
                <div className="w-6 h-6 border border-secondary/40 rounded-full absolute"></div>
              </div>
              <div className="hidden group-hover:block absolute top-6 left-1/2 -translate-x-1/2 bg-white p-2 rounded shadow-lg border border-slate-200 z-10 w-48">
                <p className="text-xs font-bold text-secondary mb-1">AGRI-ZONE-SOUTH (Almería)</p>
                <p className="text-[10px] text-slate-500">Intake: 2,400 m³/day</p>
                <p className="text-[10px] text-slate-500">Crop Health: Optimal</p>
              </div>
            </div>
            <div className="absolute bottom-4 left-4 bg-white/80 backdrop-blur-md p-4 rounded-lg border border-slate-200 max-w-xs">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Node Performance Hub</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-medium">Nordic Cluster</span>
                  <span className="text-xs font-bold text-secondary">ACTIVE</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-medium">Med-Agri Loop</span>
                  <span className="text-xs font-bold text-secondary">ACTIVE</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-medium">Atlantic Flow</span>
                  <span className="text-xs font-bold text-orange-500">MAINTENANCE</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Thermal-Water Flow */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] flex flex-col p-lg">
          <span className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-6">Thermal-Water Conversion Flow</span>
          <div className="flex-1 flex flex-col justify-center items-center space-y-8">
            <div className="w-full flex items-center gap-4">
              <div className="w-12 h-12 rounded bg-primary/10 flex items-center justify-center border border-primary/20">
                <span className="material-symbols-outlined text-primary">dns</span>
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-end mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider">Source: Datacenters</span>
                  <span className="text-sm font-mono font-bold">1,204 MW IN</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full">
                  <div className="h-full bg-primary" style={{ width: '85%' }} />
                </div>
              </div>
            </div>
            <div className="h-8 w-0.5 bg-gradient-to-b from-primary via-blue-400 to-secondary relative">
              <span className="material-symbols-outlined absolute -bottom-4 -left-[11px] text-secondary text-sm">keyboard_arrow_down</span>
            </div>
            <div className="w-full flex items-center gap-4">
              <div className="w-12 h-12 rounded bg-orange-50 flex items-center justify-center border border-orange-200">
                <span className="material-symbols-outlined text-orange-600">sync_alt</span>
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-end mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider">Heat Exchange Efficiency</span>
                  <span className="text-sm font-mono font-bold">78.4%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full">
                  <div className="h-full bg-orange-400" style={{ width: '78%' }} />
                </div>
              </div>
            </div>
            <div className="h-8 w-0.5 bg-secondary/30 relative">
              <span className="material-symbols-outlined absolute -bottom-4 -left-[11px] text-secondary text-sm">keyboard_arrow_down</span>
            </div>
            <div className="w-full flex items-center gap-4">
              <div className="w-12 h-12 rounded bg-secondary/10 flex items-center justify-center border border-secondary/20">
                <span className="material-symbols-outlined text-secondary">water_lux</span>
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-end mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider">Output: Desalinated H2O</span>
                  <span className="text-sm font-mono font-bold">842 m³/hr</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full">
                  <div className="h-full bg-secondary" style={{ width: '92%' }} />
                </div>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="flex items-center gap-2 text-on-secondary-container bg-secondary-container/20 p-3 rounded-lg">
              <span className="material-symbols-outlined text-secondary">info</span>
              <p className="text-xs font-medium">Efficiency is 4.2% above baseline due to cold ocean currents in Northern sectors.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recharts Line Chart */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] p-lg mb-lg">
        <div className="mb-4">
          <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">24h Performance Trend</span>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <YAxis yAxisId="heat" orientation="left" tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <YAxis yAxisId="water" orientation="right" tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <Tooltip />
            <Legend />
            <Line yAxisId="heat" type="monotone" dataKey="heat" name="Heat Recovered (MW)" stroke="#003366" strokeWidth={2} dot={false} />
            <Line yAxisId="water" type="monotone" dataKey="water" name="Water Produced (m³)" stroke="#006d37" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Footer */}
      <footer className="mt-xl flex justify-between items-center text-slate-400 text-[10px] font-bold uppercase tracking-widest pb-lg">
        <span>System ID: SC-7742-GLOBAL</span>
        <span>Last Updated: {new Date().toISOString().replace('T', ' ').slice(0, 19)} UTC</span>
        <span>SeaCool © 2024 Digital Infrastructure &amp; Sustainability</span>
      </footer>
    </>
  )
}
