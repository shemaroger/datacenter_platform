import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Zap, Plus, Search, CheckCircle, Clock, RefreshCw,
  X, AlertCircle, ChevronDown, Play, Square, XCircle,
  FileText, Calendar, GitBranch, Trash2, Edit2, Eye,
  HardDrive, Settings
} from 'lucide-react'
import { automationAPI, monitoringAPI } from '../../api/endpoints'

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

const STATUS_MAP = {
  pending   : { color: COLOR.muted,   bg: 'rgba(107,114,128,0.1)', label: 'Pending'   },
  running   : { color: COLOR.blue,    bg: 'rgba(37,99,235,0.1)',   label: 'Running'   },
  completed : { color: COLOR.green,   bg: 'rgba(5,150,105,0.1)',   label: 'Completed' },
  failed    : { color: COLOR.red,     bg: 'rgba(192,39,45,0.1)',   label: 'Failed'    },
  cancelled : { color: COLOR.orange,  bg: 'rgba(217,119,6,0.1)',   label: 'Cancelled' },
  scheduled : { color: COLOR.purple,  bg: 'rgba(124,58,237,0.1)',  label: 'Scheduled' },
}

const LOG_LEVEL_MAP = {
  info    : { color: COLOR.blue,   bg: 'rgba(37,99,235,0.1)'  },
  warning : { color: COLOR.orange, bg: 'rgba(217,119,6,0.1)'  },
  error   : { color: COLOR.red,    bg: 'rgba(192,39,45,0.1)'  },
  success : { color: COLOR.green,  bg: 'rgba(5,150,105,0.1)'  },
}

const TASK_TYPES = [
  { value: 'backup',           label: 'Backup'           },
  { value: 'service_restart',  label: 'Service Restart'  },
  { value: 'disk_cleanup',     label: 'Disk Cleanup'     },
  { value: 'system_update',    label: 'System Update'    },
  { value: 'health_check',     label: 'Health Check'     },
  { value: 'custom_script',    label: 'Custom Script'    },
  { value: 'resource_scaling', label: 'Resource Scaling' },
]

const TRIGGER_TYPES = [
  { value: 'manual',    label: 'Manual'          },
  { value: 'scheduled', label: 'Scheduled'       },
  { value: 'triggered', label: 'Event Triggered' },
]

