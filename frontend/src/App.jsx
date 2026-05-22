import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect, createContext } from 'react'
import { verifyToken } from './api'
import Landing from './pages/Landing'
import Signin from './pages/Signin'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'

// Auth context so all components can read + update auth state
export const AuthContext = createContext({
  isAuth: false,
  setIsAuth: () => {},
  authLoading: true,
})

function ProtectedRoute({ children, isAuth, authLoading }) {
  if (authLoading) return null // don't flash signin while checking
  if (!isAuth) return <Navigate to="/signin" replace />
  return children
}

export default function App() {
  const [isAuth, setIsAuth] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    // On mount, validate token against the backend
    verifyToken().then((valid) => {
      setIsAuth(valid)
      setAuthLoading(false)
    })
  }, [])

  return (
    <AuthContext.Provider value={{ isAuth, setIsAuth, authLoading }}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/signin" element={<Signin />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute isAuth={isAuth} authLoading={authLoading}>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthContext.Provider>
  )
}
