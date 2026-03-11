import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './functions/useAuth'
import Login from './app/Login'
import Register from './app/Register'
import Dashboard from './app/Dashboard'
import Board from './app/Board'
import './app/App.scss'

function App() {
  const { isAuthenticated, loading } = useAuth()
  const [token, setToken] = useState(!!localStorage.getItem('accessToken'))

  useEffect(() => {
    const checkAuth = () => {
      setToken(!!localStorage.getItem('accessToken'))
    }

    window.addEventListener('storage', checkAuth)
    // Also check on mount and when token changes in localStorage
    checkAuth()
    return () => window.removeEventListener('storage', checkAuth)
  }, [])

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={token ? <Navigate to="/dashboard" /> : <Login />}
        />
        <Route
          path="/register"
          element={token ? <Navigate to="/dashboard" /> : <Register />}
        />
        <Route
          path="/dashboard"
          element={token ? <Dashboard /> : <Navigate to="/login" />}
        />
        <Route
          path="/board/:id"
          element={token ? <Board /> : <Navigate to="/login" />}
        />
        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Router>
  )
}

export default App
