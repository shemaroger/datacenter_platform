import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Shield, Plus, Search, RefreshCw, Eye, X,
  CheckCircle, XCircle, AlertCircle, Clock,
  ChevronDown, ChevronLeft, ChevronRight,
  FileCheck, AlertTriangle, BookOpen
} from 'lucide-react'
import { complianceAPI } from '../../api/endpoints'

const COLOR = {
  red      : '#C0272D',
  redDark  : '#9B1C21',
  redLight : 'rgba(192,39,45,0.1)',
  black    : '#1A1A1A',
  gray     : '#3D3D3D',
  muted    : '#9B9B9B',
  white    : '#FFFFFF',
  bg       : '#F0F0F0',
  bgCard   : '#F9F9F9',
  border   : '#F0F0F0',
  green    : '#059669',
  blue     : '#2563EB',
  orange   : '#D97706',
  purple   : '#7C3AED',
}

const ITEMS_PER_PAGE = 10

const STANDARD_CONFIG = {
  iso27001 : { color: COLOR.blue,   label: 'ISO 27001' },
  soc2     : { color: COLOR.purple, label: 'SOC 2'     },
  gdpr     : { color: COLOR.green,  label: 'GDPR'      },
  hipaa    : { color: COLOR.orange, label: 'HIPAA'     },
  pci_dss  : { color: COLOR.red,    label: 'PCI DSS'   },
  custom   : { color: COLOR.muted,  label: 'Custom'    },
}

const POLICY_STATUS_CONFIG = {
  active   : { bg: 'rgba(5,150,105,0.1)',  color: COLOR.green,  label: 'Active'   },
  inactive : { bg: 'rgba(107,114,128,0.1)', color: COLOR.muted, label: 'Inactive' },
  draft    : { bg: 'rgba(217,119,6,0.1)',  color: COLOR.orange, label: 'Draft'    },
}

const CHECK_RESULT_CONFIG = {
  passed  : { bg: 'rgba(5,150,105,0.1)',  color: COLOR.green,  icon: CheckCircle,  label: 'Passed'  },
  failed  : { bg: 'rgba(192,39,45,0.1)',  color: COLOR.red,    icon: XCircle,      label: 'Failed'  },
  warning : { bg: 'rgba(217,119,6,0.1)',  color: COLOR.orange, icon: AlertTriangle, label: 'Warning' },
  skipped : { bg: 'rgba(107,114,128,0.1)', color: COLOR.muted, icon: Clock,         label: 'Skipped' },
}

const VIOLATION_SEVERITY_CONFIG = {
  low      : { bg: 'rgba(5,150,105,0.1)',  color: COLOR.green,  label: 'Low'      },
  medium   : { bg: 'rgba(217,119,6,0.1)',  color: COLOR.orange, label: 'Medium'   },
  high     : { bg: 'rgba(192,39,45,0.1)',  color: COLOR.red,    label: 'High'     },
  critical : { bg: 'rgba(192,39,45,0.15)', color: COLOR.red,    label: 'Critical' },
}

function StandardBadge({ standard }) {
  const c = STANDARD_CONFIG[standard] || STANDARD_CONFIG.custom
  return (
    <span className="px-2.5 py-1 rounded-full text-xs font-bold"
          style={{ background: `${c.color}18`, color: c.color }}>
      {c.label}
    </span>
  )
}

function StatusBadge({ status, config }) {
  const c = config[status] || Object.values(config)[0]
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium capitalize"
          style={{ background: c.bg, color: c.color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.color }} />
      {c.label}
    </span>
  )
}

function CheckResultBadge({ result }) {
  const c = CHECK_RESULT_CONFIG[result] || CHECK_RESULT_CONFIG.skipped
  const Icon = c.icon
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
          style={{ background: c.bg, color: c.color }}>
      <Icon size={11} /> {c.label}
    </span>
  )
}

