import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  BarChart2, RefreshCw, CheckCircle, AlertCircle,
  TrendingUp, TrendingDown, Activity, Brain,
  ChevronDown, X, Eye, Search, Minus
} from 'lucide-react'
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts'
import { analyticsAPI, monitoringAPI } from '../../api/endpoints'

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

const SEVERITY_MAP = {
  low      : { color: COLOR.green,  bg: 'rgba(5,150,105,0.1)'  },
  medium   : { color: COLOR.orange, bg: 'rgba(217,119,6,0.1)'  },
  high     : { color: COLOR.red,    bg: 'rgba(192,39,45,0.1)'  },
  critical : { color: COLOR.red,    bg: 'rgba(192,39,45,0.15)' },
}

const STATUS_MAP = {
  open           : { color: COLOR.red,    bg: 'rgba(192,39,45,0.1)'  },
  reviewed       : { color: COLOR.blue,   bg: 'rgba(37,99,235,0.1)'  },
  resolved       : { color: COLOR.green,  bg: 'rgba(5,150,105,0.1)'  },
  false_positive : { color: COLOR.muted,  bg: 'rgba(107,114,128,0.1)'},
}

const INSIGHT_TYPE_MAP = {
  capacity    : { color: COLOR.orange, label: 'Capacity'     },
  failure     : { color: COLOR.red,    label: 'Failure Risk' },
  performance : { color: COLOR.blue,   label: 'Performance'  },
  security    : { color: COLOR.purple, label: 'Security'     },
}

function SeverityBadge({ severity }) {
  const s = SEVERITY_MAP[severity] || SEVERITY_MAP.low
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium capitalize"
          style={{ background: s.bg, color: s.color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
      {severity}
    </span>
  )
}

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || STATUS_MAP.open
  return (
    <span className="px-2.5 py-1 rounded-full text-xs font-medium capitalize"
          style={{ background: s.bg, color: s.color }}>
      {status?.replace('_', ' ')}
    </span>
  )
}

function RiskScore({ score }) {
  const color = score >= 75 ? COLOR.red : score >= 50 ? COLOR.orange : COLOR.green
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: COLOR.bg }}>
        <div className="h-full rounded-full transition-all"
             style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="text-xs font-bold w-8 text-right" style={{ color }}>{Math.round(score)}</span>
    </div>
  )
}

function TrendIcon({ direction }) {
  if (direction === 'up')     return <TrendingUp  size={14} style={{ color: COLOR.red    }} />
  if (direction === 'down')   return <TrendingDown size={14} style={{ color: COLOR.green }} />
  return <Minus size={14} style={{ color: COLOR.muted }} />
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

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl px-3 py-2 shadow-lg text-xs"
         style={{ background: COLOR.black, color: COLOR.white }}>
      <p className="font-medium mb-1" style={{ color: COLOR.gold }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  )
}

