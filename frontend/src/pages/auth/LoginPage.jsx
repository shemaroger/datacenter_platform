import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react'
import { authAPI } from '../../api/endpoints'
import useAuthStore from '../../store/authStore'

export default function LoginPage() {
  const navigate  = useNavigate()
  const setAuth   = useAuthStore((s) => s.setAuth)

  const [form, setForm]       = useState({ username: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.username || !form.password) {
      setError('Please fill in all fields.')
      return
    }
    setLoading(true)
    try {
      const { data } = await authAPI.login(form)
      localStorage.setItem('access_token',  data.access)
      localStorage.setItem('refresh_token', data.refresh)
      const me = await authAPI.me()
      setAuth(me.data, data.access, data.refresh)
      navigate('/')
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        err.response?.data?.non_field_errors?.[0] ||
        'Invalid credentials. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#1A1A1A' }}>

      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 relative"
           style={{ background: '#2C2C2C' }}>
        <div className="absolute inset-0 opacity-5"
             style={{
               backgroundImage: `radial-gradient(circle at 1px 1px, #C0272D 1px, transparent 0)`,
               backgroundSize: '40px 40px'
             }} />
        <div className="relative z-10 text-center max-w-md">
          <img
            src="/images/logo-dark-1.png"
            alt="RSwitch"
            className="h-24 mx-auto mb-10 object-contain"
          />
          <h1 className="text-3xl font-bold text-white mb-4">
            Data Center Platform
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed mb-10">
            Unified monitoring, automation, and intelligence for your infrastructure.
          </p>
          <div className="grid grid-cols-3 gap-4 text-center">
            {[
              { value: '99.9%', label: 'Uptime' },
              { value: '24/7',  label: 'Monitoring' },
              { value: '10x',   label: 'Faster Response' },
            ].map((stat) => (
              <div key={stat.label}
                   className="rounded-xl p-4"
                   style={{ background: '#1A1A1A', border: '1px solid #3D3D3D' }}>
                <div className="text-2xl font-bold mb-1" style={{ color: '#C0272D' }}>
                  {stat.value}
                </div>
                <div className="text-xs text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12">

        {/* Mobile logo */}
        <div className="lg:hidden mb-8">
          <img
            src="/images/logo-dark-1.png"
            alt="RSwitch"
            className="h-16 mx-auto object-contain"
          />
        </div>

        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-1">Welcome back</h2>
            <p className="text-gray-400">Sign in to your account to continue</p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-3 p-4 rounded-xl mb-6 text-sm"
                 style={{ background: 'rgba(192,39,45,0.12)', border: '1px solid rgba(192,39,45,0.3)', color: '#ff6b6b' }}>
              <AlertCircle size={16} className="flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Username
              </label>
              <input
                type="text"
                name="username"
                value={form.username}
                onChange={handleChange}
                placeholder="Enter your username"
                autoComplete="username"
                className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-500 outline-none transition-all text-sm"
                style={{
                  background   : '#2C2C2C',
                  border       : '1px solid #3D3D3D',
                }}
                onFocus={e  => e.target.style.borderColor = '#C0272D'}
                onBlur={e   => e.target.style.borderColor = '#3D3D3D'}
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-300">Password</label>
                <Link to="/forgot-password"
                      className="text-xs transition-colors"
                      style={{ color: '#C0272D' }}
                      onMouseEnter={e => e.target.style.color = '#F5C842'}
                      onMouseLeave={e => e.target.style.color = '#C0272D'}>
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="w-full px-4 py-3 pr-12 rounded-xl text-white placeholder-gray-500 outline-none transition-all text-sm"
                  style={{
                    background : '#2C2C2C',
                    border     : '1px solid #3D3D3D',
                  }}
                  onFocus={e => e.target.style.borderColor = '#C0272D'}
                  onBlur={e  => e.target.style.borderColor = '#3D3D3D'}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white transition-all text-sm mt-2"
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
                  Signing in...
                </span>
              ) : (
                <>
                  <LogIn size={16} />
                  Sign in
                </>
              )}
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-8">
            Don't have an account?{' '}
            <Link to="/register"
                  className="font-medium transition-colors"
                  style={{ color: '#C0272D' }}
                  onMouseEnter={e => e.target.style.color = '#F5C842'}
                  onMouseLeave={e => e.target.style.color = '#C0272D'}>
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}