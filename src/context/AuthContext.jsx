import React, { createContext, useContext, useState, useEffect } from 'react'
import api from '../api/axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('accessToken'))

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    setIsAuthenticated(!!token)
    setLoading(false)

    // Listen for storage changes from other tabs/windows
    const handleStorageChange = () => {
      setIsAuthenticated(!!localStorage.getItem('accessToken'))
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  const register = async (email, password, name) => {
    try {
      const response = await api.post('/auth/register', {
        email,
        password,
        name,
      })
      localStorage.setItem('accessToken', response.data.accessToken)
      localStorage.setItem('refreshToken', response.data.refreshToken)
      setUser(response.data.user)
      setIsAuthenticated(true)
      return response.data
    } catch (error) {
      throw error.response?.data || error
    }
  }

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', {
        email,
        password,
      })
      localStorage.setItem('accessToken', response.data.accessToken)
      localStorage.setItem('refreshToken', response.data.refreshToken)
      setUser(response.data.user)
      setIsAuthenticated(true)
      return response.data
    } catch (error) {
      console.error('Login error:', error)
      throw error.response?.data || error
    }
  }

  const logout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    setUser(null)
    setIsAuthenticated(false)
  }

  const value = {
    user,
    loading,
    register,
    login,
    logout,
    isAuthenticated,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
