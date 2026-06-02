import { Link, useNavigate } from 'react-router-dom'
import { useContext, useState, useRef, useEffect } from 'react'
import { logout, deleteAccount } from '../api'
import { AuthContext } from '../App'
import { Settings, LogOut, Trash2, User } from 'lucide-react'

export default function Navbar() {
  const { isAuth } = useContext(AuthContext)
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
    <nav className="sticky top-0 z-30 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-[1400px] mx-auto px-6 flex items-center justify-between h-16">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 no-underline group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-400 flex items-center justify-center">
            <Settings className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-base text-white tracking-tight">
            AutoML.ai
          </span>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {isAuth ? (
            <>
              <Link
                to="/dashboard"
                className="hidden sm:inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-all duration-200 no-underline"
              >
                <Settings className="w-4 h-4" />
                Train Model
              </Link>
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="w-9 h-9 rounded-full bg-[#1a1a1a] border border-white/10 flex items-center justify-center hover:bg-white/5 transition-all duration-200 cursor-pointer"
                  title="User Menu"
                >
                  <User className="w-4 h-4 text-gray-400" />
                </button>

                {dropdownOpen && (
                  <div className="absolute top-full right-0 mt-2 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl min-w-[180px] overflow-hidden z-50 animate-fade-in">
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-all duration-200 border-b border-white/5 cursor-pointer bg-transparent border-none text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                    <button
                      onClick={handleDeleteAccount}
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-200 cursor-pointer bg-transparent border-none text-left"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Account
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/signin" className="text-sm text-gray-400 hover:text-white font-medium transition-colors no-underline">
                Sign in
              </Link>
              <Link to="/signup" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-all duration-200 no-underline">
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
