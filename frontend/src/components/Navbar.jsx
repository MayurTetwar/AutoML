import { Link, useNavigate } from 'react-router-dom'
import { useContext, useState, useRef, useEffect } from 'react'
import { logout, deleteAccount } from '../api'
import { AuthContext } from '../App'

export default function Navbar() {
  const { isAuth, authLoading } = useContext(AuthContext)
  const { setIsAuth } = useContext(AuthContext)
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  async function handleSignOut() {
    try {
      await logout()
    } catch {
      /* ignore — clear anyway */
    }
    localStorage.removeItem('access_token')
    localStorage.removeItem('user_id')
    setIsAuth(false)
    setDropdownOpen(false)
    navigate('/')
  }

  async function handleDeleteAccount() {
    const confirmDelete = window.confirm("Are you sure you want to permanently delete your account and all associated models? This cannot be undone.");
    if (!confirmDelete) return;

    try {
      await deleteAccount();
      localStorage.removeItem('access_token')
      localStorage.removeItem('user_id')
      setIsAuth(false)
      setDropdownOpen(false)
      navigate('/')
    } catch (err) {
      alert("Failed to delete account: " + err.message);
    }
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
          <img
            src="/AutoML Icon.png"
            alt="AutoML Icon"
            style={{
              width: '2.75rem',
              height: '2.75rem',
              borderRadius: '0.375rem',
              objectFit: 'contain'
            }}
          />
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
        <div className="navbar-right" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {isAuth ? (
            <>
              <Link to="/dashboard" className="btn btn-primary btn-sm navbar-training-btn">Training Models</Link>
              <div style={{ position: 'relative' }} ref={dropdownRef}>
                <button 
                  className="btn btn-outline btn-sm" 
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title="User Menu"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </button>
                
                {dropdownOpen && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '0.5rem',
                    background: 'var(--card, #fff)',
                    border: '1px solid var(--border)',
                    borderRadius: '0.5rem',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    minWidth: '160px',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    zIndex: 40
                  }}>
                    <button 
                      onClick={handleSignOut}
                      style={{
                        padding: '0.75rem 1rem',
                        background: 'none',
                        border: 'none',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        color: 'var(--foreground)',
                        borderBottom: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        transition: 'background 0.2s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = 'var(--accent)'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                      Sign Out
                    </button>
                    <button 
                      onClick={handleDeleteAccount}
                      style={{
                        padding: '0.75rem 1rem',
                        background: 'none',
                        border: 'none',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        color: 'var(--destructive, #ef4444)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        transition: 'background 0.2s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = 'var(--accent)'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                      Delete Account
                    </button>
                  </div>
                )}
              </div>
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