function ComplianceRate({ rate }) {
  const color = rate >= 80 ? COLOR.green : rate >= 60 ? COLOR.orange : COLOR.red
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: COLOR.bg }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${rate}%`, background: color }} />
      </div>
      <span className="text-sm font-bold w-12" style={{ color }}>{rate}%</span>
    </div>
  )
}

function StatsCard({ title, value, icon: Icon, color }) {
  return (
    <div className="rounded-2xl p-5 flex flex-col gap-3"
         style={{ background: COLOR.white, border: `1px solid ${COLOR.border}` }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center"
           style={{ background: `${color}18` }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div>
        <p className="text-2xl font-bold" style={{ color: COLOR.black }}>{value ?? '—'}</p>
        <p className="text-sm mt-0.5" style={{ color: COLOR.muted }}>{title}</p>
      </div>
    </div>
  )
}

function Modal({ title, onClose, wide, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
         style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className={`w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} rounded-2xl shadow-2xl my-4`}
           style={{ background: COLOR.white, border: `1px solid ${COLOR.border}` }}>
        <div className="flex items-center justify-between px-6 py-4"
             style={{ borderBottom: `1px solid ${COLOR.border}` }}>
          <h3 className="font-bold text-base" style={{ color: COLOR.black }}>{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
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
        <textarea name={name} value={value} onChange={onChange} placeholder={placeholder}
                  rows={rows || 3} className={`${cls} resize-none`} style={style}
                  onFocus={focus} onBlur={blur} />
      ) : (
        <input type={type} name={name} value={value} onChange={onChange}
               placeholder={placeholder} required={required}
               className={cls} style={style} onFocus={focus} onBlur={blur} />
      )}
    </div>
  )
}

const emptyPolicy = { name: '', description: '', standard: 'custom', version: '1.0' }
const emptyCheck  = { title: '', description: '', result: 'skipped', evidence: '', notes: '' }

export default function CompliancePage() {
  const queryClient = useQueryClient()

  const [activeTab,        setActiveTab]        = useState('policies')
  const [search,           setSearch]           = useState('')
  const [standardFilter,   setStandardFilter]   = useState('')
  const [statusFilter,     setStatusFilter]     = useState('')
  const [severityFilter,   setSeverityFilter]   = useState('')
  const [currentPage,      setCurrentPage]      = useState(1)
  const [showPolicyModal,  setShowPolicyModal]  = useState(false)
  const [showCheckModal,   setShowCheckModal]   = useState(false)
  const [viewPolicy,       setViewPolicy]       = useState(null)
  const [selectedPolicy,   setSelectedPolicy]   = useState(null)
  const [policyForm,       setPolicyForm]       = useState(emptyPolicy)
  const [checkForm,        setCheckForm]        = useState(emptyCheck)
  const [formError,        setFormError]        = useState('')
  const [successMsg,       setSuccessMsg]       = useState('')

  const flash = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000) }

  const { data: summary } = useQuery({
    queryKey : ['compliance-summary'],
    queryFn  : () => complianceAPI.summary().then(r => r.data),
    refetchInterval: 30000,
  })

  const { data: policiesData, isLoading: loadingPolicies, refetch } = useQuery({
    queryKey : ['policies', standardFilter, statusFilter],
    queryFn  : () => complianceAPI.policies({
      standard : standardFilter || undefined,
      status   : statusFilter   || undefined,
    }).then(r => r.data),
  })

  const { data: checksData, isLoading: loadingChecks } = useQuery({
    queryKey : ['checks', selectedPolicy?.id],
    queryFn  : () => complianceAPI.checks(selectedPolicy.id).then(r => r.data),
    enabled  : !!selectedPolicy,
  })

  const { data: violationsData, isLoading: loadingViolations } = useQuery({
    queryKey : ['violations', severityFilter],
    queryFn  : () => complianceAPI.violations({
      severity : severityFilter || undefined,
    }).then(r => r.data),
  })

  const createPolicyMutation = useMutation({
    mutationFn : (d) => complianceAPI.createPolicy(d),
    onSuccess  : () => {
      queryClient.invalidateQueries(['policies'])
      queryClient.invalidateQueries(['compliance-summary'])
      setShowPolicyModal(false)
      setPolicyForm(emptyPolicy)
      flash('Policy created.')
    },
    onError: (err) => setFormError(err.response?.data ? Object.values(err.response.data).flat().join(' ') : 'Failed.'),
  })

  const addCheckMutation = useMutation({
    mutationFn : ({ policyId, data }) => complianceAPI.addCheck(policyId, data),
    onSuccess  : () => {
      queryClient.invalidateQueries(['checks', selectedPolicy?.id])
      queryClient.invalidateQueries(['compliance-summary'])
      setShowCheckModal(false)
      setCheckForm(emptyCheck)
      flash('Check added.')
    },
    onError: (err) => setFormError(err.response?.data ? Object.values(err.response.data).flat().join(' ') : 'Failed.'),
  })

  const resolveViolationMutation = useMutation({
    mutationFn : (id) => complianceAPI.resolveViolation(id),
    onSuccess  : () => {
      queryClient.invalidateQueries(['violations'])
      queryClient.invalidateQueries(['compliance-summary'])
      flash('Violation resolved.')
    },
  })

  const policies   = policiesData?.results   || policiesData   || []
  const checks     = checksData?.results     || checksData     || []
  const violations = violationsData?.results || violationsData || []

  const filteredPolicies = policies.filter(p => {
    const q = search.toLowerCase()
    return !search || p.name?.toLowerCase().includes(q) || p.standard?.toLowerCase().includes(q)
  })

  const filteredViolations = violations.filter(v => {
    const q = search.toLowerCase()
    return !search || v.title?.toLowerCase().includes(q) || v.description?.toLowerCase().includes(q)
  })

  const activeList  = activeTab === 'violations' ? filteredViolations : filteredPolicies
  const totalItems  = activeList.length
  const totalPages  = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1
  const startItem   = totalItems === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1
  const endItem     = Math.min(currentPage * ITEMS_PER_PAGE, totalItems)
  const paginated   = activeList.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  const getPageNumbers = () => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1)
    if (currentPage <= 3) return [1, 2, 3, 4, '...', totalPages]
    if (currentPage >= totalPages - 2) return [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages]
  }

  const statsCards = [
    { title: 'Total policies',    value: summary?.total_policies,     icon: BookOpen,    color: COLOR.gray   },
    { title: 'Active policies',   value: summary?.active_policies,    icon: Shield,      color: COLOR.green  },
    { title: 'Total checks',      value: summary?.total_checks,       icon: FileCheck,   color: COLOR.blue   },
    { title: 'Passed checks',     value: summary?.passed_checks,      icon: CheckCircle, color: COLOR.green  },
    { title: 'Open violations',   value: summary?.open_violations,    icon: AlertCircle, color: COLOR.red    },
    { title: 'Compliance rate',   value: summary ? `${summary.compliance_rate}%` : '—', icon: Shield, color: summary?.compliance_rate >= 80 ? COLOR.green : COLOR.red },
  ]

  const tabs = [
    { key: 'policies',   label: 'Policies',   icon: Shield       },
    { key: 'violations', label: 'Violations', icon: AlertTriangle },
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
          <h2 className="text-xl font-bold" style={{ color: COLOR.black }}>Compliance & Policy</h2>
          <p className="text-sm mt-0.5" style={{ color: COLOR.muted }}>
            Manage policies, compliance checks, and violations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()}
                  className="p-2.5 rounded-xl hover:bg-gray-200 transition-colors"
                  style={{ background: COLOR.bg, color: COLOR.gray }}>
            <RefreshCw size={16} />
          </button>
          <button onClick={() => { setPolicyForm(emptyPolicy); setFormError(''); setShowPolicyModal(true) }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
                  style={{ background: COLOR.red }}
                  onMouseEnter={e => e.currentTarget.style.background = COLOR.redDark}
                  onMouseLeave={e => e.currentTarget.style.background = COLOR.red}>
            <Plus size={16} /> Add policy
          </button>
        </div>
      </div>

      {/* Compliance rate highlight */}
      {summary && (
        <div className="rounded-2xl p-5"
             style={{ background: COLOR.white, border: `1px solid ${COLOR.border}` }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold" style={{ color: COLOR.black }}>Overall compliance rate</p>
            <span className="text-xs" style={{ color: COLOR.muted }}>
              {summary.passed_checks} / {summary.total_checks} checks passed
            </span>
          </div>
          <ComplianceRate rate={summary.compliance_rate} />
          {summary.critical_violations > 0 && (
            <p className="text-xs mt-2 flex items-center gap-1" style={{ color: COLOR.red }}>
              <AlertCircle size={12} />
              {summary.critical_violations} critical violation{summary.critical_violations > 1 ? 's' : ''} require immediate attention
            </p>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statsCards.map(c => <StatsCard key={c.title} {...c} />)}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: COLOR.bg }}>
        {tabs.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => { setActiveTab(key); setCurrentPage(1); setSearch('') }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background : activeTab === key ? COLOR.white : 'transparent',
                    color      : activeTab === key ? COLOR.black  : COLOR.muted,
                    boxShadow  : activeTab === key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  }}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="rounded-2xl p-4"
           style={{ background: COLOR.white, border: `1px solid ${COLOR.border}` }}>
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: COLOR.muted }} />
            <input type="text" value={search}
                   onChange={e => { setSearch(e.target.value); setCurrentPage(1) }}
                   placeholder={`Search ${activeTab}...`}
                   className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
                   style={{ background: COLOR.bg, border: '1px solid #E5E5E5', color: COLOR.black }}
                   onFocus={e => e.target.style.borderColor = COLOR.red}
                   onBlur={e  => e.target.style.borderColor = '#E5E5E5'} />
          </div>
          {activeTab === 'policies' && (
            <>
              <div className="relative">
                <select value={standardFilter} onChange={e => { setStandardFilter(e.target.value); setCurrentPage(1) }}
                        className="pl-3 pr-8 py-2.5 rounded-xl text-sm outline-none cursor-pointer appearance-none"
                        style={{ background: COLOR.bg, border: '1px solid #E5E5E5', color: COLOR.black, minWidth: '150px' }}>
                  <option value="">All standards</option>
                  {Object.entries(STANDARD_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: COLOR.muted }} />
              </div>
              <div className="relative">
                <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1) }}
                        className="pl-3 pr-8 py-2.5 rounded-xl text-sm outline-none cursor-pointer appearance-none"
                        style={{ background: COLOR.bg, border: '1px solid #E5E5E5', color: COLOR.black, minWidth: '150px' }}>
                  <option value="">All statuses</option>
                  {Object.entries(POLICY_STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: COLOR.muted }} />
              </div>
            </>
          )}
          {activeTab === 'violations' && (
            <div className="relative">
              <select value={severityFilter} onChange={e => { setSeverityFilter(e.target.value); setCurrentPage(1) }}
                      className="pl-3 pr-8 py-2.5 rounded-xl text-sm outline-none cursor-pointer appearance-none"
                      style={{ background: COLOR.bg, border: '1px solid #E5E5E5', color: COLOR.black, minWidth: '150px' }}>
                <option value="">All severities</option>
                {Object.entries(VIOLATION_SEVERITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: COLOR.muted }} />
            </div>
          )}
          <span className="text-sm whitespace-nowrap" style={{ color: COLOR.muted }}>
            {totalItems} result{totalItems !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* POLICIES TABLE */}
      {activeTab === 'policies' && (
        <div className="rounded-2xl overflow-hidden"
             style={{ background: COLOR.white, border: `1px solid ${COLOR.border}` }}>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr style={{ background: COLOR.bgCard, borderBottom: `1px solid ${COLOR.border}` }}>
                  {['Policy name', 'Standard', 'Version', 'Status', 'Checks', 'Compliance', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                        style={{ color: COLOR.muted }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loadingPolicies ? (
                  <tr><td colSpan="7" className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3" style={{ color: COLOR.muted }}>
                      <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                      Loading policies...
                    </div>
                  </td></tr>
                ) : paginated.length === 0 ? (
                  <tr><td colSpan="7" className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3" style={{ color: COLOR.muted }}>
                      <Shield size={48} strokeWidth={1} />
                      <p className="font-medium" style={{ color: COLOR.gray }}>No policies found</p>
                      <button onClick={() => setShowPolicyModal(true)}
                              className="text-sm font-medium px-4 py-2 rounded-xl text-white mt-1"
                              style={{ background: COLOR.red }}>
                        Create first policy
                      </button>
                    </div>
                  </td></tr>
                ) : (
                  paginated.map((policy, idx) => {
                    const total  = policy.total_checks  || 0
                    const passed = policy.passed_checks || 0
                    const rate   = total > 0 ? Math.round((passed / total) * 100) : 0
                    return (
                      <tr key={policy.id}
                          className="hover:bg-gray-50 transition-colors"
                          style={{ borderBottom: idx < paginated.length - 1 ? `1px solid ${COLOR.border}` : 'none' }}>
                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold" style={{ color: COLOR.black }}>{policy.name}</p>
                          <p className="text-xs mt-0.5" style={{ color: COLOR.muted }}>v{policy.version}</p>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <StandardBadge standard={policy.standard} />
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="text-sm" style={{ color: COLOR.gray }}>v{policy.version}</span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <StatusBadge status={policy.status} config={POLICY_STATUS_CONFIG} />
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium" style={{ color: COLOR.black }}>
                            {passed}/{total}
                          </span>
                        </td>
                        <td className="px-5 py-4" style={{ minWidth: '140px' }}>
                          <ComplianceRate rate={rate} />
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <button onClick={() => setViewPolicy(policy)}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium"
                                    style={{ background: 'rgba(37,99,235,0.1)', color: COLOR.blue }}>
                              <Eye size={13} /> View
                            </button>
                            <button onClick={() => { setSelectedPolicy(policy); setShowCheckModal(true); setCheckForm(emptyCheck); setFormError('') }}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium"
                                    style={{ background: COLOR.redLight, color: COLOR.red }}>
                              <Plus size={13} /> Check
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {totalItems > 0 && (
            <div className="px-5 py-3 flex flex-col sm:flex-row items-center justify-between gap-4"
                 style={{ borderTop: `1px solid ${COLOR.border}`, background: COLOR.bgCard }}>
              <p className="text-sm" style={{ color: COLOR.muted }}>
                Showing <span className="font-medium" style={{ color: COLOR.black }}>{startItem}</span> to{' '}
                <span className="font-medium" style={{ color: COLOR.black }}>{endItem}</span> of{' '}
                <span className="font-medium" style={{ color: COLOR.black }}>{totalItems}</span> policies
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                        className="p-2 rounded-lg transition-colors disabled:opacity-40" style={{ color: COLOR.gray }}>
                  <ChevronLeft size={16} />
                </button>
                {getPageNumbers().map((page, i) => (
                  <button key={i} onClick={() => typeof page === 'number' && setCurrentPage(page)}
                          disabled={page === '...'}
                          className="w-8 h-8 rounded-lg text-sm font-medium transition-colors"
                          style={{
                            background : currentPage === page ? COLOR.red   : 'transparent',
                            color      : currentPage === page ? COLOR.white : page === '...' ? COLOR.muted : COLOR.gray,
                            cursor     : page === '...' ? 'default' : 'pointer',
                          }}>
                    {page}
                  </button>
                ))}
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                        className="p-2 rounded-lg transition-colors disabled:opacity-40" style={{ color: COLOR.gray }}>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIOLATIONS TABLE */}
      {activeTab === 'violations' && (
        <div className="rounded-2xl overflow-hidden"
             style={{ background: COLOR.white, border: `1px solid ${COLOR.border}` }}>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr style={{ background: COLOR.bgCard, borderBottom: `1px solid ${COLOR.border}` }}>
                  {['Violation', 'Policy', 'Severity', 'Status', 'Detected', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                        style={{ color: COLOR.muted }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loadingViolations ? (
                  <tr><td colSpan="6" className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3" style={{ color: COLOR.muted }}>
                      <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                      Loading violations...
                    </div>
                  </td></tr>
                ) : paginated.length === 0 ? (
                  <tr><td colSpan="6" className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3" style={{ color: COLOR.muted }}>
                      <CheckCircle size={48} strokeWidth={1} style={{ color: COLOR.green }} />
                      <p className="font-medium" style={{ color: COLOR.gray }}>No violations found</p>
                      <p className="text-sm">All policies are being followed</p>
                    </div>
                  </td></tr>
                ) : (
                  paginated.map((v, idx) => {
                    const sc = VIOLATION_SEVERITY_CONFIG[v.severity] || VIOLATION_SEVERITY_CONFIG.low
                    return (
                      <tr key={v.id}
                          className="hover:bg-gray-50 transition-colors"
                          style={{ borderBottom: idx < paginated.length - 1 ? `1px solid ${COLOR.border}` : 'none' }}>
                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold" style={{ color: COLOR.black }}>{v.title}</p>
                          <p className="text-xs mt-0.5 truncate max-w-xs" style={{ color: COLOR.muted }}>{v.description}</p>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="text-sm" style={{ color: COLOR.gray }}>
                            {policies.find(p => p.id === v.policy)?.name || `Policy #${v.policy}`}
                          </span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium capitalize"
                                style={{ background: sc.bg, color: sc.color }}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: sc.color }} />
                            {sc.label}
                          </span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium capitalize"
                                style={{
                                  background: v.status === 'resolved' ? 'rgba(5,150,105,0.1)' : v.status === 'accepted' ? 'rgba(217,119,6,0.1)' : 'rgba(192,39,45,0.1)',
                                  color: v.status === 'resolved' ? COLOR.green : v.status === 'accepted' ? COLOR.orange : COLOR.red,
                                }}>
                            {v.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="text-sm" style={{ color: COLOR.muted }}>
                            {new Date(v.detected_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          {v.status === 'open' && (
                            <button onClick={() => resolveViolationMutation.mutate(v.id)}
                                    disabled={resolveViolationMutation.isPending}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium"
                                    style={{ background: 'rgba(5,150,105,0.1)', color: COLOR.green }}>
                              <CheckCircle size={13} /> Resolve
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {totalItems > 0 && (
            <div className="px-5 py-3 flex flex-col sm:flex-row items-center justify-between gap-4"
                 style={{ borderTop: `1px solid ${COLOR.border}`, background: COLOR.bgCard }}>
              <p className="text-sm" style={{ color: COLOR.muted }}>
                Showing <span className="font-medium" style={{ color: COLOR.black }}>{startItem}</span> to{' '}
                <span className="font-medium" style={{ color: COLOR.black }}>{endItem}</span> of{' '}
                <span className="font-medium" style={{ color: COLOR.black }}>{totalItems}</span> violations
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                        className="p-2 rounded-lg transition-colors disabled:opacity-40" style={{ color: COLOR.gray }}>
                  <ChevronLeft size={16} />
                </button>
                {getPageNumbers().map((page, i) => (
                  <button key={i} onClick={() => typeof page === 'number' && setCurrentPage(page)}
                          disabled={page === '...'}
                          className="w-8 h-8 rounded-lg text-sm font-medium transition-colors"
                          style={{
                            background : currentPage === page ? COLOR.red   : 'transparent',
                            color      : currentPage === page ? COLOR.white : page === '...' ? COLOR.muted : COLOR.gray,
                            cursor     : page === '...' ? 'default' : 'pointer',
                          }}>
                    {page}
                  </button>
                ))}
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                        className="p-2 rounded-lg transition-colors disabled:opacity-40" style={{ color: COLOR.gray }}>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Policy Detail Modal */}
      {viewPolicy && (
        <Modal title="Policy details" onClose={() => setViewPolicy(null)} wide>
          <div className="space-y-4">
            <div className="flex items-start justify-between p-4 rounded-xl" style={{ background: COLOR.bg }}>
              <div>
                <p className="font-bold text-base" style={{ color: COLOR.black }}>{viewPolicy.name}</p>
                <p className="text-xs mt-0.5" style={{ color: COLOR.muted }}>Version {viewPolicy.version}</p>
              </div>
              <div className="flex items-center gap-2">
                <StandardBadge standard={viewPolicy.standard} />
                <StatusBadge status={viewPolicy.status} config={POLICY_STATUS_CONFIG} />
              </div>
            </div>

            {viewPolicy.description && (
              <p className="text-sm leading-relaxed" style={{ color: COLOR.gray }}>{viewPolicy.description}</p>
            )}

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Total checks',  value: viewPolicy.total_checks  || 0 },
                { label: 'Passed checks', value: viewPolicy.passed_checks || 0 },
                { label: 'Created',       value: new Date(viewPolicy.created_at).toLocaleDateString() },
                { label: 'Created by',    value: viewPolicy.created_by_username || '—' },
              ].map(({ label, value }) => (
                <div key={label} className="p-3 rounded-xl" style={{ background: COLOR.bg }}>
                  <p className="text-xs font-medium" style={{ color: COLOR.muted }}>{label}</p>
                  <p className="text-sm font-semibold mt-0.5" style={{ color: COLOR.black }}>{value}</p>
                </div>
              ))}
            </div>

            {/* Compliance rate */}
            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: COLOR.muted }}>Compliance rate</p>
              <ComplianceRate rate={viewPolicy.total_checks > 0
                ? Math.round((viewPolicy.passed_checks / viewPolicy.total_checks) * 100) : 0} />
            </div>

            {/* Checks list */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: COLOR.muted }}>
                  Checks ({checks.length})
                </p>
                <button onClick={() => { setSelectedPolicy(viewPolicy); setShowCheckModal(true); setCheckForm(emptyCheck); setFormError('') }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium"
                        style={{ background: COLOR.redLight, color: COLOR.red }}>
                  <Plus size={12} /> Add check
                </button>
              </div>
              {checks.length === 0 ? (
                <p className="text-sm text-center py-4" style={{ color: COLOR.muted }}>No checks yet</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {checks.map(check => (
                    <div key={check.id}
                         className="flex items-start justify-between gap-3 p-3 rounded-xl"
                         style={{ background: COLOR.bg }}>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate" style={{ color: COLOR.black }}>{check.title}</p>
                        {check.description && (
                          <p className="text-xs mt-0.5 truncate" style={{ color: COLOR.muted }}>{check.description}</p>
                        )}
                      </div>
                      <CheckResultBadge result={check.result} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Create Policy Modal */}
      {showPolicyModal && (
        <Modal title="Create compliance policy" onClose={() => { setShowPolicyModal(false); setPolicyForm(emptyPolicy); setFormError('') }}>
          <form onSubmit={(e) => { e.preventDefault(); createPolicyMutation.mutate(policyForm) }}
                className="space-y-4">
            {formError && (
              <div className="flex items-start gap-2 p-3 rounded-xl text-sm"
                   style={{ background: 'rgba(192,39,45,0.08)', color: COLOR.red, border: '1px solid rgba(192,39,45,0.2)' }}>
                <AlertCircle size={15} className="flex-shrink-0 mt-0.5" /> {formError}
              </div>
            )}
            <Field label="Policy name" name="name" value={policyForm.name}
                   onChange={e => setPolicyForm({ ...policyForm, name: e.target.value })}
                   placeholder="e.g. Data Protection Policy" required />
            <Field label="Description" name="description" value={policyForm.description || ''}
                   onChange={e => setPolicyForm({ ...policyForm, description: e.target.value })}
                   as="textarea" placeholder="Describe this policy..." rows={3} />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Standard" name="standard" value={policyForm.standard}
                     onChange={e => setPolicyForm({ ...policyForm, standard: e.target.value })}
                     as="select" options={Object.entries(STANDARD_CONFIG).map(([k, v]) => ({ value: k, label: v.label }))} />
              <Field label="Version" name="version" value={policyForm.version}
                     onChange={e => setPolicyForm({ ...policyForm, version: e.target.value })}
                     placeholder="1.0" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => { setShowPolicyModal(false); setPolicyForm(emptyPolicy) }}
                      className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                      style={{ background: COLOR.bg, color: COLOR.gray }}>
                Cancel
              </button>
              <button type="submit" disabled={createPolicyMutation.isPending}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                      style={{ background: COLOR.red }}
                      onMouseEnter={e => e.currentTarget.style.background = COLOR.redDark}
                      onMouseLeave={e => e.currentTarget.style.background = COLOR.red}>
                {createPolicyMutation.isPending ? 'Creating...' : 'Create policy'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add Check Modal */}
      {showCheckModal && selectedPolicy && (
        <Modal title={`Add check — ${selectedPolicy.name}`}
               onClose={() => { setShowCheckModal(false); setCheckForm(emptyCheck); setFormError('') }}>
          <form onSubmit={(e) => { e.preventDefault(); addCheckMutation.mutate({ policyId: selectedPolicy.id, data: checkForm }) }}
                className="space-y-4">
            {formError && (
              <div className="flex items-start gap-2 p-3 rounded-xl text-sm"
                   style={{ background: 'rgba(192,39,45,0.08)', color: COLOR.red, border: '1px solid rgba(192,39,45,0.2)' }}>
                <AlertCircle size={15} className="flex-shrink-0 mt-0.5" /> {formError}
              </div>
            )}
            <Field label="Check title" name="title" value={checkForm.title}
                   onChange={e => setCheckForm({ ...checkForm, title: e.target.value })}
                   placeholder="e.g. Encryption at rest enabled" required />
            <Field label="Description" name="description" value={checkForm.description || ''}
                   onChange={e => setCheckForm({ ...checkForm, description: e.target.value })}
                   as="textarea" placeholder="Describe what this check verifies..." rows={2} />
            <Field label="Result" name="result" value={checkForm.result}
                   onChange={e => setCheckForm({ ...checkForm, result: e.target.value })}
                   as="select" options={Object.entries(CHECK_RESULT_CONFIG).map(([k, v]) => ({ value: k, label: v.label }))} />
            <Field label="Evidence" name="evidence" value={checkForm.evidence || ''}
                   onChange={e => setCheckForm({ ...checkForm, evidence: e.target.value })}
                   as="textarea" placeholder="Provide evidence for this check result..." rows={2} />
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => { setShowCheckModal(false); setCheckForm(emptyCheck) }}
                      className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                      style={{ background: COLOR.bg, color: COLOR.gray }}>
                Cancel
              </button>
              <button type="submit" disabled={addCheckMutation.isPending}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                      style={{ background: COLOR.red }}
                      onMouseEnter={e => e.currentTarget.style.background = COLOR.redDark}
                      onMouseLeave={e => e.currentTarget.style.background = COLOR.red}>
                {addCheckMutation.isPending ? 'Adding...' : 'Add check'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}