import { useEffect, useRef, useState } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import { notificationsAPI } from '../../api/endpoints'

const severityColor = {
  critical: '#C0272D',
  warning : '#F5C842',
  info    : '#3D8BFF',
}

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const mins   = Math.floor(diffMs / 60000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function NotificationBell() {
  const [open, setOpen]           = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount]     = useState(0)
  const [loading, setLoading]     = useState(false)
  const ref = useRef(null)

  const fetchUnreadCount = async () => {
    try {
      const { data } = await notificationsAPI.unreadCount()
      setUnreadCount(data.unread)
    } catch {}
  }

  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const { data } = await notificationsAPI.list()
      setNotifications(Array.isArray(data) ? data : data.results || [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (open) fetchNotifications()
  }, [open])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleMarkRead = async (id) => {
    try {
      await notificationsAPI.markRead(id)
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
      setUnreadCount((c) => Math.max(0, c - 1))
    } catch {}
  }

  const handleMarkAllRead = async () => {
    try {
      await notificationsAPI.markAllRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch {}
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-xl transition-colors hover:bg-gray-100"
        style={{ color: '#3D3D3D' }}>
        <Bell size={18} />
        {unreadCount > 0 && (
          <span
            className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
            style={{ background: '#C0272D' }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-80 rounded-xl shadow-lg z-50 overflow-hidden"
          style={{ background: '#FFFFFF', border: '1px solid #E5E5E5' }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #E5E5E5' }}>
            <span className="font-semibold text-sm" style={{ color: '#1A1A1A' }}>Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-xs font-medium hover:underline"
                style={{ color: '#C0272D' }}>
                <CheckCheck size={13} />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading && (
              <div className="px-4 py-6 text-center text-sm" style={{ color: '#9B9B9B' }}>Loading...</div>
            )}
            {!loading && notifications.length === 0 && (
              <div className="px-4 py-6 text-center text-sm" style={{ color: '#9B9B9B' }}>No notifications</div>
            )}
            {!loading && notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => !n.is_read && handleMarkRead(n.id)}
                className="w-full text-left px-4 py-3 flex gap-3 transition-colors hover:bg-gray-50"
                style={{
                  borderBottom: '1px solid #F0F0F0',
                  background: n.is_read ? 'transparent' : 'rgba(192,39,45,0.04)',
                }}>
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                  style={{ background: severityColor[n.alert_severity] || '#9B9B9B' }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: '#1A1A1A' }}>
                    {n.server_name || 'System'}
                  </div>
                  <div className="text-xs truncate" style={{ color: '#6B6B6B' }}>
                    {n.alert_message}
                  </div>
                  <div className="text-[11px] mt-0.5" style={{ color: '#9B9B9B' }}>
                    {timeAgo(n.created_at)}
                  </div>
                </div>
                {!n.is_read && (
                  <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: '#C0272D' }} />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
