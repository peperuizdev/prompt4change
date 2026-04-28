import { BrowserRouter, Routes, Route } from 'react-router-dom'
import TopNavBar from './components/layout/TopNavBar'
import SideNavBar from './components/layout/SideNavBar'
import GlobalDashboard from './pages/GlobalDashboard'
import AIAgentMonitor from './pages/AIAgentMonitor'
import FarmerPortal from './pages/FarmerPortal'
import ESGReports from './pages/ESGReports'

export default function App() {
  return (
    <BrowserRouter>
      <TopNavBar />
      <SideNavBar />
      <main className="ml-64 mt-16 p-xl">
        <div className="max-w-container-max mx-auto">
          <Routes>
            <Route path="/"       element={<GlobalDashboard />} />
            <Route path="/agents" element={<AIAgentMonitor />} />
            <Route path="/farmer" element={<FarmerPortal />} />
            <Route path="/esg"    element={<ESGReports />} />
          </Routes>
        </div>
      </main>
    </BrowserRouter>
  )
}
