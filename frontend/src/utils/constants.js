export const API_BASE_URL = '/api'

export const ROLES = {
  ADMIN    : 'admin',
  OPERATOR : 'operator',
  VIEWER   : 'viewer',
  AUDITOR  : 'auditor',
}
export const BRAND = {
  red       : '#C0272D',
  redDark   : '#9B1C21',
  redDeep   : '#7A1318',
  black     : '#1A1A1A',
  charcoal  : '#2C2C2C',
  gray      : '#3D3D3D',
  gold      : '#F5C842',
  white     : '#FFFFFF',
  offWhite  : '#F0F0F0',
}

export const STATUS_COLORS = {
  online      : 'text-green-600  bg-green-50  border-green-200',
  offline     : 'text-red-600    bg-red-50    border-red-200',
  warning     : 'text-yellow-600 bg-yellow-50 border-yellow-200',
  critical    : 'text-red-700    bg-red-100   border-red-300',
  maintenance : 'text-blue-600   bg-blue-50   border-blue-200',
  active      : 'text-green-600  bg-green-50  border-green-200',
  resolved    : 'text-gray-600   bg-gray-50   border-gray-200',
  pending     : 'text-yellow-600 bg-yellow-50 border-yellow-200',
  running     : 'text-blue-600   bg-blue-50   border-blue-200',
  failed      : 'text-red-600    bg-red-50    border-red-200',
  open        : 'text-orange-600 bg-orange-50 border-orange-200',
  in_progress : 'text-blue-600   bg-blue-50   border-blue-200',
  closed      : 'text-gray-600   bg-gray-50   border-gray-200',
}

export const SEVERITY_COLORS = {
  info     : 'text-blue-600   bg-blue-50   border-blue-200',
  warning  : 'text-yellow-600 bg-yellow-50 border-yellow-200',
  critical : 'text-red-600    bg-red-50    border-red-200',
  high     : 'text-red-600    bg-red-50    border-red-200',
  medium   : 'text-yellow-600 bg-yellow-50 border-yellow-200',
  low      : 'text-green-600  bg-green-50  border-green-200',
}