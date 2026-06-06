import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Server, Plus, Search, Edit2, Trash2, Activity,
  Cpu, HardDrive, Wifi, RefreshCw, X, AlertCircle,
  CheckCircle, ChevronDown, Monitor, Cloud, Box,
  Thermometer, Clock, Eye
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts'
import { monitoringAPI } from '../../api/endpoints'

const COLOR = {
  red      : '#C0272D',
  redDark  : '#9B1C21',
  redLight : 'rgba(192,39,45,0.1)',
  gold     : '#F5C842',
  black    : '#1A1A1A',
  gray     : '#3D3D3D',
  muted    : '#9B9B9B',
  white    : '#FFFFFF',
  bg       : '#F0F0F0',
  green    : '#059669',
  blue     : '#2563EB',
  orange   : '#D97706',
}

const STATUS_MAP = {
  online      : { color: COLOR.green,  bg: 'rgba(5,150,105,0.1)',   label: 'Online'      },
  offline     : { color: COLOR.red,    bg: 'rgba(192,39,45,0.1)',   label: 'Offline'     },
  warning     : { color: COLOR.orange, bg: 'rgba(217,119,6,0.1)',   label: 'Warning'     },
  critical    : { color: COLOR.red,    bg: 'rgba(192,39,45,0.15)',  label: 'Critical'    },
  maintenance : { color: COLOR.blue,   bg: 'rgba(37,99,235,0.1)',   label: 'Maintenance' },
}

const TYPE_ICONS = {
  physical  : Monitor,
  virtual   : Box,
  container : Box,
  cloud     : Cloud,
}

const SERVER_TYPES = ['physical', 'virtual', 'container', 'cloud']
const SERVER_STATUSES = ['online', 'offline', 'warning', 'critical', 'maintenance']

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || STATUS_MAP.offline
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium capitalize"
          style={{ background: s.bg, color: s.color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
      {s.label}
    </span>
  )
}

function MetricBar({ value, color }) {
  const pct   = Math.min(100, Math.max(0, value || 0))
  const track = pct > 85 ? COLOR.red : pct > 65 ? COLOR.orange : color
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: COLOR.bg }}>
        <div className="h-full rounded-full transition-all"
             style={{ width: `${pct}%`, background: track }} />
      </div>
      <span className="text-xs font-medium w-8 text-right" style={{ color: COLOR.gray }}>
        {pct}%
      </span>
    </div>
  )
}

function Modal({ title, onClose, wide, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
         style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className={`w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} rounded-2xl shadow-2xl my-4`}
           style={{ background: COLOR.white, border: '1px solid #F0F0F0' }}>
        <div className="flex items-center justify-between px-6 py-4"
             style={{ borderBottom: '1px solid #F0F0F0' }}>
          <h3 className="font-bold text-base" style={{ color: COLOR.black }}>{title}</h3>
          <button onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                  style={{ color: COLOR.gray }}>
            <X size={18} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

function Field({ label, name, value, onChange, type = 'text', placeholder, required, as }) {
  const cls = "w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all"
  const style = {
    background : COLOR.bg,
    border     : '1px solid #E5E5E5',
    color      : COLOR.black,
  }
  const focus = e => e.target.style.borderColor = COLOR.red
  const blur  = e => e.target.style.borderColor = '#E5E5E5'

  return (
    <div>
      <label className="block text-sm font-medium mb-1.5" style={{ color: COLOR.gray }}>
        {label} {required && <span style={{ color: COLOR.red }}>*</span>}
      </label>
      {as === 'select' ? (
        <select name={name} value={value} onChange={onChange}
                className={cls} style={{ ...style, cursor: 'pointer' }}
                onFocus={focus} onBlur={blur}>
          {placeholder && <option value="">{placeholder}</option>}
          {(type === 'status' ? SERVER_STATUSES : SERVER_TYPES).map(o => (
            <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>
          ))}
        </select>
      ) : (
        <input type={type} name={name} value={value} onChange={onChange}
               placeholder={placeholder} required={required}
               className={cls} style={style}
               onFocus={focus} onBlur={blur} />
      )}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl px-3 py-2 shadow-lg text-xs"
         style={{ background: COLOR.black, color: COLOR.white }}>
      <p className="font-medium mb-1" style={{ color: COLOR.gold }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {p.value}%</p>
      ))}
    </div>
  )
}

const emptyForm = {
  name: '', hostname: '', ip_address: '', server_type: 'physical',
  status: 'online', location: '', os: '', cpu_cores: 1,
  ram_gb: 1, disk_gb: 50, description: '',
}

