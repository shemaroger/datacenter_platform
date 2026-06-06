import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Users, Plus, Search, Edit2, Trash2, Shield,
  Mail, Phone, Building, ChevronDown, X, Check,
  AlertCircle, User, RefreshCw
} from 'lucide-react'
import { usersAPI, authAPI } from '../../api/endpoints'

const ROLES = ['admin', 'operator', 'viewer', 'auditor']

const ROLE_COLORS = {
  admin    : { bg: 'rgba(192,39,45,0.12)',  text: '#C0272D',  border: 'rgba(192,39,45,0.3)'  },
  operator : { bg: 'rgba(245,200,66,0.12)', text: '#B8960A',  border: 'rgba(245,200,66,0.3)' },
  viewer   : { bg: 'rgba(59,130,246,0.12)', text: '#2563EB',  border: 'rgba(59,130,246,0.3)' },
  auditor  : { bg: 'rgba(16,185,129,0.12)', text: '#059669',  border: 'rgba(16,185,129,0.3)' },
}

const STATUS_COLORS = {
  true  : { bg: 'rgba(16,185,129,0.1)',  text: '#059669', border: 'rgba(16,185,129,0.3)' },
  false : { bg: 'rgba(107,114,128,0.1)', text: '#6B7280', border: 'rgba(107,114,128,0.3)' },
}

function Badge({ label, colors }) {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize"
          style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}>
      {label}
    </span>
  )
}

