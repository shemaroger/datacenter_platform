import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Bell, Plus, Search, CheckCircle, XCircle,
  AlertTriangle, Info, RefreshCw, X, AlertCircle,
  ChevronDown, Filter, Clock, Server, Trash2,
  BellOff, Settings
} from 'lucide-react'
import { alertsAPI, monitoringAPI } from '../../api/endpoints'

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

const SEVERITY_MAP = {
  critical : { color: COLOR.red,    bg: 'rgba(192,39,45,0.1)',  icon: XCircle,       label: 'Critical' },
  warning  : { color: COLOR.orange, bg: 'rgba(217,119,6,0.1)',  icon: AlertTriangle, label: 'Warning'  },
  info     : { color: COLOR.blue,   bg: 'rgba(37,99,235,0.1)',  icon: Info,          label: 'Info'     },
}

const STATUS_MAP = {
  active       : { color: COLOR.red,    bg: 'rgba(192,39,45,0.1)'  },
  acknowledged : { color: COLOR.orange, bg: 'rgba(217,119,6,0.1)'  },
  resolved     : { color: COLOR.green,  bg: 'rgba(5,150,105,0.1)'  },
  muted        : { color: COLOR.muted,  bg: 'rgba(107,114,128,0.1)'},
}

const METRICS = [
  { value: 'cpu_usage',    label: 'CPU Usage'       },
  { value: 'memory_usage', label: 'Memory Usage'    },
  { value: 'disk_usage',   label: 'Disk Usage'      },
  { value: 'network_in',   label: 'Network In'      },
  { value: 'network_out',  label: 'Network Out'     },
  { value: 'cpu_temp',     label: 'CPU Temperature' },
]

function SeverityBadge({ severity }) {
  const s = SEVERITY_MAP[severity] || SEVERITY_MAP.info
  const Icon = s.icon
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium capitalize"
          style={{ background: s.bg, color: s.color }}>
      <Icon size={11} />
      {s.label}
    </span>
  )
}

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || STATUS_MAP.active
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium capitalize"
          style={{ background: s.bg, color: s.color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
      {status}
    </span>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="w-full max-w-lg rounded-2xl shadow-2xl"
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

function Field({ label, name, value, onChange, as, options, type = 'text', placeholder, required }) {
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
      ) : (
        <input type={type} name={name} value={value} onChange={onChange}
               placeholder={placeholder} required={required}
               className={cls} style={style} onFocus={focus} onBlur={blur} />
      )}
    </div>
  )
}

const emptyRule = {
  name: '', metric: 'cpu_usage', operator: 'gt',
  threshold: '', severity: 'warning', server: '',
}