export default function MonitoringPage() {
  const queryClient = useQueryClient()

  const [search,      setSearch]      = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter,  setTypeFilter]  = useState('')
  const [showModal,   setShowModal]   = useState(false)
  const [editServer,  setEditServer]  = useState(null)
  const [viewServer,  setViewServer]  = useState(null)
  const [deleteServer, setDeleteServer] = useState(null)
  const [form,        setForm]        = useState(emptyForm)
  const [formError,   setFormError]   = useState('')
  const [successMsg,  setSuccessMsg]  = useState('')

  const { data: summary } = useQuery({
    queryKey : ['monitoring-summary'],
    queryFn  : () => monitoringAPI.summary().then(r => r.data),
    refetchInterval: 15000,
  })

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey : ['servers', statusFilter, typeFilter],
    queryFn  : () => monitoringAPI.servers({
      status : statusFilter || undefined,
      type   : typeFilter   || undefined,
    }).then(r => r.data),
    refetchInterval: 15000,
  })

  const { data: metricsData } = useQuery({
    queryKey : ['server-metrics', viewServer?.id],
    queryFn  : () => monitoringAPI.metrics(viewServer.id, { hours: 6 }).then(r => r.data),
    enabled  : !!viewServer,
    refetchInterval: 10000,
  })

  const { data: statsData } = useQuery({
    queryKey : ['server-stats', viewServer?.id],
    queryFn  : () => monitoringAPI.stats(viewServer.id, { hours: 24 }).then(r => r.data),
    enabled  : !!viewServer,
  })

  const servers = data?.results || data || []

  const createMutation = useMutation({
    mutationFn : (d) => monitoringAPI.createServer(d),
    onSuccess  : () => {
      queryClient.invalidateQueries(['servers'])
      queryClient.invalidateQueries(['monitoring-summary'])
      closeModal()
      flash('Server added successfully.')
    },
    onError: (err) => {
      const d = err.response?.data
      setFormError(d ? Object.values(d).flat().join(' ') : 'Failed to create server.')
    },
  })

  const updateMutation = useMutation({
    mutationFn : ({ id, data }) => monitoringAPI.updateServer(id, data),
    onSuccess  : () => {
      queryClient.invalidateQueries(['servers'])
      closeModal()
      flash('Server updated successfully.')
    },
    onError: (err) => {
      const d = err.response?.data
      setFormError(d ? Object.values(d).flat().join(' ') : 'Failed to update server.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn : (id) => monitoringAPI.deleteServer(id),
    onSuccess  : () => {
      queryClient.invalidateQueries(['servers'])
      queryClient.invalidateQueries(['monitoring-summary'])
      setDeleteServer(null)
      flash('Server removed successfully.')
    },
  })

  const flash = (msg) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(''), 3000)
  }

  const openCreate = () => {
    setForm(emptyForm)
    setFormError('')
    setEditServer(null)
    setShowModal(true)
  }

  const openEdit = (s) => {
    setForm({
      name        : s.name,
      hostname    : s.hostname,
      ip_address  : s.ip_address,
      server_type : s.server_type,
      status      : s.status,
      location    : s.location    || '',
      os          : s.os          || '',
      cpu_cores   : s.cpu_cores,
      ram_gb      : s.ram_gb,
      disk_gb     : s.disk_gb,
      description : s.description || '',
    })
    setFormError('')
    setEditServer(s)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditServer(null)
    setForm(emptyForm)
    setFormError('')
  }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setFormError('')
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (editServer) {
      updateMutation.mutate({ id: editServer.id, data: form })
    } else {
      createMutation.mutate(form)
    }
  }

  const filtered = servers.filter(s => {
    const q = search.toLowerCase()
    return !search ||
      s.name.toLowerCase().includes(q) ||
      s.hostname.toLowerCase().includes(q) ||
      s.ip_address.toLowerCase().includes(q) ||
      (s.location || '').toLowerCase().includes(q)
  })

  const summaryCards = [
    { label: 'Total',       value: summary?.total_servers,   color: COLOR.blue   },
    { label: 'Online',      value: summary?.online,          color: COLOR.green  },
    { label: 'Warning',     value: summary?.warning,         color: COLOR.orange },
    { label: 'Critical',    value: summary?.critical,        color: COLOR.red    },
    { label: 'Offline',     value: summary?.offline,         color: COLOR.muted  },
    { label: 'Maintenance', value: summary?.maintenance,     color: COLOR.blue   },
  ]

  const metrics = metricsData?.results || metricsData || []
  const chartData = [...metrics].reverse().slice(0, 30).map(m => ({
    time   : new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    cpu    : Math.round(m.cpu_usage),
    memory : Math.round(m.memory_usage),
    disk   : Math.round(m.disk_usage),
    net_in : Math.round(m.network_in),
  }))

  return (
    <div className="space-y-6">

      {/* Toast */}
      {successMsg && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white"
             style={{ background: COLOR.green }}>
          <CheckCircle size={16} /> {successMsg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold" style={{ color: COLOR.black }}>Server Monitoring</h2>
          <p className="text-sm mt-0.5" style={{ color: COLOR.muted }}>
            Real-time status across all infrastructure
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()}
                  className="p-2.5 rounded-xl hover:bg-gray-200 transition-colors"
                  style={{ background: COLOR.bg, color: COLOR.gray }}>
            <RefreshCw size={16} />
          </button>
          <button onClick={openCreate}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
                  style={{ background: COLOR.red }}
                  onMouseEnter={e => e.currentTarget.style.background = COLOR.redDark}
                  onMouseLeave={e => e.currentTarget.style.background = COLOR.red}>
            <Plus size={16} /> Add server
          </button>
        </div>
      </div>

      {/* Summary pills */}
      <div className="flex flex-wrap gap-3">
        {summaryCards.map(({ label, value, color }) => (
          <div key={label}
               className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm"
               style={{ background: COLOR.white, border: '1px solid #F0F0F0' }}>
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
            <span style={{ color: COLOR.gray }}>{label}</span>
            <span className="font-bold" style={{ color: COLOR.black }}>{value ?? '—'}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: COLOR.muted }} />
          <input
            type="text" placeholder="Search servers..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: COLOR.white, border: '1px solid #E5E5E5', color: COLOR.black }}
            onFocus={e => e.target.style.borderColor = COLOR.red}
            onBlur={e  => e.target.style.borderColor = '#E5E5E5'} />
        </div>
        {[
          { value: statusFilter, set: setStatusFilter, placeholder: 'All statuses', options: SERVER_STATUSES },
          { value: typeFilter,   set: setTypeFilter,   placeholder: 'All types',    options: SERVER_TYPES   },
        ].map(({ value, set, placeholder, options }, i) => (
          <div key={i} className="relative">
            <select value={value} onChange={e => set(e.target.value)}
                    className="pl-3 pr-8 py-2.5 rounded-xl text-sm outline-none cursor-pointer appearance-none"
                    style={{ background: COLOR.white, border: '1px solid #E5E5E5', color: COLOR.black, minWidth: '140px' }}>
              <option value="">{placeholder}</option>
              {options.map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                         style={{ color: COLOR.muted }} />
          </div>
        ))}
      </div>

      {/* Server grid */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-2xl p-5 animate-pulse"
                 style={{ background: COLOR.white, border: '1px solid #F0F0F0', height: 180 }} />
          ))}
        </div>
      )}

      {isError && (
        <div className="flex items-center justify-center gap-2 py-16 text-sm"
             style={{ color: COLOR.red }}>
          <AlertCircle size={16} /> Failed to load servers.
        </div>
      )}

      {!isLoading && !isError && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3"
             style={{ color: COLOR.muted }}>
          <Server size={48} strokeWidth={1} />
          <p className="text-sm">No servers found</p>
          <button onClick={openCreate}
                  className="text-sm font-medium px-4 py-2 rounded-xl text-white mt-1"
                  style={{ background: COLOR.red }}>
            Add your first server
          </button>
        </div>
      )}

      {!isLoading && !isError && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(server => {
            const TypeIcon  = TYPE_ICONS[server.server_type] || Monitor
            const metric    = server.latest_metric
            return (
              <div key={server.id}
                   className="rounded-2xl p-5 space-y-4 transition-shadow hover:shadow-md"
                   style={{ background: COLOR.white, border: '1px solid #F0F0F0' }}>

                {/* Card header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                         style={{ background: COLOR.redLight }}>
                      <TypeIcon size={18} style={{ color: COLOR.red }} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm truncate" style={{ color: COLOR.black }}>
                        {server.name}
                      </p>
                      <p className="text-xs truncate" style={{ color: COLOR.muted }}>
                        {server.ip_address}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={server.status} />
                </div>

                {/* Info row */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {[
                    { icon: Cpu,       label: `${server.cpu_cores} cores`    },
                    { icon: HardDrive, label: `${server.ram_gb}GB RAM`       },
                    { icon: HardDrive, label: `${server.disk_gb}GB disk`     },
                  ].map(({ icon: Icon, label }) => (
                    <div key={label} className="flex items-center gap-1" style={{ color: COLOR.muted }}>
                      <Icon size={11} />
                      <span>{label}</span>
                    </div>
                  ))}
                </div>

                {/* Metrics */}
                {metric ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span style={{ color: COLOR.muted }}>Live metrics</span>
                      <span className="flex items-center gap-1" style={{ color: COLOR.muted }}>
                        <Clock size={10} />
                        {new Date(metric.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    {[
                      { label: 'CPU',    value: metric.cpu_usage,    color: COLOR.red  },
                      { label: 'Memory', value: metric.memory_usage, color: COLOR.blue },
                      { label: 'Disk',   value: metric.disk_usage,   color: COLOR.orange },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="flex items-center gap-2">
                        <span className="text-xs w-12 flex-shrink-0" style={{ color: COLOR.muted }}>{label}</span>
                        <MetricBar value={value} color={color} />
                      </div>
                    ))}
                    {metric.cpu_temp && (
                      <div className="flex items-center gap-1 text-xs mt-1" style={{ color: COLOR.muted }}>
                        <Thermometer size={11} />
                        <span>Temp: {metric.cpu_temp}°C</span>
                        <Wifi size={11} className="ml-2" />
                        <span>↑{metric.network_out} ↓{metric.network_in} MB/s</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs py-2 text-center rounded-lg"
                       style={{ background: COLOR.bg, color: COLOR.muted }}>
                    No metrics yet
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1"
                     style={{ borderTop: '1px solid #F0F0F0' }}>
                  <button onClick={() => setViewServer(server)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-blue-50"
                          style={{ color: COLOR.blue }}>
                    <Activity size={13} /> Metrics
                  </button>
                  <button onClick={() => openEdit(server)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-gray-50"
                          style={{ color: COLOR.gray }}>
                    <Edit2 size={13} /> Edit
                  </button>
                  <button onClick={() => setDeleteServer(server)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-red-50"
                          style={{ color: COLOR.red }}>
                    <Trash2 size={13} /> Remove
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Server Metrics Modal */}
      {viewServer && (
        <Modal title={`${viewServer.name} — Live Metrics`} onClose={() => setViewServer(null)} wide>
          <div className="space-y-6">

            {/* Stats row */}
            {statsData && (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Avg CPU',    value: `${Math.round(statsData.avg_cpu    || 0)}%`  },
                  { label: 'Avg Memory', value: `${Math.round(statsData.avg_memory || 0)}%`  },
                  { label: 'Max CPU',    value: `${Math.round(statsData.max_cpu    || 0)}%`  },
                ].map(({ label, value }) => (
                  <div key={label} className="text-center p-3 rounded-xl"
                       style={{ background: COLOR.bg }}>
                    <div className="text-xl font-bold" style={{ color: COLOR.black }}>{value}</div>
                    <div className="text-xs mt-0.5" style={{ color: COLOR.muted }}>{label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* CPU + Memory chart */}
            <div>
              <p className="text-sm font-semibold mb-3" style={{ color: COLOR.black }}>
                CPU & Memory (last 6h)
              </p>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gcpu" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={COLOR.red}  stopOpacity={0.3} />
                        <stop offset="95%" stopColor={COLOR.red}  stopOpacity={0}   />
                      </linearGradient>
                      <linearGradient id="gmem" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={COLOR.blue} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={COLOR.blue} stopOpacity={0}   />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: COLOR.muted }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: COLOR.muted }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="cpu"    name="CPU %"    stroke={COLOR.red}  fill="url(#gcpu)" strokeWidth={2} dot={false} />
                    <Area type="monotone" dataKey="memory" name="Memory %" stroke={COLOR.blue} fill="url(#gmem)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-32 rounded-xl text-sm"
                     style={{ background: COLOR.bg, color: COLOR.muted }}>
                  No metric data available yet
                </div>
              )}
            </div>

            {/* Disk + Network chart */}
            {chartData.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-3" style={{ color: COLOR.black }}>
                  Disk & Network In (last 6h)
                </p>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: COLOR.muted }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: COLOR.muted }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="disk"   name="Disk %"       stroke={COLOR.orange} strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="net_in" name="Net in MB/s"   stroke={COLOR.gold}   strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Server info */}
            <div className="grid grid-cols-2 gap-3 text-sm pt-2"
                 style={{ borderTop: '1px solid #F0F0F0' }}>
              {[
                { label: 'Hostname',    value: viewServer.hostname             },
                { label: 'OS',         value: viewServer.os        || '—'     },
                { label: 'Location',   value: viewServer.location  || '—'     },
                { label: 'Type',       value: viewServer.server_type           },
                { label: 'CPU cores',  value: viewServer.cpu_cores             },
                { label: 'RAM',        value: `${viewServer.ram_gb} GB`       },
              ].map(({ label, value }) => (
                <div key={label}>
                  <span style={{ color: COLOR.muted }}>{label}: </span>
                  <span className="font-medium capitalize" style={{ color: COLOR.black }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <Modal title={editServer ? 'Edit server' : 'Add new server'} onClose={closeModal} wide>
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="flex items-start gap-2 p-3 rounded-xl text-sm"
                   style={{ background: 'rgba(192,39,45,0.08)', color: COLOR.red, border: '1px solid rgba(192,39,45,0.2)' }}>
                <AlertCircle size={15} className="flex-shrink-0 mt-0.5" /> {formError}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Server name"  name="name"       value={form.name}       onChange={handleChange} placeholder="web-server-01" required />
              <Field label="Hostname"     name="hostname"   value={form.hostname}   onChange={handleChange} placeholder="web-server-01.local" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="IP address"   name="ip_address"  value={form.ip_address}  onChange={handleChange} placeholder="192.168.1.100" required />
              <Field label="Location"     name="location"    value={form.location}    onChange={handleChange} placeholder="Rack A, DC1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Server type"  name="server_type" value={form.server_type} onChange={handleChange} as="select" />
              <Field label="Status"       name="status"      value={form.status}      onChange={handleChange} as="select" type="status" />
            </div>
            <Field label="Operating system" name="os" value={form.os} onChange={handleChange} placeholder="Ubuntu 22.04 LTS" />
            <div className="grid grid-cols-3 gap-4">
              <Field label="CPU cores" name="cpu_cores" type="number" value={form.cpu_cores} onChange={handleChange} placeholder="4" required />
              <Field label="RAM (GB)"  name="ram_gb"    type="number" value={form.ram_gb}    onChange={handleChange} placeholder="16"  required />
              <Field label="Disk (GB)" name="disk_gb"   type="number" value={form.disk_gb}   onChange={handleChange} placeholder="500" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: COLOR.gray }}>Description</label>
              <textarea name="description" value={form.description} onChange={handleChange}
                        placeholder="Optional notes..."
                        rows={3}
                        className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all resize-none"
                        style={{ background: COLOR.bg, border: '1px solid #E5E5E5', color: COLOR.black }}
                        onFocus={e => e.target.style.borderColor = COLOR.red}
                        onBlur={e  => e.target.style.borderColor = '#E5E5E5'} />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={closeModal}
                      className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                      style={{ background: COLOR.bg, color: COLOR.gray }}>
                Cancel
              </button>
              <button type="submit"
                      disabled={createMutation.isPending || updateMutation.isPending}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                      style={{ background: COLOR.red, opacity: (createMutation.isPending || updateMutation.isPending) ? 0.7 : 1 }}
                      onMouseEnter={e => e.currentTarget.style.background = COLOR.redDark}
                      onMouseLeave={e => e.currentTarget.style.background = COLOR.red}>
                {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editServer ? 'Save changes' : 'Add server'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Modal */}
      {deleteServer && (
        <Modal title="Remove server" onClose={() => setDeleteServer(null)}>
          <div className="text-center space-y-4">
            <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center"
                 style={{ background: COLOR.redLight }}>
              <Trash2 size={24} style={{ color: COLOR.red }} />
            </div>
            <div>
              <p className="font-semibold" style={{ color: COLOR.black }}>Remove {deleteServer.name}?</p>
              <p className="text-sm mt-1" style={{ color: COLOR.muted }}>
                All metrics and alerts for this server will be permanently deleted.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setDeleteServer(null)}
                      className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                      style={{ background: COLOR.bg, color: COLOR.gray }}>
                Cancel
              </button>
              <button onClick={() => deleteMutation.mutate(deleteServer.id)}
                      disabled={deleteMutation.isPending}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                      style={{ background: COLOR.red, opacity: deleteMutation.isPending ? 0.7 : 1 }}>
                {deleteMutation.isPending ? 'Removing...' : 'Yes, remove'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}