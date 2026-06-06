import { useQuery } from '@tanstack/react-query'
import {
  Server, Bell, AlertTriangle, Zap, Activity,
  TrendingUp, TrendingDown, CheckCircle, XCircle,
  Clock, Shield, BarChart2, RefreshCw, Wifi
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart,
  Pie, Cell, Legend
} from 'recharts'
import {
  monitoringAPI, alertsAPI, incidentsAPI,
  automationAPI, analyticsAPI, complianceAPI
} from '../../api/endpoints'

const COLOR = {
  red      : '#C0272D',
  redLight : 'rgba(192,39,45,0.12)',
  gold     : '#F5C842',
  black    : '#1A1A1A',
  charcoal : '#2C2C2C',
  gray     : '#3D3D3D',
  muted    : '#9B9B9B',
  bg       : '#F0F0F0',
  white    : '#FFFFFF',
  green    : '#059669',
  blue     : '#2563EB',
  orange   : '#D97706',
}

function StatCard({ label, value, icon: Icon, trend, trendLabel, accent, loading }) {
  return (
    <div className="rounded-2xl p-5 flex flex-col gap-4"
         style={{ background: COLOR.white, border: '1px solid #F0F0F0' }}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium" style={{ color: COLOR.muted }}>{label}</span>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
             style={{ background: accent ? `${accent}18` : COLOR.bg }}>
          <Icon size={18} style={{ color: accent || COLOR.gray }} />
        </div>
      </div>
      {loading ? (
        <div className="h-8 w-16 rounded-lg animate-pulse" style={{ background: COLOR.bg }} />
      ) : (
        <div className="flex items-end justify-between">
          <span className="text-3xl font-bold" style={{ color: COLOR.black }}>{value ?? '—'}</span>
          {trend !== undefined && (
            <span className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full"
                  style={{
                    background : trend >= 0 ? 'rgba(5,150,105,0.1)' : 'rgba(192,39,45,0.1)',
                    color      : trend >= 0 ? COLOR.green : COLOR.red,
                  }}>
              {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {trendLabel}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function SectionHeader({ title, subtitle, icon: Icon }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center"
           style={{ background: COLOR.redLight }}>
        <Icon size={16} style={{ color: COLOR.red }} />
      </div>
      <div>
        <h3 className="font-bold text-sm" style={{ color: COLOR.black }}>{title}</h3>
        {subtitle && <p className="text-xs" style={{ color: COLOR.muted }}>{subtitle}</p>}
      </div>
    </div>
  )
}

function StatusDot({ status }) {
  const colors = {
    online      : COLOR.green,
    offline     : COLOR.red,
    warning     : COLOR.orange,
    critical    : COLOR.red,
    maintenance : COLOR.blue,
  }
  return (
    <span className="inline-block w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: colors[status] || COLOR.muted }} />
  )
}

function SeverityBadge({ severity }) {
  const map = {
    critical : { bg: 'rgba(192,39,45,0.1)',  color: COLOR.red    },
    warning  : { bg: 'rgba(217,119,6,0.1)',  color: COLOR.orange },
    info     : { bg: 'rgba(37,99,235,0.1)',  color: COLOR.blue   },
  }
  const s = map[severity] || map.info
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium capitalize"
          style={{ background: s.bg, color: s.color }}>
      {severity}
    </span>
  )
}

function PriorityBadge({ priority }) {
  const map = {
    critical : { bg: 'rgba(192,39,45,0.1)',  color: COLOR.red    },
    high     : { bg: 'rgba(217,119,6,0.1)',  color: COLOR.orange },
    medium   : { bg: 'rgba(245,200,66,0.1)', color: '#B8960A'    },
    low      : { bg: 'rgba(5,150,105,0.1)',  color: COLOR.green  },
  }
  const p = map[priority] || map.low
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium capitalize"
          style={{ background: p.bg, color: p.color }}>
      {priority}
    </span>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl px-3 py-2 shadow-lg text-xs"
         style={{ background: COLOR.black, color: COLOR.white, border: 'none' }}>
      <p className="font-medium mb-1" style={{ color: COLOR.gold }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || COLOR.white }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  )
}

const MOCK_METRICS = Array.from({ length: 12 }, (_, i) => ({
  time       : `${String(i * 2).padStart(2, '0')}:00`,
  cpu        : Math.floor(30 + Math.random() * 50),
  memory     : Math.floor(40 + Math.random() * 40),
  network    : Math.floor(10 + Math.random() * 60),
}))

const MOCK_INCIDENTS_WEEK = [
  { day: 'Mon', open: 4, resolved: 3 },
  { day: 'Tue', open: 6, resolved: 5 },
  { day: 'Wed', open: 2, resolved: 4 },
  { day: 'Thu', open: 8, resolved: 6 },
  { day: 'Fri', open: 5, resolved: 7 },
  { day: 'Sat', open: 1, resolved: 2 },
  { day: 'Sun', open: 3, resolved: 3 },
]

export default function DashboardPage() {
  const { data: monitoringSummary, isLoading: loadingMonitoring } = useQuery({
    queryKey : ['monitoring-summary'],
    queryFn  : () => monitoringAPI.summary().then(r => r.data),
    refetchInterval: 30000,
  })

  const { data: alertsSummary, isLoading: loadingAlerts } = useQuery({
    queryKey : ['alerts-summary'],
    queryFn  : () => alertsAPI.summary().then(r => r.data),
    refetchInterval: 30000,
  })

  const { data: incidentsSummary, isLoading: loadingIncidents } = useQuery({
    queryKey : ['incidents-summary'],
    queryFn  : () => incidentsAPI.summary().then(r => r.data),
    refetchInterval: 30000,
  })

  const { data: automationSummary, isLoading: loadingAutomation } = useQuery({
    queryKey : ['automation-summary'],
    queryFn  : () => automationAPI.summary().then(r => r.data),
    refetchInterval: 30000,
  })

  const { data: analyticsSummary } = useQuery({
    queryKey : ['analytics-summary'],
    queryFn  : () => analyticsAPI.summary().then(r => r.data),
  })

  const { data: complianceSummary } = useQuery({
    queryKey : ['compliance-summary'],
    queryFn  : () => complianceAPI.summary().then(r => r.data),
  })

  const { data: serversData } = useQuery({
    queryKey : ['servers-dashboard'],
    queryFn  : () => monitoringAPI.servers().then(r => r.data),
  })

  const { data: alertsData } = useQuery({
    queryKey : ['alerts-dashboard'],
    queryFn  : () => alertsAPI.list({ status: 'active' }).then(r => r.data),
  })

  const { data: incidentsData } = useQuery({
    queryKey : ['incidents-dashboard'],
    queryFn  : () => incidentsAPI.list({ status: 'open' }).then(r => r.data),
  })

  const servers   = serversData?.results   || serversData   || []
  const alerts    = alertsData?.results    || alertsData    || []
  const incidents = incidentsData?.results || incidentsData || []

  const serverStatusPie = monitoringSummary ? [
    { name: 'Online',      value: monitoringSummary.online      || 0, color: COLOR.green  },
    { name: 'Warning',     value: monitoringSummary.warning     || 0, color: COLOR.orange },
    { name: 'Critical',    value: monitoringSummary.critical    || 0, color: COLOR.red    },
    { name: 'Offline',     value: monitoringSummary.offline     || 0, color: COLOR.muted  },
    { name: 'Maintenance', value: monitoringSummary.maintenance || 0, color: COLOR.blue   },
  ].filter(d => d.value > 0) : []

  return (
    <div className="space-y-6">

      {/* Top stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total servers"
          value={monitoringSummary?.total_servers}
          icon={Server}
          accent={COLOR.blue}
          loading={loadingMonitoring}
        />
        <StatCard
          label="Active alerts"
          value={alertsSummary?.active}
          icon={Bell}
          accent={alertsSummary?.active > 0 ? COLOR.red : COLOR.green}
          trendLabel={`${alertsSummary?.critical || 0} critical`}
          trend={alertsSummary?.critical > 0 ? -1 : 1}
          loading={loadingAlerts}
        />
        <StatCard
          label="Open incidents"
          value={incidentsSummary?.open}
          icon={AlertTriangle}
          accent={COLOR.orange}
          trendLabel={`${incidentsSummary?.in_progress || 0} in progress`}
          loading={loadingIncidents}
        />
        <StatCard
          label="Running tasks"
          value={automationSummary?.running}
          icon={Zap}
          accent={COLOR.gold}
          trendLabel={`${automationSummary?.failed || 0} failed`}
          trend={automationSummary?.failed > 0 ? -1 : 1}
          loading={loadingAutomation}
        />
      </div>

      {/* Second row stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Servers online"
          value={monitoringSummary?.online}
          icon={CheckCircle}
          accent={COLOR.green}
          loading={loadingMonitoring}
        />
        <StatCard
          label="Servers offline"
          value={monitoringSummary?.offline}
          icon={XCircle}
          accent={COLOR.red}
          loading={loadingMonitoring}
        />
        <StatCard
          label="Compliance rate"
          value={complianceSummary ? `${complianceSummary.compliance_rate}%` : '—'}
          icon={Shield}
          accent={COLOR.green}
        />
        <StatCard
          label="Anomalies detected"
          value={analyticsSummary?.open_anomalies}
          icon={Activity}
          accent={COLOR.orange}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Metrics area chart */}
        <div className="lg:col-span-2 rounded-2xl p-5"
             style={{ background: COLOR.white, border: '1px solid #F0F0F0' }}>
          <SectionHeader
            title="System metrics (last 24h)"
            subtitle="CPU, memory and network usage"
            icon={BarChart2}
          />
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={MOCK_METRICS} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradCpu" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={COLOR.red}  stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLOR.red}  stopOpacity={0}   />
                </linearGradient>
                <linearGradient id="gradMem" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={COLOR.blue} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLOR.blue} stopOpacity={0}   />
                </linearGradient>
                <linearGradient id="gradNet" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={COLOR.gold} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLOR.gold} stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
              <XAxis dataKey="time" tick={{ fontSize: 11, fill: COLOR.muted }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: COLOR.muted }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
              <Area type="monotone" dataKey="cpu"     name="CPU %"     stroke={COLOR.red}   fill="url(#gradCpu)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="memory"  name="Memory %"  stroke={COLOR.blue}  fill="url(#gradMem)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="network" name="Network %"  stroke={COLOR.gold}  fill="url(#gradNet)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Server status pie */}
        <div className="rounded-2xl p-5"
             style={{ background: COLOR.white, border: '1px solid #F0F0F0' }}>
          <SectionHeader
            title="Server status"
            subtitle="Current distribution"
            icon={Server}
          />
          {serverStatusPie.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={serverStatusPie}
                    cx="50%" cy="50%"
                    innerRadius={45} outerRadius={70}
                    paddingAngle={3}
                    dataKey="value">
                    {serverStatusPie.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {serverStatusPie.map(({ name, value, color }) => (
                  <div key={name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                      <span style={{ color: COLOR.gray }}>{name}</span>
                    </div>
                    <span className="font-semibold" style={{ color: COLOR.black }}>{value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 gap-2">
              <Server size={32} strokeWidth={1} style={{ color: COLOR.muted }} />
              <p className="text-xs" style={{ color: COLOR.muted }}>No server data yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Incidents bar chart + compliance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Weekly incidents */}
        <div className="lg:col-span-2 rounded-2xl p-5"
             style={{ background: COLOR.white, border: '1px solid #F0F0F0' }}>
          <SectionHeader
            title="Incidents this week"
            subtitle="Opened vs resolved"
            icon={AlertTriangle}
          />
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={MOCK_INCIDENTS_WEEK} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: COLOR.muted }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: COLOR.muted }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
              <Bar dataKey="open"     name="Opened"   fill={COLOR.red}   radius={[4,4,0,0]} />
              <Bar dataKey="resolved" name="Resolved" fill={COLOR.green} radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Compliance + automation summary */}
        <div className="space-y-4">
          <div className="rounded-2xl p-5"
               style={{ background: COLOR.white, border: '1px solid #F0F0F0' }}>
            <SectionHeader title="Compliance" subtitle="Policy status" icon={Shield} />
            <div className="space-y-3">
              {[
                { label: 'Active policies',     value: complianceSummary?.active_policies     ?? '—' },
                { label: 'Passed checks',       value: complianceSummary?.passed_checks       ?? '—' },
                { label: 'Open violations',     value: complianceSummary?.open_violations     ?? '—' },
                { label: 'Compliance rate',     value: complianceSummary ? `${complianceSummary.compliance_rate}%` : '—' },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between text-sm">
                  <span style={{ color: COLOR.muted }}>{label}</span>
                  <span className="font-semibold" style={{ color: COLOR.black }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl p-5"
               style={{ background: COLOR.white, border: '1px solid #F0F0F0' }}>
            <SectionHeader title="Automation" subtitle="Task status" icon={Zap} />
            <div className="space-y-3">
              {[
                { label: 'Total tasks',   value: automationSummary?.total_tasks   ?? '—' },
                { label: 'Completed',     value: automationSummary?.completed     ?? '—' },
                { label: 'Scheduled',     value: automationSummary?.scheduled     ?? '—' },
                { label: 'Failed',        value: automationSummary?.failed        ?? '—' },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between text-sm">
                  <span style={{ color: COLOR.muted }}>{label}</span>
                  <span className="font-semibold" style={{ color: COLOR.black }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom tables row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Recent servers */}
        <div className="rounded-2xl p-5"
             style={{ background: COLOR.white, border: '1px solid #F0F0F0' }}>
          <SectionHeader title="Servers" subtitle="Latest status" icon={Server} />
          {servers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2">
              <Server size={28} strokeWidth={1} style={{ color: COLOR.muted }} />
              <p className="text-xs" style={{ color: COLOR.muted }}>No servers added yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {servers.slice(0, 5).map(server => (
                <div key={server.id} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <StatusDot status={server.status} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: COLOR.black }}>
                        {server.name}
                      </p>
                      <p className="text-xs truncate" style={{ color: COLOR.muted }}>
                        {server.ip_address}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs capitalize px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{
                          background : server.status === 'online' ? 'rgba(5,150,105,0.1)'  : 'rgba(192,39,45,0.1)',
                          color      : server.status === 'online' ? COLOR.green             : COLOR.red,
                        }}>
                    {server.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent alerts */}
        <div className="rounded-2xl p-5"
             style={{ background: COLOR.white, border: '1px solid #F0F0F0' }}>
          <SectionHeader title="Active alerts" subtitle="Most recent" icon={Bell} />
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2">
              <CheckCircle size={28} strokeWidth={1} style={{ color: COLOR.green }} />
              <p className="text-xs" style={{ color: COLOR.muted }}>No active alerts</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.slice(0, 5).map(alert => (
                <div key={alert.id} className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate" style={{ color: COLOR.black }}>
                      {alert.message}
                    </p>
                    <p className="text-xs mt-0.5 truncate" style={{ color: COLOR.muted }}>
                      {alert.server_name}
                    </p>
                  </div>
                  <SeverityBadge severity={alert.severity} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent incidents */}
        <div className="rounded-2xl p-5"
             style={{ background: COLOR.white, border: '1px solid #F0F0F0' }}>
          <SectionHeader title="Open incidents" subtitle="Needs attention" icon={AlertTriangle} />
          {incidents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2">
              <CheckCircle size={28} strokeWidth={1} style={{ color: COLOR.green }} />
              <p className="text-xs" style={{ color: COLOR.muted }}>No open incidents</p>
            </div>
          ) : (
            <div className="space-y-3">
              {incidents.slice(0, 5).map(incident => (
                <div key={incident.id} className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate" style={{ color: COLOR.black }}>
                      {incident.title}
                    </p>
                    <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: COLOR.muted }}>
                      <Clock size={10} />
                      {new Date(incident.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <PriorityBadge priority={incident.priority} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer refresh note */}
      <div className="flex items-center justify-end gap-2 text-xs"
           style={{ color: COLOR.muted }}>
        <RefreshCw size={12} />
        Auto-refreshes every 30 seconds
      </div>
    </div>
  )
}