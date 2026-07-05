import { useState, useEffect, useCallback } from 'react'
import {
  FileText, Search, RefreshCw, Eye, X,
  ChevronLeft, ChevronRight, Plus, Download,
  CheckCircle, XCircle, Clock, Shield,
  Activity, Cpu, BarChart2, Calendar, ScrollText
} from 'lucide-react'
import { reportsAPI } from '../../api/endpoints'
import useAuthStore from '../../store/authStore'
import AuditLogsTab from './AuditLogsTab'

const ITEMS_PER_PAGE = 10

const statusConfig = {
  pending    : { bg: 'bg-gray-100 text-gray-600',    dot: 'bg-gray-400',   label: 'Pending'    },
  generating : { bg: 'bg-blue-100 text-blue-800',    dot: 'bg-blue-500',   label: 'Generating' },
  completed  : { bg: 'bg-green-100 text-green-800',  dot: 'bg-green-500',  label: 'Completed'  },
  failed     : { bg: 'bg-red-100 text-red-800',      dot: 'bg-red-500',    label: 'Failed'     },
}

const typeConfig = {
  performance  : { bg: 'bg-blue-100 text-blue-800',     label: 'Performance'  },
  health       : { bg: 'bg-green-100 text-green-800',   label: 'Health'       },
  compliance   : { bg: 'bg-purple-100 text-purple-800', label: 'Compliance'   },
  incident     : { bg: 'bg-red-100 text-red-800',       label: 'Incident'     },
  availability : { bg: 'bg-yellow-100 text-yellow-800', label: 'Availability' },
  custom       : { bg: 'bg-gray-100 text-gray-600',     label: 'Custom'       },
}

const formatConfig = {
  pdf  : { bg: 'bg-red-100 text-red-700',     label: 'PDF'  },
  csv  : { bg: 'bg-green-100 text-green-700', label: 'CSV'  },
  json : { bg: 'bg-blue-100 text-blue-700',   label: 'JSON' },
}

const fmtDate = (d) => d ? new Date(d).toLocaleString('en-GB', {
  day: '2-digit', month: 'short', year: 'numeric',
  hour: '2-digit', minute: '2-digit',
}) : '—'

const StatusBadge = ({ status }) => {
  const c = statusConfig[status] || statusConfig.pending
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${c.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${c.dot}`} />
      {c.label}
    </span>
  )
}

const TypeBadge = ({ type }) => {
  const c = typeConfig[type] || typeConfig.custom
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${c.bg}`}>
      {c.label}
    </span>
  )
}

const FormatBadge = ({ format }) => {
  const c = formatConfig[format] || formatConfig.json
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${c.bg}`}>
      {c.label}
    </span>
  )
}

const StatsCard = ({ title, value, icon: Icon, color }) => {
  const colorClasses = {
    gray   : 'bg-gray-100 text-gray-600',
    green  : 'bg-green-100 text-green-600',
    orange : 'bg-yellow-100 text-yellow-600',
    red    : 'bg-red-100 text-red-600',
    blue   : 'bg-blue-100 text-blue-600',
    purple : 'bg-purple-100 text-purple-600',
  }
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg ${colorClasses[color] || colorClasses.gray}`}>
          <Icon size={18} />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
      <p className="text-sm text-gray-600 mt-1">{title}</p>
    </div>
  )
}