export default function AnalyticsPage() {
  const queryClient = useQueryClient()

  const [activeTab,      setActiveTab]      = useState('anomalies')
  const [search,         setSearch]         = useState('')
  const [severityFilter, setSeverityFilter] = useState('')
  const [statusFilter,   setStatusFilter]   = useState('')
  const [typeFilter,     setTypeFilter]     = useState('')
  const [viewAnomaly,    setViewAnomaly]    = useState(null)
  const [viewInsight,    setViewInsight]    = useState(null)
  const [successMsg,     setSuccessMsg]     = useState('')

  const flash = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000) }

  const { data: summary } = useQuery({
    queryKey : ['analytics-summary'],
    queryFn  : () => analyticsAPI.summary().then(r => r.data),
    refetchInterval: 30000,
  })

  const { data: anomaliesData, isLoading: loadingAnomalies, refetch } = useQuery({
    queryKey : ['anomalies', severityFilter, statusFilter],
    queryFn  : () => analyticsAPI.anomalies({
      severity : severityFilter || undefined,
      status   : statusFilter   || undefined,
    }).then(r => r.data),
    refetchInterval: 30000,
  })

  const { data: insightsData, isLoading: loadingInsights } = useQuery({
    queryKey : ['insights', typeFilter],
    queryFn  : () => analyticsAPI.insights({
      type : typeFilter || undefined,
    }).then(r => r.data),
    refetchInterval: 30000,
  })

  const { data: trendsData } = useQuery({
    queryKey : ['trends'],
    queryFn  : () => analyticsAPI.trends({ period: 'daily' }).then(r => r.data),
  })

  const { data: serversData } = useQuery({
    queryKey : ['servers-list'],
    queryFn  : () => monitoringAPI.servers().then(r => r.data),
  })

  const reviewMutation = useMutation({
    mutationFn : ({ id, status }) => analyticsAPI.reviewAnomaly(id, { status }),
    onSuccess  : () => {
      queryClient.invalidateQueries(['anomalies'])
      queryClient.invalidateQueries(['analytics-summary'])
      setViewAnomaly(null)
      flash('Anomaly reviewed.')
    },
  })

  const anomalies = anomaliesData?.results || anomaliesData || []
  const insights  = insightsData?.results  || insightsData  || []
  const trends    = trendsData?.results    || trendsData    || []
  const servers   = serversData?.results   || serversData   || []

  const filteredAnomalies = anomalies.filter(a => {
    const q = search.toLowerCase()
    return !search ||
      a.metric?.toLowerCase().includes(q) ||
      a.server_name?.toLowerCase().includes(q) ||
      a.description?.toLowerCase().includes(q)
  })

  const filteredInsights = insights.filter(i => {
    const q = search.toLowerCase()
    return !search ||
      i.title?.toLowerCase().includes(q) ||
      i.server_name?.toLowerCase().includes(q)
  })

  // Build trend chart data from trends grouped by server
  const trendChartData = (() => {
    const grouped = {}
    trends.forEach(t => {
      const key = new Date(t.recorded_at).toLocaleDateString()
      if (!grouped[key]) grouped[key] = { date: key }
      grouped[key][`${t.server_name}_${t.metric}`] = Math.round(t.avg_value)
    })
    return Object.values(grouped).slice(-14)
  })()

  const summaryCards = [
    { label: 'Total anomalies',  value: summary?.total_anomalies,    color: COLOR.gray   },
    { label: 'Open anomalies',   value: summary?.open_anomalies,     color: COLOR.red    },
    { label: 'Critical',         value: summary?.critical_anomalies, color: COLOR.red    },
    { label: 'Active insights',  value: summary?.active_insights,    color: COLOR.blue   },
    { label: 'High risk',        value: summary?.high_risk_insights, color: COLOR.orange },
    { label: 'Avg risk score',   value: summary?.avg_risk_score ? `${Math.round(summary.avg_risk_score)}%` : '—', color: COLOR.purple },
  ]

  const tabs = [
    { key: 'anomalies', label: 'Anomalies',   icon: Activity  },
    { key: 'insights',  label: 'Insights',    icon: Brain     },
    { key: 'trends',    label: 'Trends',      icon: TrendingUp },
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
          <h2 className="text-xl font-bold" style={{ color: COLOR.black }}>Predictive Analytics</h2>
          <p className="text-sm mt-0.5" style={{ color: COLOR.muted }}>
            AI-driven anomaly detection and performance insights
          </p>
        </div>
        <button onClick={() => refetch()}
                className="p-2.5 rounded-xl hover:bg-gray-200 transition-colors"
                style={{ background: COLOR.bg, color: COLOR.gray }}>
          <RefreshCw size={16} />
        </button>
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

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: COLOR.bg }}>
        {tabs.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
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

      {/* Search bar for anomalies and insights */}
      {activeTab !== 'trends' && (
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: COLOR.muted }} />
            <input type="text" placeholder={`Search ${activeTab}...`}
                   value={search} onChange={e => setSearch(e.target.value)}
                   className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
                   style={{ background: COLOR.white, border: '1px solid #E5E5E5', color: COLOR.black }}
                   onFocus={e => e.target.style.borderColor = COLOR.red}
                   onBlur={e  => e.target.style.borderColor = '#E5E5E5'} />
          </div>
          {activeTab === 'anomalies' && (
            <>
              {[
                { value: severityFilter, set: setSeverityFilter, placeholder: 'All severities', options: ['low','medium','high','critical'] },
                { value: statusFilter,   set: setStatusFilter,   placeholder: 'All statuses',   options: ['open','reviewed','resolved','false_positive'] },
              ].map(({ value, set, placeholder, options }, i) => (
                <div key={i} className="relative">
                  <select value={value} onChange={e => set(e.target.value)}
                          className="pl-3 pr-8 py-2.5 rounded-xl text-sm outline-none cursor-pointer appearance-none"
                          style={{ background: COLOR.white, border: '1px solid #E5E5E5', color: COLOR.black, minWidth: '150px' }}>
                    <option value="">{placeholder}</option>
                    {options.map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1).replace('_',' ')}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                               style={{ color: COLOR.muted }} />
                </div>
              ))}
            </>
          )}
          {activeTab === 'insights' && (
            <div className="relative">
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                      className="pl-3 pr-8 py-2.5 rounded-xl text-sm outline-none cursor-pointer appearance-none"
                      style={{ background: COLOR.white, border: '1px solid #E5E5E5', color: COLOR.black, minWidth: '150px' }}>
                <option value="">All types</option>
                {Object.entries(INSIGHT_TYPE_MAP).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                           style={{ color: COLOR.muted }} />
            </div>
          )}
        </div>
      )}

      {/* ANOMALIES TAB */}
      {activeTab === 'anomalies' && (
        <div className="rounded-2xl overflow-hidden"
             style={{ background: COLOR.white, border: '1px solid #F0F0F0' }}>
          <div className="grid grid-cols-12 gap-4 px-6 py-3 text-xs font-semibold uppercase tracking-wide"
               style={{ background: '#F9F9F9', borderBottom: '1px solid #F0F0F0', color: COLOR.muted }}>
            <div className="col-span-3">Server</div>
            <div className="col-span-2">Metric</div>
            <div className="col-span-2">Deviation</div>
            <div className="col-span-2">Severity</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-1 text-right">View</div>
          </div>

          {loadingAnomalies && (
            <div className="flex items-center justify-center py-16 gap-3" style={{ color: COLOR.muted }}>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              Analyzing anomalies...
            </div>
          )}

          {!loadingAnomalies && filteredAnomalies.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3"
                 style={{ color: COLOR.muted }}>
              <CheckCircle size={40} strokeWidth={1} style={{ color: COLOR.green }} />
              <p className="text-sm">No anomalies detected — all systems normal</p>
            </div>
          )}

          {!loadingAnomalies && filteredAnomalies.map((anomaly, idx) => (
            <div key={anomaly.id}
                 className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-gray-50 transition-colors"
                 style={{ borderBottom: idx < filteredAnomalies.length - 1 ? '1px solid #F0F0F0' : 'none' }}>
              <div className="col-span-3 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: COLOR.black }}>
                  {anomaly.server_name}
                </p>
                <p className="text-xs" style={{ color: COLOR.muted }}>
                  {new Date(anomaly.detected_at).toLocaleString()}
                </p>
              </div>
              <div className="col-span-2 text-sm capitalize" style={{ color: COLOR.gray }}>
                {anomaly.metric?.replace('_', ' ')}
              </div>
              <div className="col-span-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold" style={{
                    color: anomaly.deviation > 50 ? COLOR.red : anomaly.deviation > 20 ? COLOR.orange : COLOR.green
                  }}>
                    +{Math.round(anomaly.deviation)}%
                  </span>
                  <span className="text-xs" style={{ color: COLOR.muted }}>
                    ({Math.round(anomaly.detected_value)} vs {Math.round(anomaly.expected_value)})
                  </span>
                </div>
              </div>
              <div className="col-span-2">
                <SeverityBadge severity={anomaly.severity} />
              </div>
              <div className="col-span-2">
                <StatusBadge status={anomaly.status} />
              </div>
              <div className="col-span-1 flex justify-end">
                <button onClick={() => setViewAnomaly(anomaly)}
                        className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                        style={{ color: COLOR.blue }}>
                  <Eye size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* INSIGHTS TAB */}
      {activeTab === 'insights' && (
        <div className="space-y-3">
          {loadingInsights && (
            <div className="flex items-center justify-center py-16 gap-3" style={{ color: COLOR.muted }}>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              Loading insights...
            </div>
          )}

          {!loadingInsights && filteredInsights.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3"
                 style={{ color: COLOR.muted }}>
              <Brain size={40} strokeWidth={1} />
              <p className="text-sm">No active insights — add metric data to generate predictions</p>
            </div>
          )}

          {!loadingInsights && filteredInsights.map(insight => {
            const type = INSIGHT_TYPE_MAP[insight.insight_type] || INSIGHT_TYPE_MAP.performance
            return (
              <div key={insight.id}
                   className="rounded-2xl p-5 cursor-pointer hover:shadow-md transition-shadow"
                   style={{ background: COLOR.white, border: '1px solid #F0F0F0' }}
                   onClick={() => setViewInsight(insight)}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                         style={{ background: `${type.color}18` }}>
                      <Brain size={16} style={{ color: type.color }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded text-xs font-medium"
                              style={{ background: `${type.color}18`, color: type.color }}>
                          {type.label}
                        </span>
                        <span className="text-xs" style={{ color: COLOR.muted }}>
                          {insight.server_name}
                        </span>
                      </div>
                      <p className="text-sm font-semibold" style={{ color: COLOR.black }}>
                        {insight.title}
                      </p>
                      <p className="text-xs mt-1 line-clamp-2" style={{ color: COLOR.muted }}>
                        {insight.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex-shrink-0 w-32">
                    <p className="text-xs mb-1" style={{ color: COLOR.muted }}>Risk score</p>
                    <RiskScore score={insight.risk_score} />
                    <p className="text-xs mt-1" style={{ color: COLOR.muted }}>
                      Confidence: {Math.round(insight.confidence)}%
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* TRENDS TAB */}
      {activeTab === 'trends' && (
        <div className="space-y-4">
          {trends.length === 0 ? (
            <div className="rounded-2xl p-12 flex flex-col items-center gap-3"
                 style={{ background: COLOR.white, border: '1px solid #F0F0F0', color: COLOR.muted }}>
              <TrendingUp size={40} strokeWidth={1} />
              <p className="text-sm">No trend data yet — metrics are collected over time</p>
              <p className="text-xs text-center max-w-sm">
                Keep the monitoring agents running. Trend data appears after performance snapshots are recorded.
              </p>
            </div>
          ) : (
            <>
              {/* Trend chart */}
              <div className="rounded-2xl p-5"
                   style={{ background: COLOR.white, border: '1px solid #F0F0F0' }}>
                <p className="text-sm font-bold mb-4" style={{ color: COLOR.black }}>
                  Performance trends (last 14 days)
                </p>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={trendChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: COLOR.muted }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: COLOR.muted }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    {Object.keys(trendChartData[0] || {}).filter(k => k !== 'date').map((key, i) => (
                      <Line key={key} type="monotone" dataKey={key}
                            stroke={[COLOR.red, COLOR.blue, COLOR.green, COLOR.orange, COLOR.purple][i % 5]}
                            strokeWidth={2} dot={false} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Trends table */}
              <div className="rounded-2xl overflow-hidden"
                   style={{ background: COLOR.white, border: '1px solid #F0F0F0' }}>
                <div className="grid grid-cols-12 gap-4 px-6 py-3 text-xs font-semibold uppercase tracking-wide"
                     style={{ background: '#F9F9F9', borderBottom: '1px solid #F0F0F0', color: COLOR.muted }}>
                  <div className="col-span-3">Server</div>
                  <div className="col-span-2">Metric</div>
                  <div className="col-span-2">Period</div>
                  <div className="col-span-2">Avg</div>
                  <div className="col-span-2">Max</div>
                  <div className="col-span-1">Trend</div>
                </div>
                {trends.slice(0, 20).map((trend, idx) => (
                  <div key={trend.id}
                       className="grid grid-cols-12 gap-4 px-6 py-3 items-center hover:bg-gray-50 transition-colors"
                       style={{ borderBottom: idx < Math.min(trends.length, 20) - 1 ? '1px solid #F0F0F0' : 'none' }}>
                    <div className="col-span-3 text-sm font-medium truncate" style={{ color: COLOR.black }}>
                      {trend.server_name}
                    </div>
                    <div className="col-span-2 text-sm capitalize" style={{ color: COLOR.gray }}>
                      {trend.metric?.replace('_', ' ')}
                    </div>
                    <div className="col-span-2 text-sm capitalize" style={{ color: COLOR.gray }}>
                      {trend.period}
                    </div>
                    <div className="col-span-2 text-sm font-medium" style={{ color: COLOR.black }}>
                      {Math.round(trend.avg_value)}%
                    </div>
                    <div className="col-span-2 text-sm" style={{ color: COLOR.muted }}>
                      {Math.round(trend.max_value)}%
                    </div>
                    <div className="col-span-1">
                      <TrendIcon direction={trend.trend_direction} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Anomaly Detail Modal */}
      {viewAnomaly && (
        <Modal title="Anomaly details" onClose={() => setViewAnomaly(null)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 p-4 rounded-xl text-sm"
                 style={{ background: COLOR.bg }}>
              {[
                { label: 'Server',         value: viewAnomaly.server_name                          },
                { label: 'Metric',         value: viewAnomaly.metric?.replace('_', ' ')            },
                { label: 'Detected value', value: `${Math.round(viewAnomaly.detected_value)}%`    },
                { label: 'Expected value', value: `${Math.round(viewAnomaly.expected_value)}%`    },
                { label: 'Deviation',      value: `+${Math.round(viewAnomaly.deviation)}%`         },
                { label: 'Detected at',    value: new Date(viewAnomaly.detected_at).toLocaleString() },
              ].map(({ label, value }) => (
                <div key={label}>
                  <span style={{ color: COLOR.muted }}>{label}: </span>
                  <span className="font-medium capitalize" style={{ color: COLOR.black }}>{value}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <SeverityBadge severity={viewAnomaly.severity} />
              <StatusBadge   status={viewAnomaly.status}     />
            </div>

            {viewAnomaly.description && (
              <p className="text-sm p-3 rounded-xl" style={{ background: COLOR.bg, color: COLOR.gray }}>
                {viewAnomaly.description}
              </p>
            )}

            {viewAnomaly.recommendation && (
              <div className="p-3 rounded-xl"
                   style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)' }}>
                <p className="text-xs font-semibold mb-1" style={{ color: COLOR.blue }}>Recommendation</p>
                <p className="text-sm" style={{ color: COLOR.black }}>{viewAnomaly.recommendation}</p>
              </div>
            )}

            {viewAnomaly.status === 'open' && (
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => reviewMutation.mutate({ id: viewAnomaly.id, status: 'false_positive' })}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                  style={{ background: COLOR.bg, color: COLOR.gray }}>
                  False positive
                </button>
                <button
                  onClick={() => reviewMutation.mutate({ id: viewAnomaly.id, status: 'reviewed' })}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                  style={{ background: 'rgba(37,99,235,0.1)', color: COLOR.blue }}>
                  Mark reviewed
                </button>
                <button
                  onClick={() => reviewMutation.mutate({ id: viewAnomaly.id, status: 'resolved' })}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                  style={{ background: COLOR.green }}>
                  Resolve
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Insight Detail Modal */}
      {viewInsight && (
        <Modal title="Predictive insight" onClose={() => setViewInsight(null)}>
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                {(() => {
                  const type = INSIGHT_TYPE_MAP[viewInsight.insight_type] || INSIGHT_TYPE_MAP.performance
                  return (
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium"
                          style={{ background: `${type.color}18`, color: type.color }}>
                      {type.label}
                    </span>
                  )
                })()}
                <span className="text-sm" style={{ color: COLOR.muted }}>{viewInsight.server_name}</span>
              </div>
              <h4 className="font-bold text-base mb-2" style={{ color: COLOR.black }}>{viewInsight.title}</h4>
              <p className="text-sm leading-relaxed" style={{ color: COLOR.gray }}>{viewInsight.description}</p>
            </div>

            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: COLOR.muted }}>Risk score</p>
              <RiskScore score={viewInsight.risk_score} />
              <p className="text-xs mt-1" style={{ color: COLOR.muted }}>
                Confidence: {Math.round(viewInsight.confidence)}%
              </p>
            </div>

            {viewInsight.recommendation && (
              <div className="p-3 rounded-xl"
                   style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)' }}>
                <p className="text-xs font-semibold mb-1" style={{ color: COLOR.blue }}>Recommended action</p>
                <p className="text-sm" style={{ color: COLOR.black }}>{viewInsight.recommendation}</p>
              </div>
            )}

            {viewInsight.predicted_date && (
              <p className="text-xs" style={{ color: COLOR.muted }}>
                Predicted occurrence: {new Date(viewInsight.predicted_date).toLocaleString()}
              </p>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}