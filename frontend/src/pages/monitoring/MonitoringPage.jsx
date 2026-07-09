import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Server, Plus, Search, Edit2, Trash2, Activity,
  Cpu, HardDrive, Wifi, RefreshCw, X, AlertCircle,
  CheckCircle, ChevronDown, Monitor, Cloud, Box,
  Thermometer, Clock, Eye, Signal, Zap, Database,
  ArrowUp, ArrowDown, MoreVertical, Radio
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts'
import { monitoringAPI } from '../../api/endpoints'

// ── Design tokens ──────────────────────────────────────────────
const C = {
  red       : '#C0272D',
  redDark   : '#9B1C21',
  redGlow   : 'rgba(192,39,45,0.15)',
  black     : '#FFFFFF',
  surface   : '#F8F8F8',
  card      : '#FFFFFF',
  cardHover : '#F5F5F5',
  cardAlt   : '#F0F0F0',
  border    : '#E5E5E5',
  borderHi  : '#D0D0D0',
  offwhite  : '#1A1A1A',
  muted     : '#9B9B9B',
  dim       : '#CCCCCC',
  green     : '#10B981',
  greenDim  : 'rgba(16,185,129,0.12)',
  blue      : '#3B82F6',
  blueDim   : 'rgba(59,130,246,0.12)',
  amber     : '#F59E0B',
  amberDim  : 'rgba(245,158,11,0.12)',
  violet    : '#8B5CF6',
  violetDim : 'rgba(139,92,246,0.12)',
}

const STATUS = {
  online      : { color: C.green,  bg: C.greenDim,  dot: '#10B981', label: 'Online',      pulse: true  },
  offline     : { color: C.muted,  bg: 'rgba(107,107,120,0.12)', dot: '#6B6B78', label: 'Offline', pulse: false },
  warning     : { color: C.amber,  bg: C.amberDim,  dot: '#F59E0B', label: 'Warning',     pulse: true  },
  critical    : { color: C.red,    bg: C.redGlow,   dot: '#C0272D', label: 'Critical',    pulse: true  },
  maintenance : { color: C.blue,   bg: C.blueDim,   dot: '#3B82F6', label: 'Maintenance', pulse: false },
}

const TYPE_ICONS = { physical: Monitor, virtual: Box, container: Database, cloud: Cloud }
const SERVER_TYPES    = ['physical', 'virtual', 'container', 'cloud']
const SERVER_STATUSES = ['online', 'offline', 'warning', 'critical', 'maintenance']

// ── Helpers ────────────────────────────────────────────────────
const pct = (v) => Math.min(100, Math.max(0, v || 0))
const metricColor = (v) => v > 85 ? C.red : v > 65 ? C.amber : C.green

// ── Sub-components ─────────────────────────────────────────────

function PulseDot({ status }) {
  const s = STATUS[status] || STATUS.offline
  return (
    <span style={{ position: 'relative', display: 'inline-flex', width: 10, height: 10 }}>
      {s.pulse && (
        <span style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          background: s.dot, opacity: 0.4,
          animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite',
        }} />
      )}
      <span style={{ width: 10, height: 10, borderRadius: '50%', background: s.dot, position: 'relative' }} />
    </span>
  )
}

function StatusBadge({ status, small }) {
  const s = STATUS[status] || STATUS.offline
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: small ? '2px 8px' : '4px 10px',
      borderRadius: 20, fontSize: small ? 10 : 11, fontWeight: 600,
      background: s.bg, color: s.color, letterSpacing: '0.02em',
    }}>
      <PulseDot status={status} />
      {s.label}
    </span>
  )
}

function MiniBar({ value, height = 4 }) {
  const v = pct(value)
  const col = metricColor(v)
  return (
    <div style={{ height, borderRadius: 99, background: C.border, overflow: 'hidden', flex: 1 }}>
      <div style={{
        height: '100%', width: `${v}%`, borderRadius: 99,
        background: col, transition: 'width 0.6s ease',
        boxShadow: 'none',
      }} />
    </div>
  )
}

