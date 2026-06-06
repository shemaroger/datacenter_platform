import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, UserPlus, AlertCircle, CheckCircle } from 'lucide-react'
import { authAPI } from '../../api/endpoints'

export default function RegisterPage() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    username   : '',
    email      : '',
    first_name : '',
    last_name  : '',
    password   : '',
    password2  : '',
    role       : 'viewer',
    department : '',
  })
  const [showPass,  setShowPass]  = useState(false)
  const [showPass2, setShowPass2] = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [success,   setSuccess]   = useState(false)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError('')
  }

  const inputStyle = {
    background : '#2C2C2C',
    border     : '1px solid #3D3D3D',
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password !== form.password2) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      await authAPI.register(form)
      setSuccess(true)
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      const data = err.response?.data
      if (data) {
        const msg = Object.values(data).flat().join(' ')
        setError(msg)
      } else {
        setError('Registration failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#1A1A1A' }}>
        <div className="text-center p-10 rounded-2xl" style={{ background: '#2C2C2C', border: '1px solid #3D3D3D' }}>
          <CheckCircle size={56} className="mx-auto mb-4" style={{ color: '#C0272D' }} />
          <h2 className="text-xl font-bold text-white mb-2">Account created!</h2>
          <p className="text-gray-400">Redirecting you to login...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#1A1A1A' }}>

      {/* Left panel */}
      <div className="hidden lg:flex lg:w-2/5 flex-col items-center justify-center p-12"
           style={{ background: '#2C2C2C', borderRight: '1px solid #3D3D3D' }}>
        <div className="text-center max-w-xs">
          <img
            src="/images/logo-dark-1.png"
            alt="RSwitch"
            className="h-20 mx-auto mb-8 object-contain"
          />
          <h2 className="text-2xl font-bold text-white mb-4">Join the platform</h2>
          <p className="text-gray-400 text-sm leading-relaxed mb-8">
            Get access to real-time monitoring, intelligent automation, and predictive analytics for your data center.
          </p>
          <div className="space-y-3 text-left">
            {[
              'Real-time server monitoring',
              'Automated task scheduling',
              'AI-powered anomaly detection',
              'Compliance & audit trails',
            ].map((f) => (
              <div key={f} className="flex items-center gap-3 text-sm text-gray-300">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#C0272D' }} />
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12 overflow-y-auto">

        <div className="lg:hidden mb-6">
          <img src="/images/logo-dark-1.png" alt="RSwitch" className="h-14 mx-auto object-contain" />
        </div>

        <div className="w-full max-w-lg">
          <div className="mb-7">
            <h2 className="text-2xl font-bold text-white mb-1">Create your account</h2>
            <p className="text-gray-400">Fill in your details to get started</p>
          </div>

          {error && (
            <div className="flex items-start gap-3 p-4 rounded-xl mb-5 text-sm"
                 style={{ background: 'rgba(192,39,45,0.12)', border: '1px solid rgba(192,39,45,0.3)', color: '#ff6b6b' }}>
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Name row */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { name: 'first_name', label: 'First name', placeholder: 'John' },
                { name: 'last_name',  label: 'Last name',  placeholder: 'Doe'  },
              ].map((f) => (
                <div key={f.name}>
                  <label className="block text-sm font-medium text-gray-300 mb-2">{f.label}</label>
                  <input
                    type="text"
                    name={f.name}
                    value={form[f.name]}
                    onChange={handleChange}
                    placeholder={f.placeholder}
                    className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-500 outline-none transition-all text-sm"
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#C0272D'}
                    onBlur={e  => e.target.style.borderColor = '#3D3D3D'}
                  />
                </div>
              ))}
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Username <span style={{ color: '#C0272D' }}>*</span></label>
              <input
                type="text"
                name="username"
                value={form.username}
                onChange={handleChange}
                placeholder="Choose a username"
                required
                className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-500 outline-none transition-all text-sm"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#C0272D'}
                onBlur={e  => e.target.style.borderColor = '#3D3D3D'}
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email <span style={{ color: '#C0272D' }}>*</span></label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="john@example.com"
                required
                className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-500 outline-none transition-all text-sm"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#C0272D'}
                onBlur={e  => e.target.style.borderColor = '#3D3D3D'}
              />
            </div>

            {/* Role & Department */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
                <select
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl text-white outline-none transition-all text-sm"
                  style={{ ...inputStyle, cursor: 'pointer' }}
                  onFocus={e => e.target.style.borderColor = '#C0272D'}
                  onBlur={e  => e.target.style.borderColor = '#3D3D3D'}>
                  <option value="viewer">Viewer</option>
                  <option value="operator">Operator</option>
                  <option value="auditor">Auditor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Department</label>
                <input
                  type="text"
                  name="department"
                  value={form.department}
                  onChange={handleChange}
                  placeholder="e.g. IT Ops"
                  className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-500 outline-none transition-all text-sm"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#C0272D'}
                  onBlur={e  => e.target.style.borderColor = '#3D3D3D'}
                />
              </div>
            </div>

            {/* Passwords */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { name: 'password',  label: 'Password',        show: showPass,  toggle: () => setShowPass(!showPass)  },
                { name: 'password2', label: 'Confirm password', show: showPass2, toggle: () => setShowPass2(!showPass2) },
              ].map((f) => (
                <div key={f.name}>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {f.label} <span style={{ color: '#C0272D' }}>*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={f.show ? 'text' : 'password'}
                      name={f.name}
                      value={form[f.name]}
                      onChange={handleChange}
                      placeholder="••••••••"
                      required
                      className="w-full px-4 py-3 pr-11 rounded-xl text-white placeholder-gray-500 outline-none transition-all text-sm"
                      style={inputStyle}
                      onFocus={e => e.target.style.borderColor = '#C0272D'}
                      onBlur={e  => e.target.style.borderColor = '#3D3D3D'}
                    />
                    <button
                      type="button"
                      onClick={f.toggle}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                      {f.show ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white transition-all text-sm mt-1"
              style={{
                background : loading ? '#7A1318' : '#C0272D',
                opacity    : loading ? 0.8 : 1,
                cursor     : loading ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={e => { if (!loading) e.target.style.background = '#9B1C21' }}
              onMouseLeave={e => { if (!loading) e.target.style.background = '#C0272D' }}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4"/>
                    <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Creating account...
                </span>
              ) : (
                <>
                  <UserPlus size={16} />
                  Create account
                </>
              )}
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-6">
            Already have an account?{' '}
            <Link to="/login"
                  className="font-medium transition-colors"
                  style={{ color: '#C0272D' }}
                  onMouseEnter={e => e.target.style.color = '#F5C842'}
                  onMouseLeave={e => e.target.style.color = '#C0272D'}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}