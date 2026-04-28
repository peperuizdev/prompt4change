import { BrowserRouter, Routes, Route } from 'react-router-dom'
import TopNavBar from './components/layout/TopNavBar'
import GlobalDashboard from './pages/GlobalDashboard'
import ESGReports from './pages/ESGReports'

export default function App() {
  return (
    <BrowserRouter>
      <TopNavBar />
      <main className="mt-14 bg-background" style={{ height: 'calc(100vh - 56px)', overflowY: 'auto' }}>
        <Routes>
          <Route path="/" element={<GlobalDashboard />} />
          <Route path="/esg" element={<ESGReports />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}
