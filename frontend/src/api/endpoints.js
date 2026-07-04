import api from './axios'

// Auth
export const authAPI = {
  login         : (data)       => api.post('/auth/login/',           data),
  register      : (data)       => api.post('/auth/register/',        data),
  logout        : (data)       => api.post('/auth/logout/',          data),
  refreshToken  : (data)       => api.post('/auth/token/refresh/',   data),
  changePassword: (data)       => api.post('/auth/change-password/', data),
  me            : ()           => api.get('/users/me/'),
  updateMe      : (data)       => api.patch('/users/me/',            data),
}

// Users
export const usersAPI = {
  list   : ()         => api.get('/users/'),
  detail : (id)       => api.get(`/users/${id}/`),
  update : (id, data) => api.patch(`/users/${id}/`, data),
  delete : (id)       => api.delete(`/users/${id}/`),
}

// Monitoring
export const monitoringAPI = {
  summary       : ()                  => api.get('/monitoring/summary/'),
  servers       : (params)            => api.get('/monitoring/servers/',        { params }),
  serverDetail  : (id)                => api.get(`/monitoring/servers/${id}/`),
  createServer  : (data)              => api.post('/monitoring/servers/',       data),
  updateServer  : (id, data)          => api.patch(`/monitoring/servers/${id}/`, data),
  deleteServer  : (id)                => api.delete(`/monitoring/servers/${id}/`),
  metrics       : (serverId, params)  => api.get(`/monitoring/servers/${serverId}/metrics/`, { params }),
  stats         : (serverId, params)  => api.get(`/monitoring/servers/${serverId}/stats/`,   { params }),
  devices       : (params)            => api.get('/monitoring/devices/',        { params }),
  createDevice  : (data)              => api.post('/monitoring/devices/',       data),
}

// Alerts
export const alertsAPI = {
  summary        : ()         => api.get('/alerts/summary/'),
  list           : (params)   => api.get('/alerts/',                  { params }),
  detail         : (id)       => api.get(`/alerts/${id}/`),
  create         : (data)     => api.post('/alerts/',                 data),
  acknowledge    : (id)       => api.post(`/alerts/${id}/acknowledge/`),
  resolve        : (id)       => api.post(`/alerts/${id}/resolve/`),
  rules          : (params)   => api.get('/alerts/rules/',            { params }),
  createRule     : (data)     => api.post('/alerts/rules/',           data),
  updateRule     : (id, data) => api.patch(`/alerts/rules/${id}/`,    data),
  deleteRule     : (id)       => api.delete(`/alerts/rules/${id}/`),
  channels       : ()         => api.get('/alerts/channels/'),
  createChannel  : (data)     => api.post('/alerts/channels/',        data),
}

// Notifications
export const notificationsAPI = {
  list         : (params) => api.get('/alerts/notifications/',              { params }),
  unreadCount  : ()       => api.get('/alerts/notifications/unread-count/'),
  markRead     : (id)     => api.post(`/alerts/notifications/${id}/read/`),
  markAllRead  : ()       => api.post('/alerts/notifications/mark-all-read/'),
}

// Incidents
export const incidentsAPI = {
  summary  : ()           => api.get('/incidents/summary/'),
  list     : (params)     => api.get('/incidents/',               { params }),
  detail   : (id)         => api.get(`/incidents/${id}/`),
  create   : (data)       => api.post('/incidents/',              data),
  update   : (id, data)   => api.patch(`/incidents/${id}/`,       data),
  assign   : (id, data)   => api.post(`/incidents/${id}/assign/`, data),
  resolve  : (id, data)   => api.post(`/incidents/${id}/resolve/`, data),
  close    : (id)         => api.post(`/incidents/${id}/close/`),
  escalate : (id, data)   => api.post(`/incidents/${id}/escalate/`, data),
  comments : (id)         => api.get(`/incidents/${id}/comments/`),
  addComment: (id, data)  => api.post(`/incidents/${id}/comments/`, data),
}

// Automation
export const automationAPI = {
  summary         : ()           => api.get('/automation/summary/'),
  tasks           : (params)     => api.get('/automation/tasks/',              { params }),
  taskDetail      : (id)         => api.get(`/automation/tasks/${id}/`),
  createTask      : (data)       => api.post('/automation/tasks/',             data),
  updateTask      : (id, data)   => api.patch(`/automation/tasks/${id}/`,      data),
  runTask         : (id)         => api.post(`/automation/tasks/${id}/run/`),
  completeTask    : (id, data)   => api.post(`/automation/tasks/${id}/complete/`, data),
  cancelTask      : (id)         => api.post(`/automation/tasks/${id}/cancel/`),
  taskLogs        : (id)         => api.get(`/automation/tasks/${id}/logs/`),
  backups         : (params)     => api.get('/automation/backups/',            { params }),
  createBackup    : (data)       => api.post('/automation/backups/',           data),
  updateBackup    : (id, data)   => api.patch(`/automation/backups/${id}/`,    data),
  workflows       : (params)     => api.get('/automation/workflows/',          { params }),
  createWorkflow  : (data)       => api.post('/automation/workflows/',         data),
}

// Analytics
export const analyticsAPI = {
  summary       : ()           => api.get('/analytics/summary/'),
  anomalies     : (params)     => api.get('/analytics/anomalies/',             { params }),
  anomalyDetail : (id)         => api.get(`/analytics/anomalies/${id}/`),
  reviewAnomaly : (id, data)   => api.post(`/analytics/anomalies/${id}/review/`, data),
  insights      : (params)     => api.get('/analytics/insights/',              { params }),
  insightDetail : (id)         => api.get(`/analytics/insights/${id}/`),
  trends        : (params)     => api.get('/analytics/trends/',                { params }),
}

// Reports
export const reportsAPI = {
  summary          : ()         => api.get('/reports/summary/'),
  list             : (params)   => api.get('/reports/',                       { params }),
  detail           : (id)       => api.get(`/reports/${id}/`),
  create           : (data)     => api.post('/reports/',                      data),
  generate         : (id)       => api.post(`/reports/${id}/generate/`),
  download         : (id)       => api.get(`/reports/${id}/download/`,        { responseType: 'blob' }),
  scheduled        : ()         => api.get('/reports/scheduled/'),
  createScheduled  : (data)     => api.post('/reports/scheduled/',            data),
  updateScheduled  : (id, data) => api.patch(`/reports/scheduled/${id}/`,     data),
}

// Audit
export const auditAPI = {
  summary : ()       => api.get('/audit/summary/'),
  list    : (params) => api.get('/audit/logs/', { params }),
}

// Compliance
export const complianceAPI = {
  summary         : ()           => api.get('/compliance/summary/'),
  policies        : (params)     => api.get('/compliance/policies/',           { params }),
  policyDetail    : (id)         => api.get(`/compliance/policies/${id}/`),
  createPolicy    : (data)       => api.post('/compliance/policies/',          data),
  updatePolicy    : (id, data)   => api.patch(`/compliance/policies/${id}/`,   data),
  checks          : (policyId)   => api.get(`/compliance/policies/${policyId}/checks/`),
  addCheck        : (policyId, data) => api.post(`/compliance/policies/${policyId}/checks/`, data),
  violations      : (params)     => api.get('/compliance/violations/',         { params }),
  resolveViolation: (id)         => api.post(`/compliance/violations/${id}/resolve/`),
}