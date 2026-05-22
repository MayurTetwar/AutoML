import { useState, useContext } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { AuthContext } from '../App'

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
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem',
        background: 'var(--background)',
      }}
    >
      <div
        className="animate-slide-up"
        style={{
          width: '100%',
          maxWidth: '26rem',
        }}
      >
        {/* Logo */}
        <Link
          to="/"
          style={{
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            justifyContent: 'center',
            marginBottom: '2rem',
          }}
        >
          <div
            style={{
              width: '2.5rem',
              height: '2.5rem',
              borderRadius: '0.75rem',
              background: 'linear-gradient(135deg, var(--primary), var(--ring))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <span
            style={{
              fontWeight: 700,
              fontSize: '1.375rem',
              color: 'var(--foreground)',
              letterSpacing: '-0.02em',
            }}
          >
            AutoML API
          </span>
        </Link>

        {/* Card */}
        <div
          className="card"
          style={{ padding: '2rem' }}
        >
          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              textAlign: 'center',
              marginBottom: '0.25rem',
              color: 'var(--foreground)',
            }}
          >
            {isSignup ? 'Create your account' : 'Welcome back'}
          </h1>
          <p
            style={{
              textAlign: 'center',
              color: 'var(--secondary)',
              fontSize: '0.875rem',
              marginBottom: '1.75rem',
            }}
          >
            {isSignup
              ? 'Start training ML models in minutes'
              : 'Sign in to continue to your dashboard'}
          </p>

          {error && <div className="error-msg">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className="input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div style={{ marginBottom: '1.75rem' }}>
              <label className="label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={isSignup ? 'new-password' : 'current-password'}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', marginBottom: '1rem' }}
            >
              {loading && <span className="spinner" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} />}
              {isSignup ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <p
            style={{
              textAlign: 'center',
              fontSize: '0.8125rem',
              color: 'var(--secondary)',
            }}
          >
            {isSignup ? 'Already have an account? ' : "Don't have an account? "}
            <Link
              to={isSignup ? '/signin' : '/signup'}
              style={{
                color: 'var(--primary)',
                textDecoration: 'none',
                fontWeight: 500,
              }}
            >
              {isSignup ? 'Sign In' : 'Sign Up'}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
