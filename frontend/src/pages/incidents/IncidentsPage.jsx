import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle, Plus, Search, CheckCircle, Clock,
  RefreshCw, X, AlertCircle, ChevronDown, User,
  Server, Flag, MessageSquare, TrendingUp, XCircle,
  Edit2, Eye, ArrowUp
} from 'lucide-react'
import { incidentsAPI, usersAPI } from '../../api/endpoints'

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
  purple   : '#7C3AED',
}

const PRIORITY_MAP = {
  critical : { color: COLOR.red,    bg: 'rgba(192,39,45,0.1)',  label: 'Critical' },
  high     : { color: COLOR.orange, bg: 'rgba(217,119,6,0.1)',  label: 'High'     },
  medium   : { color: COLOR.gold,   bg: 'rgba(245,200,66,0.1)', label: 'Medium'   },
  low      : { color: COLOR.green,  bg: 'rgba(5,150,105,0.1)',  label: 'Low'      },
}

const STATUS_MAP = {
  open        : { color: COLOR.red,    bg: 'rgba(192,39,45,0.1)',  label: 'Open'        },
  in_progress : { color: COLOR.blue,   bg: 'rgba(37,99,235,0.1)',  label: 'In Progress' },
  resolved    : { color: COLOR.green,  bg: 'rgba(5,150,105,0.1)',  label: 'Resolved'    },
  closed      : { color: COLOR.muted,  bg: 'rgba(107,114,128,0.1)', label: 'Closed'     },
}

const CATEGORIES = ['hardware','software','network','security','performance','other']
const PRIORITIES  = ['low','medium','high','critical']
const STATUSES    = ['open','in_progress','resolved','closed']

function PriorityBadge({ priority }) {
  const p = PRIORITY_MAP[priority] || PRIORITY_MAP.low
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium capitalize"
          style={{ background: p.bg, color: p.color }}>
      <Flag size={10} /> {p.label}
    </span>
  )
}

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || STATUS_MAP.open
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
          style={{ background: s.bg, color: s.color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
      {s.label}
    </span>
  )
}

function Avatar({ name, size = 32 }) {
  const initials = name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'U'
  return (
    <div className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
         style={{ width: size, height: size, background: COLOR.red, fontSize: size * 0.35 }}>
      {initials}
    </div>
  )
}

function Modal({ title, onClose, wide, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
         style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className={`w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} rounded-2xl shadow-2xl my-4`}
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

function Field({ label, name, value, onChange, as, options, type='text', placeholder, required, rows }) {
  const cls   = "w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all"
  const style = { background: COLOR.bg, border: '1px solid #E5E5E5', color: COLOR.black }
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
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : as === 'textarea' ? (
        <textarea name={name} value={value} onChange={onChange}
                  placeholder={placeholder} rows={rows || 3}
                  className={`${cls} resize-none`} style={style}
                  onFocus={focus} onBlur={blur} />
      ) : (
        <input type={type} name={name} value={value} onChange={onChange}
               placeholder={placeholder} required={required}
               className={cls} style={style} onFocus={focus} onBlur={blur} />
      )}
    </div>
  )
}

const emptyForm = {
  title: '', description: '', priority: 'medium',
  category: 'other', status: 'open', server: '',
}

