import { Menu, Bell, Search, RefreshCw } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import useAuthStore from '../../store/authStore'

const pageTitles = {
  '/'           : 'Dashboard',
  '/monitoring' : 'Real-Time Monitoring',
  '/alerts'     : 'Alerts & Notifications',
  '/incidents'  : 'Incident Management',
  '/automation' : 'Automation & Scheduler',
  '/analytics'  : 'Predictive Analytics',
  '/reports'    : 'Reports & Audit Logs',
  '/compliance' : 'Compliance & Policy',
  '/users'      : 'User Management',
}

export default function Topbar({ onMenuClick }) {
  const location = useLocation()
  const user     = useAuthStore((s) => s.user)
  const title    = pageTitles[location.pathname] || 'Dashboard'

  return (
    <header
      className="flex items-center justify-between px-6 flex-shrink-0"
      style={{
        background   : '#FFFFFF',
        borderBottom : '1px solid #E5E5E5',
        height       : '64px',
      }}>

      {/* Left */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="p-2 rounded-lg transition-colors hover:bg-gray-100"
          style={{ color: '#3D3D3D' }}>
          <Menu size={20} />
        </button>
        <div>
          <h1 className="font-bold text-base" style={{ color: '#1A1A1A' }}>
            {title}
          </h1>
          <p className="text-xs" style={{ color: '#9B9B9B' }}>
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long', year: 'numeric',
              month: 'long', day: 'numeric'
            })}
          </p>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">

        {/* Search */}
        <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl text-sm"
             style={{ background: '#F0F0F0', border: '1px solid #E5E5E5', color: '#9B9B9B' }}>
          <Search size={15} />
          <span>Search...</span>
        </div>

        {/* Refresh */}
        <button
          onClick={() => window.location.reload()}
          className="p-2 rounded-xl transition-colors hover:bg-gray-100"
          style={{ color: '#3D3D3D' }}
          title="Refresh">
          <RefreshCw size={18} />
        </button>

        {/* Notifications */}
        <button
          className="relative p-2 rounded-xl transition-colors hover:bg-gray-100"
          style={{ color: '#3D3D3D' }}>
          <Bell size={18} />
          <span
            className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
            style={{ background: '#C0272D' }} />
        </button>

        {/* Avatar */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ml-1 cursor-pointer"
          style={{ background: '#C0272D' }}>
          {user?.first_name?.[0] || user?.username?.[0] || 'U'}
        </div>
      </div>
    </header>
  )
}