export default function AlertsPage() {
  const queryClient = useQueryClient()

  const [search,       setSearch]      = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [severityFilter, setSeverityFilter] = useState('')
  const [activeTab,    setActiveTab]   = useState('alerts')
  const [showRuleModal, setShowRuleModal] = useState(false)
  const [editRule,     setEditRule]    = useState(null)
  const [ruleForm,     setRuleForm]    = useState(emptyRule)
  const [formError,    setFormError]   = useState('')
  const [successMsg,   setSuccessMsg]  = useState('')

  const { data: summary } = useQuery({
    queryKey : ['alerts-summary'],
    queryFn  : () => alertsAPI.summary().then(r => r.data),
    refetchInterval: 15000,
  })

  const { data: alertsData, isLoading: loadingAlerts, refetch } = useQuery({
    queryKey : ['alerts', statusFilter, severityFilter],
    queryFn  : () => alertsAPI.list({
      status   : statusFilter   || undefined,
      severity : severityFilter || undefined,
    }).then(r => r.data),
    refetchInterval: 15000,
  })

  const { data: rulesData, isLoading: loadingRules } = useQuery({
    queryKey : ['alert-rules'],
    queryFn  : () => alertsAPI.rules().then(r => r.data),
  })

  const { data: serversData } = useQuery({
    queryKey : ['servers-list'],
    queryFn  : () => monitoringAPI.servers().then(r => r.data),
  })

  const alerts  = alertsData?.results  || alertsData  || []
  const rules   = rulesData?.results   || rulesData   || []
  const servers = serversData?.results || serversData || []

  const acknowledgeMutation = useMutation({
    mutationFn : (id) => alertsAPI.acknowledge(id),
    onSuccess  : () => { queryClient.invalidateQueries(['alerts']); queryClient.invalidateQueries(['alerts-summary']); flash('Alert acknowledged.') },
  })

  const resolveMutation = useMutation({
    mutationFn : (id) => alertsAPI.resolve(id),
    onSuccess  : () => { queryClient.invalidateQueries(['alerts']); queryClient.invalidateQueries(['alerts-summary']); flash('Alert resolved.') },
  })

  const createRuleMutation = useMutation({
    mutationFn : (d) => alertsAPI.createRule(d),
    onSuccess  : () => { queryClient.invalidateQueries(['alert-rules']); closeRuleModal(); flash('Alert rule created.') },
    onError    : (err) => setFormError(err.response?.data ? Object.values(err.response.data).flat().join(' ') : 'Failed.'),
  })

  const updateRuleMutation = useMutation({
    mutationFn : ({ id, data }) => alertsAPI.updateRule(id, data),
    onSuccess  : () => { queryClient.invalidateQueries(['alert-rules']); closeRuleModal(); flash('Alert rule updated.') },
    onError    : (err) => setFormError(err.response?.data ? Object.values(err.response.data).flat().join(' ') : 'Failed.'),
  })

  const deleteRuleMutation = useMutation({
    mutationFn : (id) => alertsAPI.deleteRule(id),
    onSuccess  : () => { queryClient.invalidateQueries(['alert-rules']); flash('Rule deleted.') },
  })

  const flash = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000) }

  const openCreateRule = () => { setRuleForm(emptyRule); setEditRule(null); setFormError(''); setShowRuleModal(true) }
  const openEditRule   = (rule) => {
    setRuleForm({
      name      : rule.name,
      metric    : rule.metric,
      operator  : rule.operator,
      threshold : rule.threshold,
      severity  : rule.severity,
      server    : rule.server || '',
    })
    setEditRule(rule)
    setFormError('')
    setShowRuleModal(true)
  }
  const closeRuleModal = () => { setShowRuleModal(false); setEditRule(null); setRuleForm(emptyRule); setFormError('') }

  const handleRuleChange = (e) => { setRuleForm({ ...ruleForm, [e.target.name]: e.target.value }); setFormError('') }

  const handleRuleSubmit = (e) => {
    e.preventDefault()
    const payload = { ...ruleForm, server: ruleForm.server || null, threshold: parseFloat(ruleForm.threshold) }
    if (editRule) updateRuleMutation.mutate({ id: editRule.id, data: payload })
    else createRuleMutation.mutate(payload)
  }

  const filtered = alerts.filter(a => {
    const q = search.toLowerCase()
    return !search ||
      a.message?.toLowerCase().includes(q) ||
      a.server_name?.toLowerCase().includes(q) ||
      a.rule_name?.toLowerCase().includes(q)
  })

  const summaryCards = [
    { label: 'Total alerts',  value: summary?.total,    color: COLOR.gray,   icon: Bell          },
    { label: 'Active',        value: summary?.active,   color: COLOR.red,    icon: AlertTriangle },
    { label: 'Acknowledged',  value: summary?.acknowledged, color: COLOR.orange, icon: Clock     },
    { label: 'Resolved',      value: summary?.resolved, color: COLOR.green,  icon: CheckCircle   },
    { label: 'Critical',      value: summary?.critical, color: COLOR.red,    icon: XCircle       },
    { label: 'Warning',       value: summary?.warning,  color: COLOR.orange, icon: AlertTriangle },
  ]

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
          <h2 className="text-xl font-bold" style={{ color: COLOR.black }}>Alerts & Notifications</h2>
          <p className="text-sm mt-0.5" style={{ color: COLOR.muted }}>Monitor and respond to system alerts</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()}
                  className="p-2.5 rounded-xl hover:bg-gray-200 transition-colors"
                  style={{ background: COLOR.bg, color: COLOR.gray }}>
            <RefreshCw size={16} />
          </button>
          <button onClick={openCreateRule}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
                  style={{ background: COLOR.red }}
                  onMouseEnter={e => e.currentTarget.style.background = COLOR.redDark}
                  onMouseLeave={e => e.currentTarget.style.background = COLOR.red}>
            <Plus size={16} /> Add rule
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        {summaryCards.map(({ label, value, color, icon: Icon }) => (
          <div key={label}
               className="rounded-2xl p-4 flex flex-col gap-2"
               style={{ background: COLOR.white, border: '1px solid #F0F0F0' }}>
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: COLOR.muted }}>{label}</span>
              <Icon size={14} style={{ color }} />
            </div>
            <span className="text-2xl font-bold" style={{ color: COLOR.black }}>{value ?? '—'}</span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit"
           style={{ background: COLOR.bg }}>
        {[
          { key: 'alerts', label: 'Alerts',       icon: Bell     },
          { key: 'rules',  label: 'Alert Rules',   icon: Settings },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background : activeTab === key ? COLOR.white : 'transparent',
              color      : activeTab === key ? COLOR.black  : COLOR.muted,
              boxShadow  : activeTab === key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}>
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* ALERTS TAB */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: COLOR.muted }} />
              <input
                type="text" placeholder="Search alerts..."
                value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: COLOR.white, border: '1px solid #E5E5E5', color: COLOR.black }}
                onFocus={e => e.target.style.borderColor = COLOR.red}
                onBlur={e  => e.target.style.borderColor = '#E5E5E5'} />
            </div>
            {[
              { value: statusFilter,   set: setStatusFilter,   placeholder: 'All statuses',   options: ['active','acknowledged','resolved','muted'] },
              { value: severityFilter, set: setSeverityFilter, placeholder: 'All severities', options: ['critical','warning','info'] },
            ].map(({ value, set, placeholder, options }, i) => (
              <div key={i} className="relative">
                <select value={value} onChange={e => set(e.target.value)}
                        className="pl-3 pr-8 py-2.5 rounded-xl text-sm outline-none cursor-pointer appearance-none"
                        style={{ background: COLOR.white, border: '1px solid #E5E5E5', color: COLOR.black, minWidth: '150px' }}>
                  <option value="">{placeholder}</option>
                  {options.map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: COLOR.muted }} />
              </div>
            ))}
          </div>

          {/* Alerts table */}
          <div className="rounded-2xl overflow-hidden"
               style={{ background: COLOR.white, border: '1px solid #F0F0F0' }}>

            {/* Header */}
            <div className="grid grid-cols-12 gap-4 px-6 py-3 text-xs font-semibold uppercase tracking-wide"
                 style={{ background: '#F9F9F9', borderBottom: '1px solid #F0F0F0', color: COLOR.muted }}>
              <div className="col-span-4">Message</div>
              <div className="col-span-2">Server</div>
              <div className="col-span-2">Severity</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>

            {loadingAlerts && (
              <div className="flex items-center justify-center py-16 gap-3" style={{ color: COLOR.muted }}>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Loading alerts...
              </div>
            )}

            {!loadingAlerts && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-3" style={{ color: COLOR.muted }}>
                <CheckCircle size={40} strokeWidth={1} style={{ color: COLOR.green }} />
                <p className="text-sm">No alerts found — all systems healthy</p>
              </div>
            )}

            {!loadingAlerts && filtered.map((alert, idx) => (
              <div key={alert.id}
                   className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-gray-50 transition-colors"
                   style={{ borderBottom: idx < filtered.length - 1 ? '1px solid #F0F0F0' : 'none' }}>

                {/* Message */}
                <div className="col-span-4 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: COLOR.black }}>{alert.message}</p>
                  <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: COLOR.muted }}>
                    <Clock size={10} />
                    {new Date(alert.created_at).toLocaleString()}
                  </p>
                </div>

                {/* Server */}
                <div className="col-span-2">
                  <span className="flex items-center gap-1.5 text-sm" style={{ color: COLOR.gray }}>
                    <Server size={13} style={{ color: COLOR.muted }} />
                    <span className="truncate">{alert.server_name || '—'}</span>
                  </span>
                </div>

                {/* Severity */}
                <div className="col-span-2">
                  <SeverityBadge severity={alert.severity} />
                </div>

                {/* Status */}
                <div className="col-span-2">
                  <StatusBadge status={alert.status} />
                </div>

                {/* Actions */}
                <div className="col-span-2 flex items-center justify-end gap-1">
                  {alert.status === 'active' && (
                    <button
                      onClick={() => acknowledgeMutation.mutate(alert.id)}
                      disabled={acknowledgeMutation.isPending}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-orange-50"
                      style={{ color: COLOR.orange }}
                      title="Acknowledge">
                      <Clock size={13} /> Ack
                    </button>
                  )}
                  {alert.status !== 'resolved' && (
                    <button
                      onClick={() => resolveMutation.mutate(alert.id)}
                      disabled={resolveMutation.isPending}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-green-50"
                      style={{ color: COLOR.green }}
                      title="Resolve">
                      <CheckCircle size={13} /> Resolve
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {!loadingAlerts && filtered.length > 0 && (
            <p className="text-xs text-right" style={{ color: COLOR.muted }}>
              Showing {filtered.length} of {alerts.length} alerts
            </p>
          )}
        </div>
      )}

      {/* RULES TAB */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          <div className="rounded-2xl overflow-hidden"
               style={{ background: COLOR.white, border: '1px solid #F0F0F0' }}>

            <div className="grid grid-cols-12 gap-4 px-6 py-3 text-xs font-semibold uppercase tracking-wide"
                 style={{ background: '#F9F9F9', borderBottom: '1px solid #F0F0F0', color: COLOR.muted }}>
              <div className="col-span-3">Rule name</div>
              <div className="col-span-2">Metric</div>
              <div className="col-span-2">Condition</div>
              <div className="col-span-2">Severity</div>
              <div className="col-span-2">Server</div>
              <div className="col-span-1 text-right">Actions</div>
            </div>

            {loadingRules && (
              <div className="flex items-center justify-center py-12 gap-3" style={{ color: COLOR.muted }}>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Loading rules...
              </div>
            )}

            {!loadingRules && rules.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 gap-3" style={{ color: COLOR.muted }}>
                <BellOff size={36} strokeWidth={1} />
                <p className="text-sm">No alert rules yet</p>
                <button onClick={openCreateRule}
                        className="text-sm font-medium px-4 py-2 rounded-xl text-white"
                        style={{ background: COLOR.red }}>
                  Create first rule
                </button>
              </div>
            )}

            {!loadingRules && rules.map((rule, idx) => (
              <div key={rule.id}
                   className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-gray-50 transition-colors"
                   style={{ borderBottom: idx < rules.length - 1 ? '1px solid #F0F0F0' : 'none' }}>
                <div className="col-span-3">
                  <p className="text-sm font-medium truncate" style={{ color: COLOR.black }}>{rule.name}</p>
                </div>
                <div className="col-span-2 text-sm capitalize" style={{ color: COLOR.gray }}>
                  {rule.metric?.replace('_', ' ')}
                </div>
                <div className="col-span-2 text-sm font-mono" style={{ color: COLOR.gray }}>
                  {rule.operator === 'gt' ? '>' : rule.operator === 'lt' ? '<' : '='} {rule.threshold}%
                </div>
                <div className="col-span-2">
                  <SeverityBadge severity={rule.severity} />
                </div>
                <div className="col-span-2 text-sm" style={{ color: COLOR.muted }}>
                  {rule.server_name || 'All servers'}
                </div>
                <div className="col-span-1 flex items-center justify-end gap-1">
                  <button onClick={() => openEditRule(rule)}
                          className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                          style={{ color: COLOR.blue }}>
                    <Settings size={14} />
                  </button>
                  <button onClick={() => deleteRuleMutation.mutate(rule.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                          style={{ color: COLOR.red }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rule Modal */}
      {showRuleModal && (
        <Modal title={editRule ? 'Edit alert rule' : 'Create alert rule'} onClose={closeRuleModal}>
          <form onSubmit={handleRuleSubmit} className="space-y-4">
            {formError && (
              <div className="flex items-start gap-2 p-3 rounded-xl text-sm"
                   style={{ background: 'rgba(192,39,45,0.08)', color: COLOR.red, border: '1px solid rgba(192,39,45,0.2)' }}>
                <AlertCircle size={15} className="flex-shrink-0 mt-0.5" /> {formError}
              </div>
            )}

            <Field label="Rule name" name="name" value={ruleForm.name}
                   onChange={handleRuleChange} placeholder="e.g. High CPU Alert" required />

            <div className="grid grid-cols-2 gap-4">
              <Field label="Metric" name="metric" value={ruleForm.metric}
                     onChange={handleRuleChange} as="select"
                     options={METRICS.map(m => ({ value: m.value, label: m.label }))} />
              <Field label="Operator" name="operator" value={ruleForm.operator}
                     onChange={handleRuleChange} as="select"
                     options={[
                       { value: 'gt', label: 'Greater than (>)' },
                       { value: 'lt', label: 'Less than (<)'    },
                       { value: 'eq', label: 'Equal to (=)'     },
                     ]} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Threshold" name="threshold" type="number" value={ruleForm.threshold}
                     onChange={handleRuleChange} placeholder="e.g. 80" required />
              <Field label="Severity" name="severity" value={ruleForm.severity}
                     onChange={handleRuleChange} as="select"
                     options={[
                       { value: 'info',     label: 'Info'     },
                       { value: 'warning',  label: 'Warning'  },
                       { value: 'critical', label: 'Critical' },
                     ]} />
            </div>

            <Field label="Server (optional)" name="server" value={ruleForm.server}
                   onChange={handleRuleChange} as="select"
                   options={[
                     { value: '', label: 'All servers' },
                     ...servers.map(s => ({ value: s.id, label: s.name }))
                   ]} />

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={closeRuleModal}
                      className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                      style={{ background: COLOR.bg, color: COLOR.gray }}>
                Cancel
              </button>
              <button type="submit"
                      disabled={createRuleMutation.isPending || updateRuleMutation.isPending}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                      style={{ background: COLOR.red }}
                      onMouseEnter={e => e.currentTarget.style.background = COLOR.redDark}
                      onMouseLeave={e => e.currentTarget.style.background = COLOR.red}>
                {createRuleMutation.isPending || updateRuleMutation.isPending
                  ? 'Saving...'
                  : editRule ? 'Save changes' : 'Create rule'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}