function StatRing({ value, label, color }) {
  const v = pct(value)
  const r = 26, circ = 2 * Math.PI * r
  const stroke = circ - (v / 100) * circ
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width={64} height={64} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={32} cy={32} r={r} fill="none" stroke={C.border} strokeWidth={5} />
        <circle cx={32} cy={32} r={r} fill="none" stroke={color} strokeWidth={5}
                strokeDasharray={circ} strokeDashoffset={stroke}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.8s ease', filter: `drop-shadow(0 0 4px ${color})` }} />
      </svg>
      <div style={{ marginTop: -52, fontWeight: 800, fontSize: 13, color: C.offwhite, textAlign: 'center', lineHeight: 1 }}>
        {v}%
      </div>
      <div style={{ marginTop: 28, fontSize: 10, color: C.muted, textAlign: 'center' }}>{label}</div>
    </div>
  )
}

function Tooltip2({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 10, padding: '8px 12px', fontSize: 11,
    }}>
      <p style={{ color: C.muted, marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, fontWeight: 600 }}>{p.name}: {p.value}{p.name.includes('%') ? '' : ''}</p>
      ))}
    </div>
  )
}

function Modal({ title, subtitle, onClose, wide, children }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        width: '100%', maxWidth: wide ? 780 : 520,
        background: C.card, border: `1px solid ${C.border}`,
        borderRadius: 20, boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
        maxHeight: '90vh', overflow: 'auto',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: `1px solid ${C.border}`,
        }}>
          <div>
            <h3 style={{ fontWeight: 700, fontSize: 15, color: C.offwhite, margin: 0 }}>{title}</h3>
            {subtitle && <p style={{ fontSize: 12, color: C.muted, margin: '2px 0 0' }}>{subtitle}</p>}
          </div>
          <button onClick={onClose} style={{
            background: C.border, border: 'none', borderRadius: 8,
            width: 30, height: 30, display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: 'pointer', color: C.muted,
          }}>
            <X size={15} />
          </button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  )
}

function FormField({ label, name, value, onChange, type = 'text', placeholder, required, as }) {
  const base = {
    width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13,
    background: C.surface, border: `1px solid ${C.border}`,
    color: C.offwhite, outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  }
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, color: C.muted, marginBottom: 6, fontWeight: 500 }}>
        {label} {required && <span style={{ color: C.red }}>*</span>}
      </label>
      {as === 'select' ? (
        <select name={name} value={value} onChange={onChange} style={{ ...base, cursor: 'pointer' }}
                onFocus={e => e.target.style.borderColor = C.red}
                onBlur={e  => e.target.style.borderColor = C.border}>
          {(type === 'status' ? SERVER_STATUSES : SERVER_TYPES).map(o => (
            <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>
          ))}
        </select>
      ) : (
        <input type={type} name={name} value={value} onChange={onChange}
               placeholder={placeholder} required={required}
               style={base}
               onFocus={e => e.target.style.borderColor = C.red}
               onBlur={e  => e.target.style.borderColor = C.border} />
      )}
    </div>
  )
}

const emptyForm = {
  name: '', hostname: '', ip_address: '', server_type: 'physical',
  status: 'online', location: '', os: '', cpu_cores: 1, ram_gb: 1, disk_gb: 50, description: '',
}

