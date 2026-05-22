import { Link, useNavigate } from 'react-router-dom'
import { useContext } from 'react'
import { logout } from '../api'
import { AuthContext } from '../App'

export default function Navbar() {
  const { isAuth, authLoading } = useContext(AuthContext)
  const { setIsAuth } = useContext(AuthContext)
  const navigate = useNavigate()

  async function handleSignOut() {
    try {
      await logout()
    } catch {
      /* ignore — clear anyway */
    }
    localStorage.removeItem('access_token')
    localStorage.removeItem('user_id')
    setIsAuth(false)
    navigate('/')
  }

  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        borderBottom: '1px solid var(--border)',
      }}
      className="glass"
    >
      <div
        className="container"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '4rem',
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
          }}
        >
          <div
            style={{
              width: '2rem',
              height: '2rem',
              borderRadius: '0.625rem',
              background: 'linear-gradient(135deg, var(--primary), var(--ring))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <span
            style={{
              fontWeight: 700,
              fontSize: '1.125rem',
              color: 'var(--foreground)',
              letterSpacing: '-0.02em',
            }}
          >
            AutoML API
          </span>
        </Link>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {isAuth ? (
            <>
              <Link to="/dashboard" className="btn btn-primary btn-sm">Training Models</Link>
              <button className="btn btn-outline btn-sm" onClick={handleSignOut}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link to="/signin" className="btn btn-ghost btn-sm">Sign In</Link>
              <Link to="/signup" className="btn btn-primary btn-sm">Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