const BACKUP_TYPES      = ['full','incremental','differential']
const BACKUP_FREQUENCIES = ['hourly','daily','weekly','monthly']

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || STATUS_MAP.pending
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium capitalize"
          style={{ background: s.bg, color: s.color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
      {s.label}
    </span>
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

const emptyTask = {
  name: '', description: '', task_type: 'health_check',
  trigger_type: 'manual', server: '', script: '', scheduled_at: '',
}

const emptyBackup = {
  name: '', server: '', backup_type: 'full',
  frequency: 'daily', destination: '', retention_days: 30,
}

const emptyWorkflow = {
  name: '', description: '', status: 'draft',
}

export default function AutomationPage() {
  const queryClient = useQueryClient()

  const [activeTab,     setActiveTab]     = useState('tasks')
  const [search,        setSearch]        = useState('')
  const [statusFilter,  setStatusFilter]  = useState('')
  const [typeFilter,    setTypeFilter]    = useState('')
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [editTask,      setEditTask]      = useState(null)
  const [viewLogs,      setViewLogs]      = useState(null)
  const [taskForm,      setTaskForm]      = useState(emptyTask)
  const [showBackupModal, setShowBackupModal] = useState(false)
  const [backupForm,    setBackupForm]    = useState(emptyBackup)
  const [showWorkflowModal, setShowWorkflowModal] = useState(false)
  const [workflowForm,  setWorkflowForm]  = useState(emptyWorkflow)
  const [formError,     setFormError]     = useState('')
  const [successMsg,    setSuccessMsg]    = useState('')

  const flash = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000) }

  const { data: summary } = useQuery({
    queryKey : ['automation-summary'],
    queryFn  : () => automationAPI.summary().then(r => r.data),
    refetchInterval: 15000,
  })

  const { data: tasksData, isLoading: loadingTasks, refetch } = useQuery({
    queryKey : ['tasks', statusFilter, typeFilter],
    queryFn  : () => automationAPI.tasks({
      status    : statusFilter || undefined,
      task_type : typeFilter   || undefined,
    }).then(r => r.data),
    refetchInterval: 15000,
  })

  const { data: backupsData, isLoading: loadingBackups } = useQuery({
    queryKey : ['backups'],
    queryFn  : () => automationAPI.backups().then(r => r.data),
  })

  const { data: workflowsData, isLoading: loadingWorkflows } = useQuery({
    queryKey : ['workflows'],
    queryFn  : () => automationAPI.workflows().then(r => r.data),
  })

  const { data: logsData } = useQuery({
    queryKey : ['task-logs', viewLogs?.id],
    queryFn  : () => automationAPI.taskLogs(viewLogs.id).then(r => r.data),
    enabled  : !!viewLogs,
    refetchInterval: viewLogs?.status === 'running' ? 5000 : false,
  })

  const { data: serversData } = useQuery({
    queryKey : ['servers-list'],
    queryFn  : () => monitoringAPI.servers().then(r => r.data),
  })

  const tasks     = tasksData?.results     || tasksData     || []
  const backups   = backupsData?.results   || backupsData   || []
  const workflows = workflowsData?.results || workflowsData || []
  const servers   = serversData?.results   || serversData   || []
  const logs      = logsData?.results      || logsData      || []

  const createTaskMutation = useMutation({
    mutationFn : (d) => automationAPI.createTask(d),
    onSuccess  : () => { queryClient.invalidateQueries(['tasks']); queryClient.invalidateQueries(['automation-summary']); closeTaskModal(); flash('Task created.') },
    onError    : (err) => setFormError(err.response?.data ? Object.values(err.response.data).flat().join(' ') : 'Failed.'),
  })

  const updateTaskMutation = useMutation({
    mutationFn : ({ id, data }) => automationAPI.updateTask(id, data),
    onSuccess  : () => { queryClient.invalidateQueries(['tasks']); closeTaskModal(); flash('Task updated.') },
    onError    : (err) => setFormError(err.response?.data ? Object.values(err.response.data).flat().join(' ') : 'Failed.'),
  })

  const runTaskMutation = useMutation({
    mutationFn : (id) => automationAPI.runTask(id),
    onSuccess  : () => { queryClient.invalidateQueries(['tasks']); queryClient.invalidateQueries(['automation-summary']); flash('Task started.') },
  })

  const cancelTaskMutation = useMutation({
    mutationFn : (id) => automationAPI.cancelTask(id),
    onSuccess  : () => { queryClient.invalidateQueries(['tasks']); queryClient.invalidateQueries(['automation-summary']); flash('Task cancelled.') },
  })

  const createBackupMutation = useMutation({
    mutationFn : (d) => automationAPI.createBackup(d),
    onSuccess  : () => { queryClient.invalidateQueries(['backups']); setShowBackupModal(false); setBackupForm(emptyBackup); flash('Backup config created.') },
    onError    : (err) => setFormError(err.response?.data ? Object.values(err.response.data).flat().join(' ') : 'Failed.'),
  })

  const createWorkflowMutation = useMutation({
    mutationFn : (d) => automationAPI.createWorkflow(d),
    onSuccess  : () => { queryClient.invalidateQueries(['workflows']); setShowWorkflowModal(false); setWorkflowForm(emptyWorkflow); flash('Workflow created.') },
    onError    : (err) => setFormError(err.response?.data ? Object.values(err.response.data).flat().join(' ') : 'Failed.'),
  })

  const openCreateTask = () => { setTaskForm(emptyTask); setEditTask(null); setFormError(''); setShowTaskModal(true) }
  const openEditTask   = (t) => {
    setTaskForm({
      name: t.name, description: t.description || '',
      task_type: t.task_type, trigger_type: t.trigger_type,
      server: t.server || '', script: t.script || '', scheduled_at: t.scheduled_at || '',
    })
    setEditTask(t); setFormError(''); setShowTaskModal(true)
  }
  const closeTaskModal = () => { setShowTaskModal(false); setEditTask(null); setTaskForm(emptyTask); setFormError('') }

  const handleTaskChange = (e) => { setTaskForm({ ...taskForm, [e.target.name]: e.target.value }); setFormError('') }

  const handleTaskSubmit = (e) => {
    e.preventDefault()
    const payload = { ...taskForm, server: taskForm.server || null, scheduled_at: taskForm.scheduled_at || null }
    if (editTask) updateTaskMutation.mutate({ id: editTask.id, data: payload })
    else createTaskMutation.mutate(payload)
  }

  const filtered = tasks.filter(t => {
    const q = search.toLowerCase()
    return !search || t.name.toLowerCase().includes(q) || t.task_type.toLowerCase().includes(q)
  })

  const summaryCards = [
    { label: 'Total tasks',   value: summary?.total_tasks,    color: COLOR.gray   },
    { label: 'Running',       value: summary?.running,        color: COLOR.blue   },
    { label: 'Pending',       value: summary?.pending,        color: COLOR.muted  },
    { label: 'Completed',     value: summary?.completed,      color: COLOR.green  },
    { label: 'Failed',        value: summary?.failed,         color: COLOR.red    },
    { label: 'Workflows',     value: summary?.total_workflows, color: COLOR.purple },
  ]

  const tabs = [
    { key: 'tasks',     label: 'Tasks',     icon: Zap         },
    { key: 'backups',   label: 'Backups',   icon: HardDrive   },
    { key: 'workflows', label: 'Workflows', icon: GitBranch   },
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
          <h2 className="text-xl font-bold" style={{ color: COLOR.black }}>Automation & Scheduler</h2>
          <p className="text-sm mt-0.5" style={{ color: COLOR.muted }}>Manage tasks, backups, and workflows</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()}
                  className="p-2.5 rounded-xl hover:bg-gray-200 transition-colors"
                  style={{ background: COLOR.bg, color: COLOR.gray }}>
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => {
              if (activeTab === 'tasks')     openCreateTask()
              if (activeTab === 'backups')   setShowBackupModal(true)
              if (activeTab === 'workflows') setShowWorkflowModal(true)
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: COLOR.red }}
            onMouseEnter={e => e.currentTarget.style.background = COLOR.redDark}
            onMouseLeave={e => e.currentTarget.style.background = COLOR.red}>
            <Plus size={16} />
            {activeTab === 'tasks' ? 'Add task' : activeTab === 'backups' ? 'Add backup' : 'Add workflow'}
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

      {/* TASKS TAB */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: COLOR.muted }} />
              <input type="text" placeholder="Search tasks..."
                     value={search} onChange={e => setSearch(e.target.value)}
                     className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
                     style={{ background: COLOR.white, border: '1px solid #E5E5E5', color: COLOR.black }}
                     onFocus={e => e.target.style.borderColor = COLOR.red}
                     onBlur={e  => e.target.style.borderColor = '#E5E5E5'} />
            </div>
            {[
              { value: statusFilter, set: setStatusFilter, placeholder: 'All statuses', options: Object.keys(STATUS_MAP) },
              { value: typeFilter,   set: setTypeFilter,   placeholder: 'All types',    options: TASK_TYPES.map(t => t.value) },
            ].map(({ value, set, placeholder, options }, i) => (
              <div key={i} className="relative">
                <select value={value} onChange={e => set(e.target.value)}
                        className="pl-3 pr-8 py-2.5 rounded-xl text-sm outline-none cursor-pointer appearance-none"
                        style={{ background: COLOR.white, border: '1px solid #E5E5E5', color: COLOR.black, minWidth: '150px' }}>
                  <option value="">{placeholder}</option>
                  {options.map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1).replace('_',' ')}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: COLOR.muted }} />
              </div>
            ))}
          </div>

          <div className="rounded-2xl overflow-hidden" style={{ background: COLOR.white, border: '1px solid #F0F0F0' }}>
            <div className="grid grid-cols-12 gap-4 px-6 py-3 text-xs font-semibold uppercase tracking-wide"
                 style={{ background: '#F9F9F9', borderBottom: '1px solid #F0F0F0', color: COLOR.muted }}>
              <div className="col-span-4">Task</div>
              <div className="col-span-2">Type</div>
              <div className="col-span-2">Trigger</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>

            {loadingTasks && (
              <div className="flex items-center justify-center py-16 gap-3" style={{ color: COLOR.muted }}>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Loading tasks...
              </div>
            )}

            {!loadingTasks && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-3" style={{ color: COLOR.muted }}>
                <Zap size={40} strokeWidth={1} />
                <p className="text-sm">No tasks found</p>
                <button onClick={openCreateTask}
                        className="text-sm font-medium px-4 py-2 rounded-xl text-white mt-1"
                        style={{ background: COLOR.red }}>
                  Create first task
                </button>
              </div>
            )}

            {!loadingTasks && filtered.map((task, idx) => (
              <div key={task.id}
                   className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-gray-50 transition-colors"
                   style={{ borderBottom: idx < filtered.length - 1 ? '1px solid #F0F0F0' : 'none' }}>
                <div className="col-span-4 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: COLOR.black }}>{task.name}</p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: COLOR.muted }}>
                    {task.server_name || 'No server'} · {task.created_by_username}
                  </p>
                </div>
                <div className="col-span-2 text-sm capitalize" style={{ color: COLOR.gray }}>
                  {task.task_type?.replace('_',' ')}
                </div>
                <div className="col-span-2 text-sm capitalize" style={{ color: COLOR.gray }}>
                  {task.trigger_type}
                </div>
                <div className="col-span-2">
                  <StatusBadge status={task.status} />
                </div>
                <div className="col-span-2 flex items-center justify-end gap-1">
                  {task.status !== 'running' && task.status !== 'completed' && (
                    <button onClick={() => runTaskMutation.mutate(task.id)}
                            className="p-1.5 rounded-lg hover:bg-green-50 transition-colors"
                            style={{ color: COLOR.green }} title="Run">
                      <Play size={14} />
                    </button>
                  )}
                  {task.status === 'running' && (
                    <button onClick={() => cancelTaskMutation.mutate(task.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                            style={{ color: COLOR.red }} title="Cancel">
                      <Square size={14} />
                    </button>
                  )}
                  <button onClick={() => setViewLogs(task)}
                          className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                          style={{ color: COLOR.blue }} title="View logs">
                    <FileText size={14} />
                  </button>
                  <button onClick={() => openEditTask(task)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                          style={{ color: COLOR.gray }} title="Edit">
                    <Edit2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BACKUPS TAB */}
      {activeTab === 'backups' && (
        <div className="rounded-2xl overflow-hidden" style={{ background: COLOR.white, border: '1px solid #F0F0F0' }}>
          <div className="grid grid-cols-12 gap-4 px-6 py-3 text-xs font-semibold uppercase tracking-wide"
               style={{ background: '#F9F9F9', borderBottom: '1px solid #F0F0F0', color: COLOR.muted }}>
            <div className="col-span-3">Name</div>
            <div className="col-span-2">Server</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-2">Frequency</div>
            <div className="col-span-2">Last run</div>
            <div className="col-span-1 text-right">Actions</div>
          </div>

          {loadingBackups && (
            <div className="flex items-center justify-center py-12 gap-3" style={{ color: COLOR.muted }}>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              Loading backups...
            </div>
          )}

          {!loadingBackups && backups.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 gap-3" style={{ color: COLOR.muted }}>
              <HardDrive size={36} strokeWidth={1} />
              <p className="text-sm">No backup configurations</p>
              <button onClick={() => setShowBackupModal(true)}
                      className="text-sm font-medium px-4 py-2 rounded-xl text-white"
                      style={{ background: COLOR.red }}>
                Create first backup
              </button>
            </div>
          )}

          {!loadingBackups && backups.map((backup, idx) => (
            <div key={backup.id}
                 className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-gray-50 transition-colors"
                 style={{ borderBottom: idx < backups.length - 1 ? '1px solid #F0F0F0' : 'none' }}>
              <div className="col-span-3">
                <p className="text-sm font-medium" style={{ color: COLOR.black }}>{backup.name}</p>
                <p className="text-xs" style={{ color: COLOR.muted }}>Retain {backup.retention_days} days</p>
              </div>
              <div className="col-span-2 text-sm" style={{ color: COLOR.gray }}>{backup.server_name || '—'}</div>
              <div className="col-span-2 text-sm capitalize" style={{ color: COLOR.gray }}>{backup.backup_type}</div>
              <div className="col-span-2 text-sm capitalize" style={{ color: COLOR.gray }}>{backup.frequency}</div>
              <div className="col-span-2 text-xs" style={{ color: COLOR.muted }}>
                {backup.last_run ? new Date(backup.last_run).toLocaleString() : 'Never'}
              </div>
              <div className="col-span-1 flex justify-end">
                <span className="px-2 py-0.5 rounded-full text-xs"
                      style={{ background: backup.is_active ? 'rgba(5,150,105,0.1)' : 'rgba(107,114,128,0.1)', color: backup.is_active ? COLOR.green : COLOR.muted }}>
                  {backup.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* WORKFLOWS TAB */}
      {activeTab === 'workflows' && (
        <div className="rounded-2xl overflow-hidden" style={{ background: COLOR.white, border: '1px solid #F0F0F0' }}>
          <div className="grid grid-cols-12 gap-4 px-6 py-3 text-xs font-semibold uppercase tracking-wide"
               style={{ background: '#F9F9F9', borderBottom: '1px solid #F0F0F0', color: COLOR.muted }}>
            <div className="col-span-4">Workflow</div>
            <div className="col-span-3">Description</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Created by</div>
            <div className="col-span-1 text-right">Steps</div>
          </div>

          {loadingWorkflows && (
            <div className="flex items-center justify-center py-12 gap-3" style={{ color: COLOR.muted }}>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              Loading workflows...
            </div>
          )}

          {!loadingWorkflows && workflows.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 gap-3" style={{ color: COLOR.muted }}>
              <GitBranch size={36} strokeWidth={1} />
              <p className="text-sm">No workflows yet</p>
              <button onClick={() => setShowWorkflowModal(true)}
                      className="text-sm font-medium px-4 py-2 rounded-xl text-white"
                      style={{ background: COLOR.red }}>
                Create first workflow
              </button>
            </div>
          )}

          {!loadingWorkflows && workflows.map((wf, idx) => (
            <div key={wf.id}
                 className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-gray-50 transition-colors"
                 style={{ borderBottom: idx < workflows.length - 1 ? '1px solid #F0F0F0' : 'none' }}>
              <div className="col-span-4">
                <p className="text-sm font-medium" style={{ color: COLOR.black }}>{wf.name}</p>
              </div>
              <div className="col-span-3 text-sm truncate" style={{ color: COLOR.muted }}>
                {wf.description || '—'}
              </div>
              <div className="col-span-2">
                <span className="px-2.5 py-1 rounded-full text-xs capitalize"
                      style={{
                        background: wf.status === 'active' ? 'rgba(5,150,105,0.1)' : wf.status === 'draft' ? 'rgba(107,114,128,0.1)' : 'rgba(217,119,6,0.1)',
                        color: wf.status === 'active' ? COLOR.green : wf.status === 'draft' ? COLOR.muted : COLOR.orange,
                      }}>
                  {wf.status}
                </span>
              </div>
              <div className="col-span-2 text-sm" style={{ color: COLOR.gray }}>
                {wf.created_by_username}
              </div>
              <div className="col-span-1 text-right text-sm font-medium" style={{ color: COLOR.black }}>
                {wf.steps?.length || 0}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Task Logs Modal */}
      {viewLogs && (
        <Modal title={`Logs — ${viewLogs.name}`} onClose={() => setViewLogs(null)} wide>
          <div className="space-y-3">
            {logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2" style={{ color: COLOR.muted }}>
                <FileText size={32} strokeWidth={1} />
                <p className="text-sm">No logs yet for this task</p>
              </div>
            ) : (
              [...logs].reverse().map(log => {
                const l = LOG_LEVEL_MAP[log.level] || LOG_LEVEL_MAP.info
                return (
                  <div key={log.id} className="p-3 rounded-xl text-sm"
                       style={{ background: l.bg, border: `1px solid ${l.color}22` }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold uppercase" style={{ color: l.color }}>{log.level}</span>
                      <span className="text-xs" style={{ color: COLOR.muted }}>
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p style={{ color: COLOR.black }}>{log.message}</p>
                    {log.output && (
                      <pre className="mt-2 text-xs p-2 rounded-lg overflow-x-auto"
                           style={{ background: 'rgba(0,0,0,0.05)', color: COLOR.gray }}>
                        {log.output}
                      </pre>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </Modal>
      )}

      {/* Create Task Modal */}
      {showTaskModal && (
        <Modal title={editTask ? 'Edit task' : 'Create task'} onClose={closeTaskModal}>
          <form onSubmit={handleTaskSubmit} className="space-y-4">
            {formError && (
              <div className="flex items-start gap-2 p-3 rounded-xl text-sm"
                   style={{ background: 'rgba(192,39,45,0.08)', color: COLOR.red, border: '1px solid rgba(192,39,45,0.2)' }}>
                <AlertCircle size={15} className="flex-shrink-0 mt-0.5" /> {formError}
              </div>
            )}
            <Field label="Task name" name="name" value={taskForm.name}
                   onChange={handleTaskChange} placeholder="e.g. Daily health check" required />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Task type" name="task_type" value={taskForm.task_type}
                     onChange={handleTaskChange} as="select" options={TASK_TYPES} />
              <Field label="Trigger" name="trigger_type" value={taskForm.trigger_type}
                     onChange={handleTaskChange} as="select" options={TRIGGER_TYPES} />
            </div>
            <Field label="Server (optional)" name="server" value={taskForm.server}
                   onChange={handleTaskChange} as="select"
                   options={[{ value: '', label: 'No specific server' }, ...servers.map(s => ({ value: s.id, label: s.name }))]} />
            <Field label="Description" name="description" value={taskForm.description}
                   onChange={handleTaskChange} as="textarea" placeholder="Optional description..." rows={2} />
            {taskForm.task_type === 'custom_script' && (
              <Field label="Script / command" name="script" value={taskForm.script}
                     onChange={handleTaskChange} as="textarea" placeholder="#!/bin/bash\n..." rows={4} />
            )}
            {taskForm.trigger_type === 'scheduled' && (
              <Field label="Scheduled at" name="scheduled_at" type="datetime-local"
                     value={taskForm.scheduled_at} onChange={handleTaskChange} />
            )}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={closeTaskModal}
                      className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                      style={{ background: COLOR.bg, color: COLOR.gray }}>
                Cancel
              </button>
              <button type="submit"
                      disabled={createTaskMutation.isPending || updateTaskMutation.isPending}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                      style={{ background: COLOR.red }}
                      onMouseEnter={e => e.currentTarget.style.background = COLOR.redDark}
                      onMouseLeave={e => e.currentTarget.style.background = COLOR.red}>
                {createTaskMutation.isPending || updateTaskMutation.isPending ? 'Saving...' : editTask ? 'Save changes' : 'Create task'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Backup Modal */}
      {showBackupModal && (
        <Modal title="Create backup config" onClose={() => { setShowBackupModal(false); setBackupForm(emptyBackup); setFormError('') }}>
          <form onSubmit={(e) => { e.preventDefault(); createBackupMutation.mutate({ ...backupForm, server: backupForm.server || null }) }}
                className="space-y-4">
            {formError && (
              <div className="flex items-start gap-2 p-3 rounded-xl text-sm"
                   style={{ background: 'rgba(192,39,45,0.08)', color: COLOR.red, border: '1px solid rgba(192,39,45,0.2)' }}>
                <AlertCircle size={15} className="flex-shrink-0 mt-0.5" /> {formError}
              </div>
            )}
            <Field label="Backup name" name="name" value={backupForm.name}
                   onChange={e => setBackupForm({ ...backupForm, name: e.target.value })}
                   placeholder="e.g. Daily DB Backup" required />
            <Field label="Server" name="server" value={backupForm.server}
                   onChange={e => setBackupForm({ ...backupForm, server: e.target.value })}
                   as="select" options={[{ value: '', label: 'Select server...' }, ...servers.map(s => ({ value: s.id, label: s.name }))]} />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Backup type" name="backup_type" value={backupForm.backup_type}
                     onChange={e => setBackupForm({ ...backupForm, backup_type: e.target.value })}
                     as="select" options={BACKUP_TYPES.map(t => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))} />
              <Field label="Frequency" name="frequency" value={backupForm.frequency}
                     onChange={e => setBackupForm({ ...backupForm, frequency: e.target.value })}
                     as="select" options={BACKUP_FREQUENCIES.map(f => ({ value: f, label: f.charAt(0).toUpperCase() + f.slice(1) }))} />
            </div>
            <Field label="Destination path" name="destination" value={backupForm.destination}
                   onChange={e => setBackupForm({ ...backupForm, destination: e.target.value })}
                   placeholder="/backups/db or s3://bucket/path" required />
            <Field label="Retention (days)" name="retention_days" type="number" value={backupForm.retention_days}
                   onChange={e => setBackupForm({ ...backupForm, retention_days: e.target.value })}
                   placeholder="30" />
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => { setShowBackupModal(false); setBackupForm(emptyBackup) }}
                      className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                      style={{ background: COLOR.bg, color: COLOR.gray }}>
                Cancel
              </button>
              <button type="submit"
                      disabled={createBackupMutation.isPending}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                      style={{ background: COLOR.red }}>
                {createBackupMutation.isPending ? 'Saving...' : 'Create backup'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Workflow Modal */}
      {showWorkflowModal && (
        <Modal title="Create workflow" onClose={() => { setShowWorkflowModal(false); setWorkflowForm(emptyWorkflow); setFormError('') }}>
          <form onSubmit={(e) => { e.preventDefault(); createWorkflowMutation.mutate(workflowForm) }}
                className="space-y-4">
            {formError && (
              <div className="flex items-start gap-2 p-3 rounded-xl text-sm"
                   style={{ background: 'rgba(192,39,45,0.08)', color: COLOR.red, border: '1px solid rgba(192,39,45,0.2)' }}>
                <AlertCircle size={15} className="flex-shrink-0 mt-0.5" /> {formError}
              </div>
            )}
            <Field label="Workflow name" name="name" value={workflowForm.name}
                   onChange={e => setWorkflowForm({ ...workflowForm, name: e.target.value })}
                   placeholder="e.g. Server maintenance workflow" required />
            <Field label="Description" name="description" value={workflowForm.description || ''}
                   onChange={e => setWorkflowForm({ ...workflowForm, description: e.target.value })}
                   as="textarea" placeholder="Describe this workflow..." rows={3} />
            <Field label="Status" name="status" value={workflowForm.status}
                   onChange={e => setWorkflowForm({ ...workflowForm, status: e.target.value })}
                   as="select" options={[
                     { value: 'draft',    label: 'Draft'    },
                     { value: 'active',   label: 'Active'   },
                     { value: 'inactive', label: 'Inactive' },
                   ]} />
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => { setShowWorkflowModal(false); setWorkflowForm(emptyWorkflow) }}
                      className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                      style={{ background: COLOR.bg, color: COLOR.gray }}>
                Cancel
              </button>
              <button type="submit"
                      disabled={createWorkflowMutation.isPending}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                      style={{ background: COLOR.red }}>
                {createWorkflowMutation.isPending ? 'Saving...' : 'Create workflow'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}