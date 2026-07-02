// Which roles can access each page. Admin implicitly has access to everything.
export const PAGE_ROLES = {
  '/'           : ['admin', 'operator', 'auditor', 'viewer'],
  '/monitoring' : ['admin', 'operator', 'auditor', 'viewer'],
  '/alerts'     : ['admin', 'operator', 'auditor', 'viewer'],
  '/incidents'  : ['admin', 'operator', 'auditor', 'viewer'],
  '/automation' : ['admin', 'operator'],
  '/analytics'  : ['admin', 'operator', 'auditor', 'viewer'],
  '/reports'    : ['admin', 'operator', 'auditor'],
  '/compliance' : ['admin', 'auditor'],
  '/users'      : ['admin'],
}

export function canAccess(role, path) {
  const allowed = PAGE_ROLES[path]
  return allowed ? allowed.includes(role) : true
}