// ── Main Page ──────────────────────────────────────────────────
export default function MonitoringPage() {
  const queryClient = useQueryClient()
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter,   setTypeFilter]   = useState('')
  const [showModal,    setShowModal]    = useState(false)
  const [editServer,   setEditServer]   = useState(null)
  const [viewServer,   setViewServer]   = useState(null)
  const [deleteServer, setDeleteServer] = useState(null)
  const [form,         setForm]         = useState(emptyForm)
  const [formError,    setFormError]    = useState('')
  const [toast,        setToast]        = useState(null)

  const flash = (msg, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const { data: summary } = useQuery({
    queryKey: ['monitoring-summary'],
    queryFn: () => monitoringAPI.summary().then(r => r.data),
    refetchInterval: 15000,
  })

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['servers', statusFilter, typeFilter],
    queryFn: () => monitoringAPI.servers({ status: statusFilter || undefined, type: typeFilter || undefined }).then(r => r.data),
    refetchInterval: 15000,
  })

  const { data: metricsData } = useQuery({
    queryKey: ['server-metrics', viewServer?.id],
    queryFn: () => monitoringAPI.metrics(viewServer.id, { hours: 6 }).then(r => r.data),
    enabled: !!viewServer,
    refetchInterval: 10000,
  })

  const { data: statsData } = useQuery({
    queryKey: ['server-stats', viewServer?.id],
    queryFn: () => monitoringAPI.stats(viewServer.id, { hours: 24 }).then(r => r.data),
    enabled: !!viewServer,
  })

  const servers = data?.results || data || []

  const createMutation = useMutation({
    mutationFn: d => monitoringAPI.createServer(d),
    onSuccess: () => { queryClient.invalidateQueries(['servers']); queryClient.invalidateQueries(['monitoring-summary']); closeModal(); flash('Server added.') },
    onError: err => { const d = err.response?.data; setFormError(d ? Object.values(d).flat().join(' ') : 'Failed.') },
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => monitoringAPI.updateServer(id, data),
    onSuccess: () => { queryClient.invalidateQueries(['servers']); closeModal(); flash('Server updated.') },
    onError: err => { const d = err.response?.data; setFormError(d ? Object.values(d).flat().join(' ') : 'Failed.') },
  })
  const deleteMutation = useMutation({
    mutationFn: id => monitoringAPI.deleteServer(id),
    onSuccess: () => { queryClient.invalidateQueries(['servers']); queryClient.invalidateQueries(['monitoring-summary']); setDeleteServer(null); flash('Server removed.') },
  })

  const openCreate = () => { setForm(emptyForm); setFormError(''); setEditServer(null); setShowModal(true) }
  const openEdit   = s => {
    setForm({ name: s.name, hostname: s.hostname, ip_address: s.ip_address, server_type: s.server_type, status: s.status, location: s.location||'', os: s.os||'', cpu_cores: s.cpu_cores, ram_gb: s.ram_gb, disk_gb: s.disk_gb, description: s.description||'' })
    setFormError(''); setEditServer(s); setShowModal(true)
  }
  const closeModal = () => { setShowModal(false); setEditServer(null); setForm(emptyForm); setFormError('') }
  const handleChange = e => { setForm({ ...form, [e.target.name]: e.target.value }); setFormError('') }
  const handleSubmit = e => {
    e.preventDefault()
    if (editServer) updateMutation.mutate({ id: editServer.id, data: form })
    else createMutation.mutate(form)
  }

  const filtered = servers.filter(s => {
    const q = search.toLowerCase()
    return !search || s.name.toLowerCase().includes(q) || s.hostname.toLowerCase().includes(q) || s.ip_address.toLowerCase().includes(q) || (s.location||'').toLowerCase().includes(q)
  })

  const metrics  = metricsData?.results || metricsData || []
  const chartData = [...metrics].reverse().slice(0, 40).map(m => ({
    time   : new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    cpu    : Math.round(m.cpu_usage),
    memory : Math.round(m.memory_usage),
    disk   : Math.round(m.disk_usage),
    net    : Math.round(m.network_in),
  }))

  const summaryStats = [
    { label: 'Total',       value: summary?.total_servers, color: C.blue,   icon: Server  },
    { label: 'Online',      value: summary?.online,        color: C.green,  icon: CheckCircle },
    { label: 'Warning',     value: summary?.warning,       color: C.amber,  icon: AlertCircle },
    { label: 'Critical',    value: summary?.critical,      color: C.red,    icon: Zap     },
    { label: 'Offline',     value: summary?.offline,       color: C.muted,  icon: Signal  },
  ]

  return (
    <div style={{ background: C.black, minHeight: '100vh', padding: '24px', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        @keyframes ping { 0% { transform: scale(1); opacity: 0.4; } 75%, 100% { transform: scale(2.2); opacity: 0; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #CCCCCC; border-radius: 99px; }
        * { box-sizing: border-box; }
        input::placeholder, textarea::placeholder { color: #3A3A42; }
        option { background: #FFFFFF; color: #1A1A1A; }
        select { color-scheme: light; }
      `}</style>

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 9999,
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 18px', borderRadius: 12, fontSize: 13, fontWeight: 600,
          background: toast.ok ? C.green : C.red, color: '#fff',
          boxShadow: 'none',
          animation: 'fadeIn 0.2s ease',
        }}>
          {toast.ok ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          {toast.msg}
        </div>
      )}

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: C.redGlow, border: `1px solid ${C.red}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Radio size={18} color={C.red} />
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: C.offwhite, margin: 0, letterSpacing: '-0.02em' }}>
              Infrastructure Monitor
            </h1>
          </div>
          <p style={{ fontSize: 13, color: C.muted, margin: 0, paddingLeft: 46 }}>
            Live telemetry across all nodes · auto-refresh 15s
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => refetch()} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px',
            borderRadius: 10, background: C.card, border: `1px solid ${C.border}`,
            color: C.muted, cursor: 'pointer', fontSize: 13,
          }}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={openCreate} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px',
            borderRadius: 10, background: C.red, border: 'none',
            color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            boxShadow: `0 4px 16px ${C.red}40`,
          }}>
            <Plus size={14} /> Add server
          </button>
        </div>
      </div>

      {/* ── Summary strip ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 }}>
        {summaryStats.map(({ label, value, color, icon: Icon }) => (
          <div key={label} style={{
            background: C.card, border: `1px solid ${C.border}`,
            borderRadius: 14, padding: '16px 18px',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={16} color={color} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.offwhite, lineHeight: 1 }}>{value ?? '—'}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.muted }} />
          <input type="text" placeholder="Search by name, IP, hostname…" value={search}
                 onChange={e => setSearch(e.target.value)}
                 style={{ width: '100%', paddingLeft: 36, paddingRight: 12, paddingTop: 10, paddingBottom: 10, borderRadius: 10, background: C.card, border: `1px solid ${C.border}`, color: C.offwhite, fontSize: 13, outline: 'none' }}
                 onFocus={e => e.target.style.borderColor = C.red}
                 onBlur={e  => e.target.style.borderColor = C.border} />
        </div>
        {[
          { value: statusFilter, set: setStatusFilter, placeholder: 'All statuses', options: SERVER_STATUSES },
          { value: typeFilter,   set: setTypeFilter,   placeholder: 'All types',    options: SERVER_TYPES   },
        ].map(({ value, set, placeholder, options }, i) => (
          <div key={i} style={{ position: 'relative' }}>
            <select value={value} onChange={e => set(e.target.value)} style={{
              padding: '10px 32px 10px 12px', borderRadius: 10,
              background: C.card, border: `1px solid ${C.border}`,
              color: value ? C.offwhite : C.muted, fontSize: 13, cursor: 'pointer', outline: 'none', minWidth: 140,
            }}>
              <option value="">{placeholder}</option>
              {options.map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
            </select>
            <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: C.muted, pointerEvents: 'none' }} />
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 14px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 12, color: C.muted, whiteSpace: 'nowrap' }}>
          {filtered.length} server{filtered.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* ── Server grid ── */}
      {isLoading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{ height: 220, borderRadius: 16, background: C.card, border: `1px solid ${C.border}`, opacity: 0.5 }} />
          ))}
        </div>
      )}

      {isError && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 64, color: C.red, fontSize: 14 }}>
          <AlertCircle size={18} /> Failed to load servers
        </div>
      )}

      {!isLoading && !isError && filtered.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 80, color: C.muted }}>
          <Server size={48} strokeWidth={1} />
          <p style={{ fontSize: 14, margin: 0 }}>No servers found</p>
          <button onClick={openCreate} style={{ padding: '9px 18px', borderRadius: 10, background: C.red, border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Add first server
          </button>
        </div>
      )}

      {!isLoading && !isError && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {filtered.map(server => {
            const TypeIcon = TYPE_ICONS[server.server_type] || Monitor
            const m = server.latest_metric
            const st = STATUS[server.status] || STATUS.offline
            return (
              <div key={server.id} style={{
                background: C.card, border: `1px solid ${C.border}`,
                borderRadius: 18, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14,
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.borderHi; e.currentTarget.style.boxShadow = `0 8px 32px rgba(0,0,0,0.4)` }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = 'none' }}>

                {/* Card top */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: C.redGlow, border: `1px solid ${C.red}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <TypeIcon size={18} color={C.red} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: C.offwhite, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{server.name}</div>
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 2, fontFamily: 'monospace' }}>{server.ip_address}</div>
                    </div>
                  </div>
                  <StatusBadge status={server.status} small />
                </div>

                {/* Specs */}
                <div style={{ display: 'flex', gap: 6 }}>
                  {[
                    { icon: Cpu,      label: `${server.cpu_cores}c` },
                    { icon: HardDrive, label: `${server.ram_gb}G`   },
                    { icon: Database, label: `${server.disk_gb}G`   },
                  ].map(({ icon: Icon, label }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 6, background: C.surface, fontSize: 11, color: C.muted }}>
                      <Icon size={10} /> {label}
                    </div>
                  ))}
                  {server.location && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 6, background: C.surface, fontSize: 11, color: C.muted, marginLeft: 'auto' }}>
                      📍 {server.location}
                    </div>
                  )}
                </div>

                {/* Live metrics */}
                {m ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Live metrics</span>
                      <span style={{ fontSize: 10, color: C.dim, display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Clock size={9} /> {new Date(m.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    {[
                      { label: 'CPU',    value: m.cpu_usage,    color: metricColor(m.cpu_usage) },
                      { label: 'MEM',   value: m.memory_usage, color: metricColor(m.memory_usage) },
                      { label: 'DISK',  value: m.disk_usage,   color: metricColor(m.disk_usage) },
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 10, color: C.muted, width: 32, fontFamily: 'monospace' }}>{label}</span>
                        <MiniBar value={value} />
                        <span style={{ fontSize: 11, fontWeight: 700, color, width: 34, textAlign: 'right', fontFamily: 'monospace' }}>{Math.round(value)}%</span>
                      </div>
                    ))}
                    {(m.network_in !== undefined) && (
                      <div style={{ display: 'flex', gap: 12, marginTop: 2 }}>
                        <span style={{ fontSize: 10, color: C.muted, display: 'flex', alignItems: 'center', gap: 3 }}>
                          <ArrowDown size={9} color={C.green} /> {Math.round(m.network_in)} MB/s
                        </span>
                        <span style={{ fontSize: 10, color: C.muted, display: 'flex', alignItems: 'center', gap: 3 }}>
                          <ArrowUp size={9} color={C.blue} /> {Math.round(m.network_out || 0)} MB/s
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ padding: '10px 0', textAlign: 'center', fontSize: 12, color: C.dim, borderRadius: 8, background: C.surface }}>
                    Awaiting metrics…
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: 6, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
                  <button onClick={() => setViewServer(server)} style={{
                    flex: 1, padding: '8px 0', borderRadius: 8, background: C.blueDim,
                    border: `1px solid ${C.blue}30`, color: C.blue, fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  }}>
                    <Activity size={12} /> Analytics
                  </button>
                  <button onClick={() => openEdit(server)} style={{
                    flex: 1, padding: '8px 0', borderRadius: 8, background: C.surface,
                    border: `1px solid ${C.border}`, color: C.muted, fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  }}>
                    <Edit2 size={12} /> Edit
                  </button>
                  <button onClick={() => setDeleteServer(server)} style={{
                    flex: 1, padding: '8px 0', borderRadius: 8, background: C.redGlow,
                    border: `1px solid ${C.red}30`, color: C.red, fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  }}>
                    <Trash2 size={12} /> Remove
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Metrics Modal ── */}
      {viewServer && (
        <Modal title={viewServer.name} subtitle={`${viewServer.ip_address} · ${viewServer.server_type}`} onClose={() => setViewServer(null)} wide>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Status + rings */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', borderRadius: 14, background: C.surface, border: `1px solid ${C.border}` }}>
              <StatusBadge status={viewServer.status} />
              <div style={{ flex: 1, height: 1, background: C.border }} />
              {statsData && (
                <div style={{ display: 'flex', gap: 24 }}>
                  <StatRing value={statsData.avg_cpu}    label="Avg CPU"  color={metricColor(statsData.avg_cpu)} />
                  <StatRing value={statsData.avg_memory} label="Avg MEM"  color={metricColor(statsData.avg_memory)} />
                  <StatRing value={statsData.max_cpu}    label="Peak CPU" color={metricColor(statsData.max_cpu)} />
                </div>
              )}
            </div>

            {/* CPU + Memory chart */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '16px 20px' }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: C.muted, margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                CPU & Memory — last 6 hours
              </p>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -24, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gcpu2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={C.red}  stopOpacity={0.4} />
                        <stop offset="95%" stopColor={C.red}  stopOpacity={0}   />
                      </linearGradient>
                      <linearGradient id="gmem2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={C.blue} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={C.blue} stopOpacity={0}   />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: C.muted }} tickLine={false} axisLine={false} />
                    <YAxis domain={[0,100]} tick={{ fontSize: 10, fill: C.muted }} tickLine={false} axisLine={false} />
                    <Tooltip content={<Tooltip2 />} />
                    <Area type="monotone" dataKey="cpu"    name="CPU %"    stroke={C.red}  fill="url(#gcpu2)" strokeWidth={2} dot={false} />
                    <Area type="monotone" dataKey="memory" name="Memory %" stroke={C.blue} fill="url(#gmem2)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, fontSize: 13 }}>
                  No data yet
                </div>
              )}
            </div>

            {/* Disk + Net chart */}
            {chartData.length > 0 && (
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '16px 20px' }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: C.muted, margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Disk & Network — last 6 hours
                </p>
                <ResponsiveContainer width="100%" height={140}>
                  <LineChart data={chartData} margin={{ top: 0, right: 0, left: -24, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: C.muted }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: C.muted }} tickLine={false} axisLine={false} />
                    <Tooltip content={<Tooltip2 />} />
                    <Line type="monotone" dataKey="disk" name="Disk %" stroke={C.amber}  strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="net"  name="Net MB/s" stroke={C.violet} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Server info grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {[
                { label: 'Hostname',  value: viewServer.hostname },
                { label: 'OS',        value: viewServer.os || '—' },
                { label: 'Location',  value: viewServer.location || '—' },
                { label: 'Type',      value: viewServer.server_type },
                { label: 'CPU cores', value: viewServer.cpu_cores },
                { label: 'RAM',       value: `${viewServer.ram_gb} GB` },
              ].map(({ label, value }) => (
                <div key={label} style={{ padding: '10px 14px', borderRadius: 10, background: C.surface, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 10, color: C.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.offwhite, textTransform: 'capitalize' }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {/* ── Add/Edit Modal ── */}
      {showModal && (
        <Modal title={editServer ? 'Edit server' : 'Register server'} subtitle={editServer ? `Editing ${editServer.name}` : 'Add a new node to your infrastructure'} onClose={closeModal} wide>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {formError && (
              <div style={{ display: 'flex', gap: 8, padding: '10px 14px', borderRadius: 10, background: C.redGlow, border: `1px solid ${C.red}40`, color: C.red, fontSize: 13 }}>
                <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} /> {formError}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <FormField label="Server name"  name="name"       value={form.name}       onChange={handleChange} placeholder="web-server-01"      required />
              <FormField label="Hostname"     name="hostname"   value={form.hostname}   onChange={handleChange} placeholder="web-server-01.local" required />
              <FormField label="IP address"   name="ip_address" value={form.ip_address} onChange={handleChange} placeholder="192.168.1.100"       required />
              <FormField label="Location"     name="location"   value={form.location}   onChange={handleChange} placeholder="Rack A, DC1" />
              <FormField label="Server type"  name="server_type" value={form.server_type} onChange={handleChange} as="select" />
              <FormField label="Status"       name="status"     value={form.status}     onChange={handleChange} as="select" type="status" />
            </div>
            <FormField label="Operating system" name="os" value={form.os} onChange={handleChange} placeholder="Ubuntu 22.04 LTS" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
              <FormField label="CPU cores" name="cpu_cores" type="number" value={form.cpu_cores} onChange={handleChange} placeholder="4"   required />
              <FormField label="RAM (GB)"  name="ram_gb"    type="number" value={form.ram_gb}    onChange={handleChange} placeholder="16"  required />
              <FormField label="Disk (GB)" name="disk_gb"   type="number" value={form.disk_gb}   onChange={handleChange} placeholder="500" required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: C.muted, marginBottom: 6, fontWeight: 500 }}>Description</label>
              <textarea name="description" value={form.description} onChange={handleChange} placeholder="Optional notes about this server…" rows={3}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13, background: C.surface, border: `1px solid ${C.border}`, color: C.offwhite, outline: 'none', resize: 'none', fontFamily: 'inherit' }}
                        onFocus={e => e.target.style.borderColor = C.red}
                        onBlur={e  => e.target.style.borderColor = C.border} />
            </div>
            <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
              <button type="button" onClick={closeModal} style={{ flex: 1, padding: '11px 0', borderRadius: 10, background: C.surface, border: `1px solid ${C.border}`, color: C.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
              <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} style={{
                flex: 1, padding: '11px 0', borderRadius: 10, background: C.red, border: 'none',
                color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                opacity: (createMutation.isPending || updateMutation.isPending) ? 0.7 : 1,
                boxShadow: `0 4px 16px ${C.red}40`,
              }}>
                {createMutation.isPending || updateMutation.isPending ? 'Saving…' : editServer ? 'Save changes' : 'Add server'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Delete Modal ── */}
      {deleteServer && (
        <Modal title="Remove server" subtitle="This action cannot be undone" onClose={() => setDeleteServer(null)}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: C.redGlow, border: `1px solid ${C.red}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Trash2 size={22} color={C.red} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: C.offwhite, margin: '0 0 8px' }}>Remove {deleteServer.name}?</p>
            <p style={{ fontSize: 13, color: C.muted, margin: '0 0 24px' }}>
              All metrics, alerts and history for this node will be permanently deleted.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteServer(null)} style={{ flex: 1, padding: '11px 0', borderRadius: 10, background: C.surface, border: `1px solid ${C.border}`, color: C.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={() => deleteMutation.mutate(deleteServer.id)} disabled={deleteMutation.isPending} style={{ flex: 1, padding: '11px 0', borderRadius: 10, background: C.red, border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: deleteMutation.isPending ? 0.7 : 1 }}>
                {deleteMutation.isPending ? 'Removing…' : 'Yes, remove'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}