export default function IncidentsPage() {
  const queryClient = useQueryClient()

  const [search,         setSearch]         = useState('')
  const [statusFilter,   setStatusFilter]   = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [showModal,      setShowModal]      = useState(false)
  const [editIncident,   setEditIncident]   = useState(null)
  const [viewIncident,   setViewIncident]   = useState(null)
  const [form,           setForm]           = useState(emptyForm)
  const [formError,      setFormError]      = useState('')
  const [successMsg,     setSuccessMsg]     = useState('')
  const [comment,        setComment]        = useState('')
  const [resolveForm,    setResolveForm]    = useState({ resolution: '', root_cause: '' })
  const [showResolve,    setShowResolve]    = useState(false)
  const [assignTo,       setAssignTo]       = useState('')
  const [showAssign,     setShowAssign]     = useState(false)

  const { data: summary } = useQuery({
    queryKey : ['incidents-summary'],
    queryFn  : () => incidentsAPI.summary().then(r => r.data),
    refetchInterval: 15000,
  })

  const { data, isLoading, refetch } = useQuery({
    queryKey : ['incidents', statusFilter, priorityFilter],
    queryFn  : () => incidentsAPI.list({
      status   : statusFilter   || undefined,
      priority : priorityFilter || undefined,
    }).then(r => r.data),
    refetchInterval: 15000,
  })

  const { data: viewData, refetch: refetchView } = useQuery({
    queryKey : ['incident-detail', viewIncident?.id],
    queryFn  : () => incidentsAPI.detail(viewIncident.id).then(r => r.data),
    enabled  : !!viewIncident,
  })

  const { data: usersData } = useQuery({
    queryKey : ['users-list'],
    queryFn  : () => usersAPI.list().then(r => r.data),
  })

  const incidents = data?.results || data || []
  const users     = usersData?.results || usersData || []

  const flash = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000) }

  const createMutation = useMutation({
    mutationFn : (d) => incidentsAPI.create(d),
    onSuccess  : () => { queryClient.invalidateQueries(['incidents']); queryClient.invalidateQueries(['incidents-summary']); closeModal(); flash('Incident created.') },
    onError    : (err) => setFormError(err.response?.data ? Object.values(err.response.data).flat().join(' ') : 'Failed.'),
  })

  const updateMutation = useMutation({
    mutationFn : ({ id, data }) => incidentsAPI.update(id, data),
    onSuccess  : () => { queryClient.invalidateQueries(['incidents']); closeModal(); flash('Incident updated.') },
    onError    : (err) => setFormError(err.response?.data ? Object.values(err.response.data).flat().join(' ') : 'Failed.'),
  })

  const resolveMutation = useMutation({
    mutationFn : ({ id, data }) => incidentsAPI.resolve(id, data),
    onSuccess  : () => {
      queryClient.invalidateQueries(['incidents'])
      queryClient.invalidateQueries(['incidents-summary'])
      queryClient.invalidateQueries(['incident-detail', viewIncident?.id])
      setShowResolve(false)
      flash('Incident resolved.')
    },
  })

  const closeMutation = useMutation({
    mutationFn : (id) => incidentsAPI.close(id),
    onSuccess  : () => {
      queryClient.invalidateQueries(['incidents'])
      queryClient.invalidateQueries(['incidents-summary'])
      flash('Incident closed.')
    },
  })

  const assignMutation = useMutation({
    mutationFn : ({ id, data }) => incidentsAPI.assign(id, data),
    onSuccess  : () => {
      queryClient.invalidateQueries(['incidents'])
      queryClient.invalidateQueries(['incident-detail', viewIncident?.id])
      setShowAssign(false)
      flash('Incident assigned.')
    },
  })

  const commentMutation = useMutation({
    mutationFn : ({ id, data }) => incidentsAPI.addComment(id, data),
    onSuccess  : () => {
      queryClient.invalidateQueries(['incident-detail', viewIncident?.id])
      setComment('')
      flash('Comment added.')
    },
  })

  const openCreate = () => { setForm(emptyForm); setEditIncident(null); setFormError(''); setShowModal(true) }
  const openEdit   = (i) => {
    setForm({ title: i.title, description: i.description, priority: i.priority, category: i.category, status: i.status, server: i.server || '' })
    setEditIncident(i); setFormError(''); setShowModal(true)
  }
  const closeModal = () => { setShowModal(false); setEditIncident(null); setForm(emptyForm); setFormError('') }

  const handleChange = (e) => { setForm({ ...form, [e.target.name]: e.target.value }); setFormError('') }

  const handleSubmit = (e) => {
    e.preventDefault()
    const payload = { ...form, server: form.server || null }
    if (editIncident) updateMutation.mutate({ id: editIncident.id, data: payload })
    else createMutation.mutate(payload)
  }

  const filtered = incidents.filter(i => {
    const q = search.toLowerCase()
    return !search ||
      i.title.toLowerCase().includes(q) ||
      i.description?.toLowerCase().includes(q) ||
      i.category?.toLowerCase().includes(q)
  })

  const summaryCards = [
    { label: 'Total',       value: summary?.total,        color: COLOR.gray   },
    { label: 'Open',        value: summary?.open,         color: COLOR.red    },
    { label: 'In progress', value: summary?.in_progress,  color: COLOR.blue   },
    { label: 'Resolved',    value: summary?.resolved,     color: COLOR.green  },
    { label: 'Critical',    value: summary?.critical,     color: COLOR.red    },
    { label: 'Assigned to me', value: summary?.assigned_to_me, color: COLOR.purple },
  ]

  const detail = viewData

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
          <h2 className="text-xl font-bold" style={{ color: COLOR.black }}>Incident Management</h2>
          <p className="text-sm mt-0.5" style={{ color: COLOR.muted }}>Track, assign and resolve infrastructure incidents</p>
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
            <Plus size={16} /> Create incident
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        {summaryCards.map(({ label, value, color }) => (
          <div key={label}
               className="rounded-2xl p-4 flex flex-col gap-2"
               style={{ background: COLOR.white, border: '1px solid #F0F0F0' }}>
            <span className="text-xs" style={{ color: COLOR.muted }}>{label}</span>
            <span className="text-2xl font-bold" style={{ color: COLOR.black }}>{value ?? '—'}</span>
            <span className="w-8 h-1 rounded-full" style={{ background: color }} />
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: COLOR.muted }} />
          <input
            type="text" placeholder="Search incidents..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: COLOR.white, border: '1px solid #E5E5E5', color: COLOR.black }}
            onFocus={e => e.target.style.borderColor = COLOR.red}
            onBlur={e  => e.target.style.borderColor = '#E5E5E5'} />
        </div>
        {[
          { value: statusFilter,   set: setStatusFilter,   placeholder: 'All statuses',   options: STATUSES   },
          { value: priorityFilter, set: setPriorityFilter, placeholder: 'All priorities', options: PRIORITIES },
        ].map(({ value, set, placeholder, options }, i) => (
          <div key={i} className="relative">
            <select value={value} onChange={e => set(e.target.value)}
                    className="pl-3 pr-8 py-2.5 rounded-xl text-sm outline-none cursor-pointer appearance-none"
                    style={{ background: COLOR.white, border: '1px solid #E5E5E5', color: COLOR.black, minWidth: '150px' }}>
              <option value="">{placeholder}</option>
              {options.map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1).replace('_', ' ')}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: COLOR.muted }} />
          </div>
        ))}
      </div>

      {/* Incidents table */}
      <div className="rounded-2xl overflow-hidden"
           style={{ background: COLOR.white, border: '1px solid #F0F0F0' }}>

        <div className="grid grid-cols-12 gap-4 px-6 py-3 text-xs font-semibold uppercase tracking-wide"
             style={{ background: '#F9F9F9', borderBottom: '1px solid #F0F0F0', color: COLOR.muted }}>
          <div className="col-span-4">Title</div>
          <div className="col-span-2">Priority</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Assigned to</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-16 gap-3" style={{ color: COLOR.muted }}>
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            Loading incidents...
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3" style={{ color: COLOR.muted }}>
            <CheckCircle size={40} strokeWidth={1} style={{ color: COLOR.green }} />
            <p className="text-sm">No incidents found</p>
          </div>
        )}

        {!isLoading && filtered.map((incident, idx) => (
          <div key={incident.id}
               className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-gray-50 transition-colors"
               style={{ borderBottom: idx < filtered.length - 1 ? '1px solid #F0F0F0' : 'none' }}>

            {/* Title */}
            <div className="col-span-4 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: COLOR.black }}>
                #{incident.id} — {incident.title}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs capitalize px-1.5 py-0.5 rounded"
                      style={{ background: COLOR.bg, color: COLOR.muted }}>
                  {incident.category}
                </span>
                <span className="text-xs flex items-center gap-1" style={{ color: COLOR.muted }}>
                  <Clock size={10} />
                  {new Date(incident.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Priority */}
            <div className="col-span-2">
              <PriorityBadge priority={incident.priority} />
            </div>

            {/* Status */}
            <div className="col-span-2">
              <StatusBadge status={incident.status} />
            </div>

            {/* Assigned */}
            <div className="col-span-2">
              {incident.assigned_to_username ? (
                <div className="flex items-center gap-2">
                  <Avatar name={incident.assigned_to_username} size={24} />
                  <span className="text-xs truncate" style={{ color: COLOR.gray }}>
                    {incident.assigned_to_username}
                  </span>
                </div>
              ) : (
                <span className="text-xs" style={{ color: COLOR.muted }}>Unassigned</span>
              )}
            </div>

            {/* Actions */}
            <div className="col-span-2 flex items-center justify-end gap-1">
              <button onClick={() => setViewIncident(incident)}
                      className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                      style={{ color: COLOR.blue }} title="View details">
                <Eye size={15} />
              </button>
              <button onClick={() => openEdit(incident)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                      style={{ color: COLOR.gray }} title="Edit">
                <Edit2 size={15} />
              </button>
              {incident.status !== 'closed' && (
                <button onClick={() => closeMutation.mutate(incident.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                        style={{ color: COLOR.red }} title="Close">
                  <XCircle size={15} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {!isLoading && filtered.length > 0 && (
        <p className="text-xs text-right" style={{ color: COLOR.muted }}>
          Showing {filtered.length} of {incidents.length} incidents
        </p>
      )}

      {/* Detail Modal */}
      {viewIncident && detail && (
        <Modal title={`Incident #${detail.id}`} onClose={() => setViewIncident(null)} wide>
          <div className="space-y-5">

            {/* Header info */}
            <div>
              <div className="flex items-start justify-between gap-4 mb-3">
                <h4 className="font-bold text-base" style={{ color: COLOR.black }}>{detail.title}</h4>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <PriorityBadge priority={detail.priority} />
                  <StatusBadge   status={detail.status}     />
                </div>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: COLOR.gray }}>{detail.description}</p>
            </div>

            {/* Meta grid */}
            <div className="grid grid-cols-2 gap-3 p-4 rounded-xl text-sm"
                 style={{ background: COLOR.bg }}>
              {[
                { label: 'Category',    value: detail.category         },
                { label: 'Created by',  value: detail.created_by_username },
                { label: 'Assigned to', value: detail.assigned_to_username || 'Unassigned' },
                { label: 'Server',      value: detail.server_name      || '—'  },
                { label: 'Created',     value: new Date(detail.created_at).toLocaleString() },
                { label: 'Updated',     value: new Date(detail.updated_at).toLocaleString() },
              ].map(({ label, value }) => (
                <div key={label}>
                  <span style={{ color: COLOR.muted }}>{label}: </span>
                  <span className="font-medium capitalize" style={{ color: COLOR.black }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Resolution if resolved */}
            {detail.resolution && (
              <div className="p-4 rounded-xl" style={{ background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.2)' }}>
                <p className="text-xs font-semibold mb-1" style={{ color: COLOR.green }}>Resolution</p>
                <p className="text-sm" style={{ color: COLOR.black }}>{detail.resolution}</p>
                {detail.root_cause && (
                  <>
                    <p className="text-xs font-semibold mt-2 mb-1" style={{ color: COLOR.green }}>Root cause</p>
                    <p className="text-sm" style={{ color: COLOR.black }}>{detail.root_cause}</p>
                  </>
                )}
              </div>
            )}

            {/* Action buttons */}
            {detail.status !== 'closed' && (
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setShowAssign(!showAssign)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors"
                        style={{ background: 'rgba(37,99,235,0.1)', color: COLOR.blue }}>
                  <User size={13} /> Assign
                </button>
                {detail.status !== 'resolved' && (
                  <button onClick={() => setShowResolve(!showResolve)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium"
                          style={{ background: 'rgba(5,150,105,0.1)', color: COLOR.green }}>
                    <CheckCircle size={13} /> Resolve
                  </button>
                )}
                <button onClick={() => closeMutation.mutate(detail.id)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium"
                        style={{ background: COLOR.redLight, color: COLOR.red }}>
                  <XCircle size={13} /> Close
                </button>
              </div>
            )}

            {/* Assign form */}
            {showAssign && (
              <div className="p-4 rounded-xl space-y-3" style={{ background: COLOR.bg }}>
                <p className="text-sm font-medium" style={{ color: COLOR.black }}>Assign to</p>
                <select value={assignTo} onChange={e => setAssignTo(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                        style={{ background: COLOR.white, border: '1px solid #E5E5E5', color: COLOR.black }}>
                  <option value="">Select user...</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.first_name ? `${u.first_name} ${u.last_name}` : u.username}
                    </option>
                  ))}
                </select>
                <button onClick={() => assignMutation.mutate({ id: detail.id, data: { assigned_to: assignTo } })}
                        disabled={!assignTo}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-white"
                        style={{ background: COLOR.blue, opacity: assignTo ? 1 : 0.5 }}>
                  Confirm assignment
                </button>
              </div>
            )}

            {/* Resolve form */}
            {showResolve && (
              <div className="p-4 rounded-xl space-y-3" style={{ background: COLOR.bg }}>
                <p className="text-sm font-medium" style={{ color: COLOR.black }}>Resolve incident</p>
                <textarea
                  placeholder="Describe the resolution..."
                  value={resolveForm.resolution}
                  onChange={e => setResolveForm({ ...resolveForm, resolution: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
                  style={{ background: COLOR.white, border: '1px solid #E5E5E5', color: COLOR.black }} />
                <textarea
                  placeholder="Root cause (optional)..."
                  value={resolveForm.root_cause}
                  onChange={e => setResolveForm({ ...resolveForm, root_cause: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
                  style={{ background: COLOR.white, border: '1px solid #E5E5E5', color: COLOR.black }} />
                <button
                  onClick={() => resolveMutation.mutate({ id: detail.id, data: resolveForm })}
                  disabled={!resolveForm.resolution}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white"
                  style={{ background: COLOR.green, opacity: resolveForm.resolution ? 1 : 0.5 }}>
                  Mark as resolved
                </button>
              </div>
            )}

            {/* Timeline */}
            {detail.timeline?.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: COLOR.muted }}>Timeline</p>
                <div className="space-y-2">
                  {detail.timeline.map(t => (
                    <div key={t.id} className="flex items-start gap-3 text-xs">
                      <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: COLOR.red }} />
                      <div>
                        <span style={{ color: COLOR.black }}>{t.action}</span>
                        <span className="ml-2" style={{ color: COLOR.muted }}>
                          by {t.performed_by_username} · {new Date(t.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comments */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: COLOR.muted }}>
                Comments ({detail.comments?.length || 0})
              </p>
              {detail.comments?.length > 0 && (
                <div className="space-y-3 mb-4">
                  {detail.comments.map(c => (
                    <div key={c.id} className="flex items-start gap-3">
                      <Avatar name={c.author_username} size={28} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold" style={{ color: COLOR.black }}>
                            {c.author_username}
                          </span>
                          <span className="text-xs" style={{ color: COLOR.muted }}>
                            {new Date(c.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm p-3 rounded-xl" style={{ background: COLOR.bg, color: COLOR.black }}>
                          {c.message}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-3">
                <textarea
                  placeholder="Add a comment..."
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  rows={2}
                  className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
                  style={{ background: COLOR.bg, border: '1px solid #E5E5E5', color: COLOR.black }} />
                <button
                  onClick={() => commentMutation.mutate({ id: detail.id, data: { message: comment } })}
                  disabled={!comment.trim() || commentMutation.isPending}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-white self-end"
                  style={{ background: COLOR.red, opacity: comment.trim() ? 1 : 0.5 }}>
                  Post
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <Modal title={editIncident ? 'Edit incident' : 'Create incident'} onClose={closeModal}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="flex items-start gap-2 p-3 rounded-xl text-sm"
                   style={{ background: 'rgba(192,39,45,0.08)', color: COLOR.red, border: '1px solid rgba(192,39,45,0.2)' }}>
                <AlertCircle size={15} className="flex-shrink-0 mt-0.5" /> {formError}
              </div>
            )}
            <Field label="Title" name="title" value={form.title}
                   onChange={handleChange} placeholder="Brief incident description" required />
            <Field label="Description" name="description" value={form.description}
                   onChange={handleChange} as="textarea" placeholder="Detailed description of the incident..." rows={3} />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Priority" name="priority" value={form.priority}
                     onChange={handleChange} as="select"
                     options={PRIORITIES.map(p => ({ value: p, label: p.charAt(0).toUpperCase() + p.slice(1) }))} />
              <Field label="Category" name="category" value={form.category}
                     onChange={handleChange} as="select"
                     options={CATEGORIES.map(c => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))} />
            </div>
            {editIncident && (
              <Field label="Status" name="status" value={form.status}
                     onChange={handleChange} as="select"
                     options={STATUSES.map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1).replace('_',' ') }))} />
            )}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={closeModal}
                      className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                      style={{ background: COLOR.bg, color: COLOR.gray }}>
                Cancel
              </button>
              <button type="submit"
                      disabled={createMutation.isPending || updateMutation.isPending}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                      style={{ background: COLOR.red }}
                      onMouseEnter={e => e.currentTarget.style.background = COLOR.redDark}
                      onMouseLeave={e => e.currentTarget.style.background = COLOR.red}>
                {createMutation.isPending || updateMutation.isPending
                  ? 'Saving...' : editIncident ? 'Save changes' : 'Create incident'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}