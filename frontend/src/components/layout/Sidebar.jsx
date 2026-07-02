import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Server, Bell, AlertTriangle,
  Zap, BarChart2, FileText, ShieldCheck, Users,
  LogOut, X, ChevronRight
} from 'lucide-react'
import useAuthStore from '../../store/authStore'
import { authAPI } from '../../api/endpoints'
import { canAccess } from '../../config/roles'

const navItems = [
  { to: '/',           label: 'Dashboard',   icon: LayoutDashboard },
  { to: '/monitoring', label: 'Monitoring',  icon: Server          },
  { to: '/alerts',     label: 'Alerts',      icon: Bell            },
  { to: '/incidents',  label: 'Incidents',   icon: AlertTriangle   },
  { to: '/automation', label: 'Automation',  icon: Zap             },
  { to: '/analytics',  label: 'Analytics',   icon: BarChart2       },
  { to: '/reports',    label: 'Reports',     icon: FileText        },
  { to: '/compliance', label: 'Compliance',  icon: ShieldCheck     },
  { to: '/users',      label: 'Users',       icon: Users           },
]

export default function Sidebar({ open, onClose }) {
  const navigate    = useNavigate()
  const { user, logout, refreshToken } = useAuthStore()
  const visibleNavItems = navItems.filter(({ to }) => canAccess(user?.role, to))

  const handleLogout = async () => {
    try {
      await authAPI.logout({ refresh: refreshToken })
    } catch {}
    logout()
    navigate('/login')
  }

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-20 lg:hidden"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:relative z-30 lg:z-auto
          flex flex-col h-full
          transition-all duration-300 ease-in-out
          ${open ? 'w-64 translate-x-0' : 'w-0 lg:w-16 -translate-x-full lg:translate-x-0'}
        `}
        style={{ background: '#1A1A1A', borderRight: '1px solid #2C2C2C', overflow: 'hidden' }}>

        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-4 flex-shrink-0"
             style={{ borderBottom: '1px solid #2C2C2C', minHeight: '64px' }}>
          <div className={`flex items-center gap-3 ${!open && 'lg:justify-center lg:w-full'}`}>
            <img
              src="/images/logo-dark-1.png"
              alt="RSwitch"
              className="flex-shrink-0 object-contain"
              style={{ height: '32px', width: open ? 'auto' : '32px' }}
            />
            {open && (
              <div>
                <div className="text-white font-bold text-sm leading-tight">RSwitch</div>
                <div className="text-xs leading-tight" style={{ color: '#F5C842' }}>
                  money 24/7
                </div>
              </div>
            )}
          </div>
          {open && (
            <button
              onClick={onClose}
              className="lg:hidden text-gray-400 hover:text-white transition-colors p-1">
              <X size={18} />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
          {open && (
            <div className="px-4 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: '#3D3D3D' }}>
                Main Menu
              </span>
            </div>
          )}
          <ul className="space-y-1 px-2">
            {visibleNavItems.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-3 py-2.5 rounded-xl
                    transition-all duration-150 group relative
                    ${isActive
                      ? 'text-white'
                      : 'text-gray-400 hover:text-white'
                    }
                    ${!open ? 'justify-center' : ''}
                  `}
                  style={({ isActive }) => ({
                    background: isActive ? '#C0272D' : 'transparent',
                  })}
                  onMouseEnter={e => {
                    if (!e.currentTarget.classList.contains('text-white') ||
                        e.currentTarget.style.background !== '#C0272D') {
                      e.currentTarget.style.background = 'rgba(192,39,45,0.12)'
                    }
                  }}
                  onMouseLeave={e => {
                    if (e.currentTarget.style.background !== 'rgb(192, 39, 45)') {
                      e.currentTarget.style.background = 'transparent'
                    }
                  }}>
                  <Icon size={18} className="flex-shrink-0" />
                  {open && (
                    <>
                      <span className="text-sm font-medium flex-1">{label}</span>
                      <ChevronRight size={14} className="opacity-0 group-hover:opacity-50 transition-opacity" />
                    </>
                  )}
                  {/* Tooltip when collapsed */}
                  {!open && (
                    <div className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg text-xs font-medium
                                    text-white opacity-0 group-hover:opacity-100 pointer-events-none
                                    transition-opacity whitespace-nowrap z-50"
                         style={{ background: '#C0272D' }}>
                      {label}
                    </div>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* User / Logout */}
        <div className="flex-shrink-0 p-3" style={{ borderTop: '1px solid #2C2C2C' }}>
          {open ? (
            <div className="flex items-center gap-3 px-2 py-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
                   style={{ background: '#C0272D' }}>
                {user?.first_name?.[0] || user?.username?.[0] || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">
                  {user?.first_name
                    ? `${user.first_name} ${user.last_name}`
                    : user?.username}
                </div>
                <div className="text-xs capitalize truncate" style={{ color: '#F5C842' }}>
                  {user?.role}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="text-gray-500 hover:text-red-400 transition-colors flex-shrink-0"
                title="Logout">
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full flex justify-center py-2 text-gray-500 hover:text-red-400 transition-colors"
              title="Logout">
              <LogOut size={18} />
            </button>
          )}
        </div>
      </aside>
    </>
  )
}