import { useState, useContext } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { AuthContext } from '../App'
import { Settings, ArrowRight, Loader2, AlertCircle } from 'lucide-react'

export default function AuthForm({ mode = 'signin', onSubmit }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { setIsAuth } = useContext(AuthContext)

  const isSignup = mode === 'signup'

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await onSubmit(email, password)
      localStorage.setItem('access_token', data.access_token)
      localStorage.setItem('user_id', data.user_id)
      setIsAuth(true)
      navigate('/dashboard')
    } catch (err) {
      setError(!isSignup ? 'Invalid email or password. Please try again.' : (err.message || 'Something went wrong'))
      setPassword('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-[#0a0a0a]">
      <div className="animate-slide-up w-full max-w-md">

        {/* Card */}
        <div className="bg-[#121212] border border-white/10 rounded-2xl p-8 shadow-2xl">

          {/* Logo Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
              <Settings className="w-6 h-6 text-indigo-400" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-center text-white mb-1">
            {isSignup ? 'Create an Account' : 'Welcome Back'}
          </h1>
          <p className="text-center text-gray-500 text-sm mb-8">
            {isSignup
              ? 'Join AutoML Workspace to build and deploy.'
              : 'Sign in to continue to your dashboard'}
          </p>

          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div className="mb-5">
              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2" htmlFor="auth-email">
                Email Address
              </label>
              <input
                id="auth-email"
                type="email"
                className="w-full px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-xl text-white placeholder-gray-600 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all duration-200"
                placeholder="ace@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (error) setError('')
                }}
                required
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div className="mb-6">
              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2" htmlFor="auth-password">
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                className="w-full px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-xl text-white placeholder-gray-600 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all duration-200"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (error) setError('')
                }}
                required
                minLength={6}
                autoComplete={isSignup ? 'new-password' : 'current-password'}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mb-4"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {isSignup ? 'Create Account' : 'Sign In'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500">
            {isSignup ? 'Already have an account? ' : "Don't have an account? "}
            <Link
              to={isSignup ? '/signin' : '/signup'}
              className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
            >
              {isSignup ? 'Sign In' : 'Sign Up'}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
