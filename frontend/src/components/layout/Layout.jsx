import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import useAuthStore from '../../store/authStore'
import { canAccess } from '../../config/roles'

import DashboardPage    from '../../pages/dashboard/DashboardPage'
import MonitoringPage   from '../../pages/monitoring/MonitoringPage'
import AlertsPage       from '../../pages/alerts/AlertsPage'
import IncidentsPage    from '../../pages/incidents/IncidentsPage'
import AutomationPage   from '../../pages/automation/AutomationPage'
import AnalyticsPage    from '../../pages/analytics/AnalyticsPage'
import ReportsPage      from '../../pages/reports/ReportsPage'
import CompliancePage   from '../../pages/compliance/CompliancePage'
import UsersPage        from '../../pages/users/UsersPage'

function RequireRole({ path, children }) {
  const role = useAuthStore((s) => s.user?.role)
  return canAccess(role, path) ? children : <Navigate to="/" replace />
}

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#F0F0F0' }}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-y-auto p-6">
          <Routes>
            <Route path="/"            element={<DashboardPage />}  />
            <Route path="/monitoring"  element={<MonitoringPage />} />
            <Route path="/alerts"      element={<AlertsPage />}     />
            <Route path="/incidents"   element={<IncidentsPage />}  />
            <Route path="/automation"  element={<RequireRole path="/automation"><AutomationPage /></RequireRole>} />
            <Route path="/analytics"   element={<AnalyticsPage />}  />
            <Route path="/reports"     element={<RequireRole path="/reports"><ReportsPage /></RequireRole>} />
            <Route path="/compliance"  element={<RequireRole path="/compliance"><CompliancePage /></RequireRole>} />
            <Route path="/users"       element={<RequireRole path="/users"><UsersPage /></RequireRole>} />
          </Routes>
        </main>
      </div>
    </div>
  )
}