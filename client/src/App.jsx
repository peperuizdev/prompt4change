import { BrowserRouter, Routes, Route } from 'react-router-dom'
import TopNavBar from './components/layout/TopNavBar'
import GlobalDashboard from './pages/GlobalDashboard'
import ESGReports from './pages/ESGReports'
import AuditPage from './pages/AuditPage'

export default function App() {
  return (
    <BrowserRouter>
      <TopNavBar />
  <main className="mt-20">
        <Routes>
          <Route path="/"    element={<GlobalDashboard />} />
          <Route path="/esg" element={<ESGReports />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}
