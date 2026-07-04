import { useState, useEffect, useCallback } from 'react'
import {
  Search, RefreshCw, ChevronLeft, ChevronRight,
  PlusCircle, Pencil, Trash2, LogIn, LogOut, ShieldAlert
} from 'lucide-react'
import { auditAPI } from '../../api/endpoints'

const actionConfig = {
  create       : { bg: 'bg-green-100 text-green-800',  icon: PlusCircle, label: 'Create'        },
  update       : { bg: 'bg-blue-100 text-blue-800',    icon: Pencil,     label: 'Update'         },
  delete       : { bg: 'bg-red-100 text-red-800',      icon: Trash2,     label: 'Delete'         },
  login        : { bg: 'bg-purple-100 text-purple-800',icon: LogIn,      label: 'Login'          },
  login_failed : { bg: 'bg-yellow-100 text-yellow-800',icon: ShieldAlert,label: 'Login Failed'   },
  logout       : { bg: 'bg-gray-100 text-gray-600',    icon: LogOut,     label: 'Logout'         },
}

const fmtDate = (d) => d ? new Date(d).toLocaleString('en-GB', {
  day: '2-digit', month: 'short', year: 'numeric',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
}) : '—'

const ActionBadge = ({ action }) => {
  const c = actionConfig[action] || actionConfig.update
  const Icon = c.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${c.bg}`}>
      <Icon size={12} /> {c.label}
    </span>
  )
}

const StatsCard = ({ title, value, color }) => {
  const colorClasses = {
    gray: 'bg-gray-100 text-gray-600', green: 'bg-green-100 text-green-600',
    blue: 'bg-blue-100 text-blue-600', red: 'bg-red-100 text-red-600',
    purple: 'bg-purple-100 text-purple-600', orange: 'bg-yellow-100 text-yellow-600',
  }
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className={`inline-flex px-2 py-1 rounded-lg text-xs font-bold mb-2 ${colorClasses[color] || colorClasses.gray}`}>
        {title}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
    </div>
  )
}

const PAGE_SIZE = 20

export default function AuditLogsTab() {
  const [logs, setLogs]         = useState([])
  const [summary, setSummary]   = useState({})
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [action, setAction]     = useState('ALL')
  const [modelName, setModelName] = useState('ALL')
  const [page, setPage]         = useState(1)
  const [count, setCount]       = useState(0)
  const [errorMsg, setErrorMsg] = useState('')

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE))

  const load = useCallback(async (p = page) => {
    setLoading(true)
    setErrorMsg('')
    try {
      const params = { page: p }
      if (search)                params.search = search
      if (action !== 'ALL')      params.action = action
      if (modelName !== 'ALL')   params.model  = modelName

      const [logsRes, summaryRes] = await Promise.all([
        auditAPI.list(params),
        auditAPI.summary(),
      ])
      setLogs(logsRes.data?.results || logsRes.data || [])
      setCount(logsRes.data?.count ?? (logsRes.data?.length || 0))
      setSummary(summaryRes.data || {})
    } catch (err) {
      if (err.response?.status === 403) {
        setErrorMsg('You do not have permission to view audit logs.')
      } else {
        setErrorMsg('Failed to load audit logs.')
      }
      setLogs([])
    } finally {
      setLoading(false)
    }
  }, [search, action, modelName, page])

  useEffect(() => { setPage(1) }, [search, action, modelName])
  useEffect(() => { load(1) }, [search, action, modelName])
  useEffect(() => { load(page) }, [page])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatsCard title="Total events"   value={summary.total}         color="gray"   />
        <StatsCard title="Creates"        value={summary.creates}       color="green"  />
        <StatsCard title="Updates"        value={summary.updates}       color="blue"   />
        <StatsCard title="Deletes"        value={summary.deletes}       color="red"    />
        <StatsCard title="Logins"         value={summary.logins}        color="purple" />
        <StatsCard title="Failed logins"  value={summary.failed_logins} color="orange" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                   placeholder="Search by affected object..."
                   className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm" />
          </div>
          <select value={action} onChange={e => setAction(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm">
            <option value="ALL">All actions</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
            <option value="login">Login</option>
            <option value="login_failed">Login Failed</option>
            <option value="logout">Logout</option>
          </select>
          <select value={modelName} onChange={e => setModelName(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm">
            <option value="ALL">All models</option>
            {(summary.models || []).map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <button onClick={() => load(page)} disabled={loading} title="Refresh"
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <span className="text-sm text-gray-500 whitespace-nowrap">{count} event{count !== 1 ? 's' : ''}</span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Action', 'Model', 'Object', 'User', 'IP Address', 'Timestamp'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                  <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
                    <p className="text-sm">Loading audit logs...</p>
                  </div>
                </td></tr>
              ) : errorMsg ? (
                <tr><td colSpan="6" className="px-6 py-12 text-center text-red-500 text-sm">{errorMsg}</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                  <p className="text-lg font-medium text-gray-700">No audit events found</p>
                </td></tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap"><ActionBadge action={log.action} /></td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-700 font-mono">{log.model_name || '—'}</span>
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate">
                      <span className="text-sm text-gray-900">{log.object_repr || '—'}</span>
                      {log.object_id && <span className="text-xs text-gray-400 ml-1">#{log.object_id}</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-700">{log.username || 'system'}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-500 font-mono">{log.ip_address || '—'}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-500">{fmtDate(log.created_at)}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {count > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-gray-500">
                Page <span className="font-medium">{page}</span> of <span className="font-medium">{totalPages}</span>
              </p>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  <ChevronLeft size={18} />
                </button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
