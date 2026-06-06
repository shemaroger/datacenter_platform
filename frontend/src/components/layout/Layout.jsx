import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

import DashboardPage    from '../../pages/dashboard/DashboardPage'
import MonitoringPage   from '../../pages/monitoring/MonitoringPage'
import AlertsPage       from '../../pages/alerts/AlertsPage'
import IncidentsPage    from '../../pages/incidents/IncidentsPage'
import AutomationPage   from '../../pages/automation/AutomationPage'
import AnalyticsPage    from '../../pages/analytics/AnalyticsPage'
import ReportsPage      from '../../pages/reports/ReportsPage'
import CompliancePage   from '../../pages/compliance/CompliancePage'
import UsersPage        from '../../pages/users/UsersPage'

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
            <Route path="/automation"  element={<AutomationPage />} />
            <Route path="/analytics"   element={<AnalyticsPage />}  />
            <Route path="/reports"     element={<ReportsPage />}    />
            <Route path="/compliance"  element={<CompliancePage />} />
            <Route path="/users"       element={<UsersPage />}      />
          </Routes>
        </main>
      </div>
    </div>
  )
}