function Avatar({ user, size = 36 }) {
  const initials = user?.first_name
    ? `${user.first_name[0]}${user.last_name?.[0] || ''}`.toUpperCase()
    : user?.username?.[0]?.toUpperCase() || 'U'
  return (
    <div className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
         style={{ width: size, height: size, background: '#C0272D', fontSize: size * 0.35 }}>
      {initials}
    </div>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="w-full max-w-lg rounded-2xl shadow-2xl"
           style={{ background: '#FFFFFF', border: '1px solid #E5E5E5' }}>
        <div className="flex items-center justify-between px-6 py-4"
             style={{ borderBottom: '1px solid #F0F0F0' }}>
          <h3 className="font-bold text-base" style={{ color: '#1A1A1A' }}>{title}</h3>
          <button onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                  style={{ color: '#3D3D3D' }}>
            <X size={18} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

function InputField({ label, name, value, onChange, type = 'text', placeholder, required }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5" style={{ color: '#3D3D3D' }}>
        {label} {required && <span style={{ color: '#C0272D' }}>*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all"
        style={{ background: '#F0F0F0', border: '1px solid #E5E5E5', color: '#1A1A1A' }}
        onFocus={e => e.target.style.borderColor = '#C0272D'}
        onBlur={e  => e.target.style.borderColor = '#E5E5E5'}
      />
    </div>
  )
}

function SelectField({ label, name, value, onChange, options }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5" style={{ color: '#3D3D3D' }}>{label}</label>
      <select
        name={name}
        value={value}
        onChange={onChange}
        className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all cursor-pointer"
        style={{ background: '#F0F0F0', border: '1px solid #E5E5E5', color: '#1A1A1A' }}
        onFocus={e => e.target.style.borderColor = '#C0272D'}
        onBlur={e  => e.target.style.borderColor = '#E5E5E5'}>
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

const emptyForm = {
  username: '', email: '', first_name: '', last_name: '',
  password: '', password2: '', role: 'viewer', department: '', phone: '', is_active: true,
}

export default function UsersPage() {
  const queryClient = useQueryClient()

  const [search,        setSearch]        = useState('')
  const [roleFilter,    setRoleFilter]    = useState('')
  const [showModal,     setShowModal]     = useState(false)
  const [editUser,      setEditUser]      = useState(null)
  const [deleteUser,    setDeleteUser]    = useState(null)
  const [form,          setForm]          = useState(emptyForm)
  const [formError,     setFormError]     = useState('')
  const [successMsg,    setSuccessMsg]    = useState('')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey : ['users'],
    queryFn  : () => usersAPI.list().then(r => r.data),
  })

  const users = data?.results || data || []

  const createMutation = useMutation({
    mutationFn : (d) => authAPI.register(d),
    onSuccess  : () => {
      queryClient.invalidateQueries(['users'])
      closeModal()
      flash('User created successfully.')
    },
    onError: (err) => {
      const d = err.response?.data
      setFormError(d ? Object.values(d).flat().join(' ') : 'Failed to create user.')
    },
  })

  const updateMutation = useMutation({
    mutationFn : ({ id, data }) => usersAPI.update(id, data),
    onSuccess  : () => {
      queryClient.invalidateQueries(['users'])
      closeModal()
      flash('User updated successfully.')
    },
    onError: (err) => {
      const d = err.response?.data
      setFormError(d ? Object.values(d).flat().join(' ') : 'Failed to update user.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn : (id) => usersAPI.delete(id),
    onSuccess  : () => {
      queryClient.invalidateQueries(['users'])
      setDeleteUser(null)
      flash('User deleted successfully.')
    },
  })

  const flash = (msg) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(''), 3000)
  }

  const openCreate = () => {
    setForm(emptyForm)
    setFormError('')
    setEditUser(null)
    setShowModal(true)
  }

  const openEdit = (user) => {
    setForm({
      username   : user.username,
      email      : user.email,
      first_name : user.first_name  || '',
      last_name  : user.last_name   || '',
      role       : user.role,
      department : user.department  || '',
      phone      : user.phone       || '',
      is_active  : user.is_active,
      password   : '',
      password2  : '',
    })
    setFormError('')
    setEditUser(user)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditUser(null)
    setForm(emptyForm)
    setFormError('')
  }

  const handleChange = (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm({ ...form, [e.target.name]: val })
    setFormError('')
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!editUser && form.password !== form.password2) {
      setFormError('Passwords do not match.')
      return
    }
    if (editUser) {
      const payload = { ...form }
      delete payload.password
      delete payload.password2
      updateMutation.mutate({ id: editUser.id, data: payload })
    } else {
      createMutation.mutate(form)
    }
  }

  const filtered = users.filter(u => {
    const matchSearch = !search ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.first_name + ' ' + u.last_name).toLowerCase().includes(search.toLowerCase())
    const matchRole = !roleFilter || u.role === roleFilter
    return matchSearch && matchRole
  })

  const stats = [
    { label: 'Total users',    value: users.length,                                         icon: Users  },
    { label: 'Admins',         value: users.filter(u => u.role === 'admin').length,          icon: Shield },
    { label: 'Active',         value: users.filter(u => u.is_active).length,                icon: Check  },
    { label: 'Departments',    value: [...new Set(users.map(u => u.department).filter(Boolean))].length, icon: Building },
  ]

  return (
    <div className="space-y-6">

      {/* Success toast */}
      {successMsg && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white"
             style={{ background: '#059669' }}>
          <Check size={16} />
          {successMsg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold" style={{ color: '#1A1A1A' }}>User Management</h2>
          <p className="text-sm mt-0.5" style={{ color: '#9B9B9B' }}>
            Manage platform users, roles, and permissions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="p-2.5 rounded-xl transition-colors hover:bg-gray-200"
            style={{ background: '#F0F0F0', color: '#3D3D3D' }}>
            <RefreshCw size={16} />
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
            style={{ background: '#C0272D' }}
            onMouseEnter={e => e.currentTarget.style.background = '#9B1C21'}
            onMouseLeave={e => e.currentTarget.style.background = '#C0272D'}>
            <Plus size={16} />
            Add user
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label}
               className="rounded-2xl p-4 flex items-center gap-4"
               style={{ background: '#FFFFFF', border: '1px solid #F0F0F0' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                 style={{ background: 'rgba(192,39,45,0.1)' }}>
              <Icon size={18} style={{ color: '#C0272D' }} />
            </div>
            <div>
              <div className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>{value}</div>
              <div className="text-xs" style={{ color: '#9B9B9B' }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: '#9B9B9B' }} />
          <input
            type="text"
            placeholder="Search by name, username or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: '#FFFFFF', border: '1px solid #E5E5E5', color: '#1A1A1A' }}
            onFocus={e => e.target.style.borderColor = '#C0272D'}
            onBlur={e  => e.target.style.borderColor = '#E5E5E5'}
          />
        </div>
        <div className="relative">
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="pl-3 pr-8 py-2.5 rounded-xl text-sm outline-none cursor-pointer appearance-none"
            style={{ background: '#FFFFFF', border: '1px solid #E5E5E5', color: '#1A1A1A', minWidth: '140px' }}>
            <option value="">All roles</option>
            {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                       style={{ color: '#9B9B9B' }} />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden"
           style={{ background: '#FFFFFF', border: '1px solid #F0F0F0' }}>

        {/* Table header */}
        <div className="grid grid-cols-12 gap-4 px-6 py-3 text-xs font-semibold uppercase tracking-wide"
             style={{ background: '#F9F9F9', borderBottom: '1px solid #F0F0F0', color: '#9B9B9B' }}>
          <div className="col-span-4">User</div>
          <div className="col-span-2">Role</div>
          <div className="col-span-2">Department</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-16 gap-3"
               style={{ color: '#9B9B9B' }}>
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            Loading users...
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="flex items-center justify-center gap-2 py-16 text-sm"
               style={{ color: '#C0272D' }}>
            <AlertCircle size={16} />
            Failed to load users. Check your connection.
          </div>
        )}

        {/* Empty */}
        {!isLoading && !isError && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3"
               style={{ color: '#9B9B9B' }}>
            <User size={40} strokeWidth={1} />
            <p className="text-sm">No users found</p>
            {search && (
              <button onClick={() => setSearch('')}
                      className="text-xs underline"
                      style={{ color: '#C0272D' }}>
                Clear search
              </button>
            )}
          </div>
        )}

        {/* Rows */}
        {!isLoading && filtered.map((user, idx) => (
          <div
            key={user.id}
            className="grid grid-cols-12 gap-4 px-6 py-4 items-center transition-colors hover:bg-gray-50"
            style={{ borderBottom: idx < filtered.length - 1 ? '1px solid #F0F0F0' : 'none' }}>

            {/* User */}
            <div className="col-span-4 flex items-center gap-3">
              <Avatar user={user} size={38} />
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate" style={{ color: '#1A1A1A' }}>
                  {user.first_name
                    ? `${user.first_name} ${user.last_name}`
                    : user.username}
                </div>
                <div className="text-xs truncate flex items-center gap-1" style={{ color: '#9B9B9B' }}>
                  <Mail size={11} />
                  {user.email || user.username}
                </div>
              </div>
            </div>

            {/* Role */}
            <div className="col-span-2">
              <Badge
                label={user.role}
                colors={ROLE_COLORS[user.role] || ROLE_COLORS.viewer}
              />
            </div>

            {/* Department */}
            <div className="col-span-2 text-sm" style={{ color: '#3D3D3D' }}>
              {user.department ? (
                <span className="flex items-center gap-1">
                  <Building size={12} style={{ color: '#9B9B9B' }} />
                  {user.department}
                </span>
              ) : (
                <span style={{ color: '#C8C8C8' }}>—</span>
              )}
            </div>

            {/* Status */}
            <div className="col-span-2">
              <Badge
                label={user.is_active ? 'Active' : 'Inactive'}
                colors={STATUS_COLORS[user.is_active]}
              />
            </div>

            {/* Actions */}
            <div className="col-span-2 flex items-center justify-end gap-2">
              <button
                onClick={() => openEdit(user)}
                className="p-2 rounded-lg transition-colors hover:bg-blue-50"
                style={{ color: '#2563EB' }}
                title="Edit user">
                <Edit2 size={15} />
              </button>
              <button
                onClick={() => setDeleteUser(user)}
                className="p-2 rounded-lg transition-colors hover:bg-red-50"
                style={{ color: '#C0272D' }}
                title="Delete user">
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Results count */}
      {!isLoading && filtered.length > 0 && (
        <p className="text-xs text-right" style={{ color: '#9B9B9B' }}>
          Showing {filtered.length} of {users.length} users
        </p>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <Modal
          title={editUser ? 'Edit user' : 'Add new user'}
          onClose={closeModal}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="flex items-start gap-2 p-3 rounded-xl text-sm"
                   style={{ background: 'rgba(192,39,45,0.08)', color: '#C0272D', border: '1px solid rgba(192,39,45,0.2)' }}>
                <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                {formError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <InputField label="First name" name="first_name" value={form.first_name}
                          onChange={handleChange} placeholder="John" />
              <InputField label="Last name"  name="last_name"  value={form.last_name}
                          onChange={handleChange} placeholder="Doe" />
            </div>

            <InputField label="Username" name="username" value={form.username}
                        onChange={handleChange} placeholder="johndoe" required
                        disabled={!!editUser} />

            <InputField label="Email" name="email" type="email" value={form.email}
                        onChange={handleChange} placeholder="john@example.com" required />

            <div className="grid grid-cols-2 gap-4">
              <SelectField
                label="Role" name="role" value={form.role} onChange={handleChange}
                options={ROLES.map(r => ({ value: r, label: r.charAt(0).toUpperCase() + r.slice(1) }))}
              />
              <InputField label="Department" name="department" value={form.department}
                          onChange={handleChange} placeholder="e.g. IT Ops" />
            </div>

            <InputField label="Phone" name="phone" value={form.phone}
                        onChange={handleChange} placeholder="+1 (555) 000-0000" />

            {!editUser && (
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Password" name="password" type="password"
                            value={form.password} onChange={handleChange}
                            placeholder="••••••••" required />
                <InputField label="Confirm password" name="password2" type="password"
                            value={form.password2} onChange={handleChange}
                            placeholder="••••••••" required />
              </div>
            )}

            {/* Active toggle */}
            <div className="flex items-center justify-between py-2 px-3 rounded-xl"
                 style={{ background: '#F9F9F9', border: '1px solid #F0F0F0' }}>
              <span className="text-sm font-medium" style={{ color: '#3D3D3D' }}>Active account</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" name="is_active" checked={form.is_active}
                       onChange={handleChange} className="sr-only" />
                <div className="w-10 h-5 rounded-full transition-colors"
                     style={{ background: form.is_active ? '#C0272D' : '#D1D5DB' }}>
                  <div className="w-4 h-4 bg-white rounded-full shadow transition-transform mt-0.5"
                       style={{ transform: form.is_active ? 'translateX(22px)' : 'translateX(2px)' }} />
                </div>
              </label>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={closeModal}
                      className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors"
                      style={{ background: '#F0F0F0', color: '#3D3D3D' }}>
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
                style={{ background: '#C0272D', opacity: (createMutation.isPending || updateMutation.isPending) ? 0.7 : 1 }}
                onMouseEnter={e => e.currentTarget.style.background = '#9B1C21'}
                onMouseLeave={e => e.currentTarget.style.background = '#C0272D'}>
                {createMutation.isPending || updateMutation.isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4"/>
                      <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Saving...
                  </span>
                ) : editUser ? 'Save changes' : 'Create user'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirm Modal */}
      {deleteUser && (
        <Modal title="Delete user" onClose={() => setDeleteUser(null)}>
          <div className="text-center space-y-4">
            <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center"
                 style={{ background: 'rgba(192,39,45,0.1)' }}>
              <Trash2 size={24} style={{ color: '#C0272D' }} />
            </div>
            <div>
              <p className="font-semibold text-base" style={{ color: '#1A1A1A' }}>
                Delete {deleteUser.first_name
                  ? `${deleteUser.first_name} ${deleteUser.last_name}`
                  : deleteUser.username}?
              </p>
              <p className="text-sm mt-1" style={{ color: '#9B9B9B' }}>
                This action cannot be undone. All data associated with this user will be permanently removed.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setDeleteUser(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: '#F0F0F0', color: '#3D3D3D' }}>
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteUser.id)}
                disabled={deleteMutation.isPending}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ background: '#C0272D', opacity: deleteMutation.isPending ? 0.7 : 1 }}>
                {deleteMutation.isPending ? 'Deleting...' : 'Yes, delete'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}