const ReportDetailModal = ({ report, onGenerate, onDownload, generating, downloading, onClose }) => {
  if (!report) return null

  const handlePrintPDF = () => {
    const reportId    = String(report.id).padStart(4, '0')
    const generatedBy = report.generated_by_username || 'System'
    const generatedAt = report.generated_at
      ? new Date(report.generated_at).toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })
      : new Date().toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })
    const period      = report.date_from
      ? `${new Date(report.date_from).toLocaleDateString()} — ${new Date(report.date_to).toLocaleDateString()}`
      : 'All time'
    const reportType  = (report.report_type || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    const summaryRows = Object.entries(report._data?.summary || {})
    const details     = report._data?.details || []
    const headers     = details.length > 0 ? Object.keys(details[0]) : []

    const printWindow = window.open('', '_blank')
    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>RPT-${reportId} — ${report.title}</title>
  <meta charset="utf-8">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Segoe UI',Arial,sans-serif; background:#fff; color:#1A1A1A; font-size:13px; }
    .top-bar { background:#C0272D; height:6px; }
    .header { display:flex; align-items:center; justify-content:space-between; padding:20px 40px 16px; border-bottom:2.5px solid #C0272D; }
    .header-left { display:flex; align-items:center; gap:14px; }
    .logo { height:52px; width:auto; }
    .brand-name { font-size:20px; font-weight:800; color:#C0272D; line-height:1.1; }
    .brand-tag  { font-size:10px; color:#9B9B9B; margin-top:2px; }
    .header-right { text-align:right; }
    .report-title { font-size:22px; font-weight:700; color:#1A1A1A; }
    .report-type  { font-size:12px; color:#9B9B9B; margin-top:3px; }
    .info-strip { display:grid; grid-template-columns:repeat(5,1fr); background:#F5F5F5; border-bottom:1px solid #E0E0E0; }
    .info-cell  { padding:10px 14px; border-right:1px solid #E0E0E0; }
    .info-cell:last-child { border-right:none; }
    .info-label { font-size:9px; color:#9B9B9B; font-weight:700; text-transform:uppercase; letter-spacing:.06em; margin-bottom:3px; }
    .info-value { font-size:12px; font-weight:700; color:#1A1A1A; }
    .content { padding:20px 40px 30px; }
    .section-title { font-size:12px; font-weight:700; color:#C0272D; margin:20px 0 8px; text-transform:uppercase; letter-spacing:.06em; }
    .summary-grid { display:grid; grid-template-columns:repeat(4,1fr); border:1px solid #E0E0E0; border-radius:6px; overflow:hidden; }
    .summary-key-cell { padding:10px 14px; background:#EBEBEB; }
    .summary-val-cell { padding:10px 14px; background:#F5F5F5; }
    .summary-key { font-size:10px; color:#9B9B9B; text-transform:capitalize; }
    .summary-val { font-size:18px; font-weight:800; color:#C0272D; }
    table { width:100%; border-collapse:collapse; font-size:11px; }
    thead tr { background:#C0272D; }
    thead th { padding:9px 10px; text-align:left; color:#fff; font-weight:700; font-size:10px; text-transform:uppercase; letter-spacing:.05em; }
    tbody tr:nth-child(even) { background:#F5F5F5; }
    tbody tr:nth-child(odd)  { background:#fff; }
    tbody td { padding:7px 10px; color:#1A1A1A; border-bottom:1px solid #E0E0E0; }
    .sig-section { display:grid; grid-template-columns:repeat(3,1fr); border:1px solid #E0E0E0; border-radius:6px; overflow:hidden; background:#F5F5F5; margin-top:24px; }
    .sig-cell { padding:14px 16px; border-right:1px solid #E0E0E0; }
    .sig-cell:last-child { border-right:none; }
    .sig-label { font-size:9px; color:#9B9B9B; font-weight:700; text-transform:uppercase; letter-spacing:.06em; margin-bottom:6px; }
    .sig-name  { font-size:13px; font-weight:700; color:#1A1A1A; margin-bottom:2px; }
    .sig-line  { font-size:13px; color:#BDBDBD; margin-bottom:4px; }
    .sig-date  { font-size:10px; color:#9B9B9B; }
    .footer { display:flex; align-items:center; justify-content:space-between; padding:10px 40px; font-size:10px; color:#9B9B9B; border-top:1px solid #E0E0E0; margin-top:20px; }
    .bottom-bar { background:#C0272D; height:5px; }
    .actions { text-align:center; padding:16px 0; background:#F8F9FA; border-top:1px solid #E0E0E0; }
    .btn-print { padding:9px 28px; background:#C0272D; color:#fff; border:none; border-radius:8px; cursor:pointer; font-size:13px; font-weight:600; margin-right:10px; }
    .btn-close { padding:9px 28px; background:#6B7280; color:#fff; border:none; border-radius:8px; cursor:pointer; font-size:13px; font-weight:600; }
    @media print { .actions { display:none; } }
  </style>
</head>
<body>

<div class="top-bar"></div>

<div class="header">
  <div class="header-left">
    <img src="/images/logo-dark-1.png" alt="RSwitch" class="logo" onerror="this.style.display='none'" />
    <div>
      <div class="brand-name">RSwitch</div>
      <div class="brand-tag">money 24/7 &nbsp;·&nbsp; DataCenter Platform</div>
    </div>
  </div>
  <div class="header-right">
    <div class="report-title">${report.title || 'Report'}</div>
    <div class="report-type">Type: ${reportType}</div>
  </div>
</div>

<div class="info-strip">
  <div class="info-cell">
    <div class="info-label">Report No.</div>
    <div class="info-value">RPT-${reportId}</div>
  </div>
  <div class="info-cell">
    <div class="info-label">Created by</div>
    <div class="info-value">${generatedBy}</div>
  </div>
  <div class="info-cell">
    <div class="info-label">Approved by</div>
    <div class="info-value">System Admin</div>
  </div>
  <div class="info-cell">
    <div class="info-label">Date</div>
    <div class="info-value">${generatedAt.split(',')[0]}</div>
  </div>
  <div class="info-cell">
    <div class="info-label">Period</div>
    <div class="info-value">${period}</div>
  </div>
</div>

<div class="content">

  ${summaryRows.length > 0 ? `
    <div class="summary-grid">
      ${summaryRows.map(([key, val]) => `
        <div class="summary-key-cell"><div class="summary-key">${key.replace(/_/g,' ')}</div></div>
        <div class="summary-val-cell"><div class="summary-val">${val}</div></div>
      `).join('')}
    </div>
  ` : ''}

  ${details.length > 0 ? `
    <div class="section-title">Details &nbsp;<span style="font-size:10px;color:#9B9B9B;font-weight:400">(${details.length} records)</span></div>
    <table>
      <thead>
        <tr>${headers.map(h => `<th>${h.replace(/_/g,' ')}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${details.map(row => `
          <tr>${Object.values(row).map(val =>
            `<td>${typeof val === 'boolean' ? (val ? '✓' : '✗') : (val ?? '—')}</td>`
          ).join('')}</tr>
        `).join('')}
      </tbody>
    </table>
  ` : ''}

  <div class="section-title">Signatures</div>
  <div class="sig-section">
    <div class="sig-cell">
      <div class="sig-label">Prepared by</div>
      <div class="sig-name">${generatedBy}</div>
      <div class="sig-date">${generatedAt.split(',')[0]}</div>
    </div>
    <div class="sig-cell">
      <div class="sig-label">Reviewed by</div>
      <div class="sig-line">_______________________</div>
      <div class="sig-date">Date: _______________</div>
    </div>
    <div class="sig-cell">
      <div class="sig-label">Approved by</div>
      <div class="sig-line">_______________________</div>
      <div class="sig-date">Date: _______________</div>
    </div>
  </div>

</div>

<div class="footer">
  <span>RSwitch DataCenter Platform &nbsp;·&nbsp; money 24/7 &nbsp;·&nbsp; RPT-${reportId} &nbsp;·&nbsp; Confidential</span>
  <span>${generatedAt}</span>
</div>
<div class="bottom-bar"></div>

<div class="actions">
  <button class="btn-print" onclick="window.print()">🖨️ Save as PDF</button>
  <button class="btn-close" onclick="window.close()">Close</button>
</div>

</body>
</html>`)
    printWindow.document.close()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900 bg-opacity-50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Report Details</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 space-y-4">

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div>
              <p className="text-sm text-gray-500">Title</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">{report.title}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 mb-1">Status</p>
              <StatusBadge status={report.status} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-400 font-medium">Report Type</p>
                <div className="mt-1"><TypeBadge type={report.report_type} /></div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-400 font-medium">Format</p>
                <div className="mt-1"><FormatBadge format={report.format} /></div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-400 font-medium">Created by</p>
                <p className="text-sm text-gray-900 mt-1">{report.generated_by_username || '—'}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-400 font-medium">Approved by</p>
                <p className="text-sm text-gray-900 mt-1">System Admin</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-400 font-medium">Created at</p>
                <p className="text-sm text-gray-900 mt-1">{fmtDate(report.created_at)}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-400 font-medium">Generated at</p>
                <p className="text-sm text-gray-900 mt-1">{fmtDate(report.generated_at)}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-400 font-medium">Date range</p>
                <p className="text-sm text-gray-900 mt-1">
                  {report.date_from
                    ? `${new Date(report.date_from).toLocaleDateString()} — ${new Date(report.date_to).toLocaleDateString()}`
                    : 'All time'}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-400 font-medium">Report ID</p>
                <p className="text-sm font-mono text-gray-900 mt-1">RPT-{String(report.id).padStart(4, '0')}</p>
              </div>
            </div>
          </div>

          {report._data && (
            <>
              {Object.keys(report._data.summary || {}).length > 0 && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {Object.entries(report._data.summary).map(([key, val]) => (
                      <div key={key} className="bg-white p-2.5 rounded-lg border border-gray-100">
                        <p className="text-xs text-gray-400 capitalize">{key.replace(/_/g, ' ')}</p>
                        <p className="text-sm font-bold text-gray-900 mt-0.5">{String(val)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {report._data.details?.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
                      Records ({report._data.details.length})
                    </p>
                    {report._data.details.length > 5 && (
                      <p className="text-xs text-gray-400">Showing first 5 · download for all</p>
                    )}
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          {Object.keys(report._data.details[0]).map(h => (
                            <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                              {h.replace(/_/g, ' ')}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {report._data.details.slice(0, 5).map((row, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            {Object.values(row).map((val, j) => (
                              <td key={j} className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">
                                {typeof val === 'boolean' ? (val ? '✓' : '✗') : String(val ?? '—')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="flex gap-3 pt-2">
            {(report.status === 'pending' || report.status === 'failed') && (
              <button onClick={() => onGenerate(report)} disabled={generating === report.id}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-60">
                {generating === report.id
                  ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Generating...</>
                  : <><Download size={16} /> Generate report</>}
              </button>
            )}
            {report.status === 'completed' && (
              <>
                <button onClick={() => onDownload(report)} disabled={downloading === report.id}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-green-600 rounded-xl hover:bg-green-700 transition-colors disabled:opacity-60">
                  {downloading === report.id
                    ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Downloading...</>
                    : <><Download size={16} /> Download {report.format?.toUpperCase()}</>}
                </button>
                <button onClick={handlePrintPDF}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors">
                  <FileText size={16} /> View &amp; Print
                </button>
              </>
            )}
            <button onClick={onClose} className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const CreateReportModal = ({ onClose, onCreate }) => {
  const [form,      setForm]      = useState({ title: '', report_type: 'performance', format: 'pdf', date_from: '', date_to: '' })
  const [loading,   setLoading]   = useState(false)
  const [formError, setFormError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')
    setLoading(true)
    try {
      await onCreate({ ...form, date_from: form.date_from || null, date_to: form.date_to || null })
    } catch (err) {
      const d = err.response?.data
      setFormError(d ? Object.values(d).flat().join(' ') : 'Failed to create report.')
      setLoading(false)
    }
  }

  const inp = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900 bg-opacity-50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Create New Report</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">{formError}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Report title <span className="text-red-500">*</span></label>
            <input type="text" value={form.title} required onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. Weekly Performance Report" className={inp} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Report type</label>
              <select value={form.report_type} onChange={e => setForm({...form, report_type: e.target.value})} className={inp}>
                <option value="performance">Performance</option>
                <option value="health">Health</option>
                <option value="incident">Incident</option>
                <option value="availability">Availability</option>
                <option value="compliance">Compliance</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
              <select value={form.format} onChange={e => setForm({...form, format: e.target.value})} className={inp}>
                <option value="pdf">PDF</option>
                <option value="csv">CSV</option>
                <option value="json">JSON</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date from <span className="text-gray-400">(optional)</span></label>
              <input type="datetime-local" value={form.date_from} onChange={e => setForm({...form, date_from: e.target.value})} className={inp} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date to <span className="text-gray-400">(optional)</span></label>
              <input type="datetime-local" value={form.date_to} onChange={e => setForm({...form, date_to: e.target.value})} className={inp} />
            </div>
          </div>
          <p className="text-xs text-gray-400 bg-gray-50 p-3 rounded-lg">
            {form.report_type === 'performance'  && 'Avg CPU, memory and disk per server with metric samples.'}
            {form.report_type === 'health'       && 'All server statuses, specs, OS and locations.'}
            {form.report_type === 'incident'     && 'Full incident log with priority, status and assignments.'}
            {form.report_type === 'availability' && 'Server availability rates and uptime summary.'}
            {form.report_type === 'compliance'   && 'Alert and automation task compliance overview.'}
            {form.report_type === 'custom'       && 'Combined alert and task activity data.'}
          </p>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-60">
              {loading ? 'Creating...' : 'Create report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const ReportsPage = () => {
  const [allReports,       setAllReports]       = useState([])
  const [displayedReports, setDisplayedReports] = useState([])
  const [loading,          setLoading]          = useState(true)
  const [summary,          setSummary]          = useState({})
  const [scheduled,        setScheduled]        = useState([])
  const [search,           setSearch]           = useState('')
  const [filterType,       setFilterType]       = useState('ALL')
  const [filterStatus,     setFilterStatus]     = useState('ALL')
  const [selected,         setSelected]         = useState(null)
  const [showCreate,       setShowCreate]       = useState(false)
  const [generating,       setGenerating]       = useState(null)
  const [downloading,      setDownloading]      = useState(null)
  const [currentPage,      setCurrentPage]      = useState(1)
  const [totalPages,       setTotalPages]       = useState(1)
  const [totalItems,       setTotalItems]       = useState(0)
  const [successMsg,       setSuccessMsg]       = useState('')
  const [errorMsg,         setErrorMsg]         = useState('')
  const [activeTab,        setActiveTab]        = useState('reports')
  const role = useAuthStore((s) => s.user?.role)
  const canViewAuditLogs = role === 'admin' || role === 'auditor'

  const flash = (msg, isError = false) => {
    if (isError) { setErrorMsg(msg);   setTimeout(() => setErrorMsg(''),   4000) }
    else         { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000) }
  }

  const loadReports = useCallback(async () => {
    setLoading(true)
    try {
      const [r1, r2, r3] = await Promise.all([
        reportsAPI.list(),
        reportsAPI.summary(),
        reportsAPI.scheduled(),
      ])
      const reports = r1.data?.results || r1.data || []
      reports.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      setAllReports(reports)
      setSummary(r2.data || {})
      setScheduled(r3.data?.results || r3.data || [])
      applyFilters(reports, '', 'ALL', 'ALL', 1)
    } catch {
      flash('Failed to load reports.', true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadReports() }, [loadReports])

  const applyFilters = (reports, searchTerm, type, status, page) => {
    const filtered = reports.filter(r => {
      const q = searchTerm.toLowerCase()
      return (
        (!searchTerm || r.title?.toLowerCase().includes(q) || r.report_type?.toLowerCase().includes(q) || r.generated_by_username?.toLowerCase().includes(q)) &&
        (type   === 'ALL' || r.report_type === type) &&
        (status === 'ALL' || r.status      === status)
      )
    })
    const total = filtered.length
    const pages = Math.ceil(total / ITEMS_PER_PAGE) || 1
    const pg    = Math.min(Math.max(page, 1), pages)
    const start = (pg - 1) * ITEMS_PER_PAGE
    setTotalItems(total); setTotalPages(pages); setCurrentPage(pg)
    setDisplayedReports(filtered.slice(start, start + ITEMS_PER_PAGE))
  }

  useEffect(() => {
    applyFilters(allReports, search, filterType, filterStatus, 1)
  }, [search, filterType, filterStatus, allReports])

  const goToPage = (p) => {
    if (p >= 1 && p <= totalPages)
      applyFilters(allReports, search, filterType, filterStatus, p)
  }

  const goToPreviousPage = () => { if (currentPage > 1) goToPage(currentPage - 1) }
  const goToNextPage     = () => { if (currentPage < totalPages) goToPage(currentPage + 1) }

  const getPageNumbers = () => {
    const pages = []
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else if (currentPage <= 3) {
      for (let i = 1; i <= 4; i++) pages.push(i)
      pages.push('...'); pages.push(totalPages)
    } else if (currentPage >= totalPages - 2) {
      pages.push(1); pages.push('...')
      for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1); pages.push('...')
      for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i)
      pages.push('...'); pages.push(totalPages)
    }
    return pages
  }

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1
  const endItem   = Math.min(currentPage * ITEMS_PER_PAGE, totalItems)

  const handleGenerate = async (report) => {
    setGenerating(report.id)
    try {
      const res = await reportsAPI.generate(report.id)
      setAllReports(prev => prev.map(r => r.id === report.id ? res.data.report : r))
      setSummary(s => ({ ...s, pending: Math.max(0,(s.pending||0)-1), completed: (s.completed||0)+1 }))
      if (res.data?.report_data) setSelected({ ...res.data.report, _data: res.data.report_data })
      flash('Report generated successfully.')
    } catch {
      flash('Failed to generate report.', true)
    } finally {
      setGenerating(null)
    }
  }

  const handleDownload = (report) => {
    setDownloading(report.id)
    const token = localStorage.getItem('access_token')
    fetch(`/api/reports/${report.id}/download/`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
    .then(res => {
      if (!res.ok) return res.json().then(e => { throw new Error(e.detail || 'Download failed') })
      const match    = (res.headers.get('Content-Disposition') || '').match(/filename="?([^"]+)"?/)
      const filename = match ? match[1] : `${report.title.replace(/\s+/g,'_')}.${report.format}`
      return res.blob().then(blob => ({ blob, filename }))
    })
    .then(({ blob, filename }) => {
      const url = window.URL.createObjectURL(blob)
      const a   = document.createElement('a')
      a.href = url; a.download = filename
      document.body.appendChild(a); a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      flash('Download started.')
    })
    .catch(err => flash(`Download failed: ${err.message}`, true))
    .finally(() => setDownloading(null))
  }

  const handleCreate = async (formData) => {
    const res = await reportsAPI.create(formData)
    setAllReports(prev => [res.data, ...prev])
    setSummary(s => ({ ...s, total: (s.total||0)+1, pending: (s.pending||0)+1 }))
    setShowCreate(false)
    flash('Report created successfully.')
  }

  return (
    <div className="space-y-6 p-4 md:p-6 bg-gray-50 min-h-screen">

      {successMsg && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white bg-green-600">
          <CheckCircle size={16} /> {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white bg-red-600">
          <XCircle size={16} /> {errorMsg}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText size={24} className="text-red-600" />
            Reports &amp; Audit Logs
          </h1>
          <p className="mt-1 text-sm text-gray-600">Generate and download infrastructure reports</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadReports} disabled={loading} title="Refresh"
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50">
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setShowCreate(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors">
            <Plus size={16} /> New report
          </button>
        </div>
      </div>

      {canViewAuditLogs && (
        <div className="flex gap-2 border-b border-gray-200">
          <button onClick={() => setActiveTab('reports')}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'reports' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}>
            <FileText size={16} /> Reports
          </button>
          <button onClick={() => setActiveTab('audit')}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'audit' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}>
            <ScrollText size={16} /> Audit Logs
          </button>
        </div>
      )}

      {activeTab === 'audit' && canViewAuditLogs ? (
        <AuditLogsTab />
      ) : (
      <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatsCard title="Total reports" value={summary.total}     icon={FileText}    color="gray"   />
        <StatsCard title="Completed"     value={summary.completed} icon={CheckCircle} color="green"  />
        <StatsCard title="Pending"       value={summary.pending}   icon={Clock}       color="orange" />
        <StatsCard title="Failed"        value={summary.failed}    icon={XCircle}     color="red"    />
        <StatsCard title="Scheduled"     value={summary.scheduled} icon={Calendar}    color="blue"   />
        <StatsCard title="Report types"  value={6}                 icon={BarChart2}   color="purple" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                   placeholder="Search by title, type or author..."
                   className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm" />
          </div>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm">
            <option value="ALL">All types</option>
            <option value="performance">Performance</option>
            <option value="health">Health</option>
            <option value="incident">Incident</option>
            <option value="availability">Availability</option>
            <option value="compliance">Compliance</option>
            <option value="custom">Custom</option>
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm">
            <option value="ALL">All statuses</option>
            <option value="pending">Pending</option>
            <option value="generating">Generating</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
          <span className="text-sm text-gray-500 whitespace-nowrap">
            {totalItems} result{totalItems !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Title', 'Type', 'Format', 'Status', 'Created by', 'Date', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                  <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
                    <p className="text-sm">Loading reports...</p>
                  </div>
                </td></tr>
              ) : displayedReports.length === 0 ? (
                <tr><td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                  <FileText size={48} className="mx-auto text-gray-300 mb-3" strokeWidth={1} />
                  <p className="text-lg font-medium text-gray-700">No reports found</p>
                  <p className="text-sm text-gray-400 mt-1">Create your first report to get started</p>
                  <button onClick={() => setShowCreate(true)}
                          className="mt-3 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors">
                    <Plus size={14} /> Create report
                  </button>
                </td></tr>
              ) : (
                displayedReports.map(report => (
                  <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-gray-900 truncate max-w-xs">{report.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5 font-mono">RPT-{String(report.id).padStart(4,'0')}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap"><TypeBadge type={report.report_type} /></td>
                    <td className="px-4 py-3 whitespace-nowrap"><FormatBadge format={report.format} /></td>
                    <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={report.status} /></td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-700">{report.generated_by_username || '—'}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-500">{fmtDate(report.created_at)}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setSelected(report)}
                                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                          <Eye size={14} className="mr-1" /> View
                        </button>
                        {(report.status === 'pending' || report.status === 'failed') && (
                          <button onClick={() => handleGenerate(report)} disabled={generating === report.id}
                                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-60">
                            {generating === report.id
                              ? <div className="animate-spin rounded-full h-3 w-3 border-b border-red-600 mr-1" />
                              : <Download size={14} className="mr-1" />}
                            {report.status === 'failed' ? 'Retry' : 'Generate'}
                          </button>
                        )}
                        {report.status === 'completed' && (
                          <button onClick={() => handleDownload(report)} disabled={downloading === report.id}
                                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-60">
                            {downloading === report.id
                              ? <div className="animate-spin rounded-full h-3 w-3 border-b border-green-600 mr-1" />
                              : <Download size={14} className="mr-1" />}
                            Download
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalItems > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm text-gray-500">
                Showing <span className="font-medium">{startItem}</span> to{' '}
                <span className="font-medium">{endItem}</span> of{' '}
                <span className="font-medium">{totalItems}</span> reports
              </p>
              <div className="flex items-center gap-2">
                <button onClick={goToPreviousPage} disabled={currentPage === 1}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  <ChevronLeft size={18} />
                </button>
                {getPageNumbers().map((page, i) => (
                  <button key={i}
                          onClick={() => typeof page === 'number' ? goToPage(page) : null}
                          disabled={page === '...'}
                          className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
                            currentPage === page ? 'bg-red-600 text-white'
                            : page === '...' ? 'text-gray-500 cursor-default'
                            : 'text-gray-600 hover:bg-gray-100'
                          }`}>
                    {page}
                  </button>
                ))}
                <button onClick={goToNextPage} disabled={currentPage === totalPages}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {scheduled.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-gray-900 mb-3">Scheduled reports</h3>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {scheduled.map((s, idx) => (
              <div key={s.id}
                   className={`flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors ${idx < scheduled.length - 1 ? 'border-b border-gray-100' : ''}`}>
                <div>
                  <p className="text-sm font-medium text-gray-900">{s.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.frequency} · {s.recipients?.length || 0} recipients</p>
                </div>
                <div className="flex items-center gap-3">
                  <TypeBadge type={s.report_type} />
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${s.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {s.is_active ? 'Active' : 'Inactive'}
                  </span>
                  {s.next_run && <span className="text-xs text-gray-400">Next: {new Date(s.next_run).toLocaleDateString()}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      </>
      )}

      {selected && (
        <ReportDetailModal
          report={selected}
          onGenerate={handleGenerate}
          onDownload={handleDownload}
          generating={generating}
          downloading={downloading}
          onClose={() => setSelected(null)} />
      )}
      {showCreate && (
        <CreateReportModal
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate} />
      )}
    </div>
  )
}

export default ReportsPage