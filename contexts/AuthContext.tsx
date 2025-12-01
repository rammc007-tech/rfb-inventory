'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

interface User {
  id: string
  username: string
  role: 'admin' | 'supervisor' | 'user'
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return
    
    try {
      const storedToken = localStorage.getItem('rfb_token')
      const storedUser = localStorage.getItem('rfb_user')
      if (storedToken && storedUser) {
        setToken(storedToken)
        setUser(JSON.parse(storedUser))
      }
    } catch (error) {
      console.error('Error loading auth from localStorage:', error)
    }
  }, [])

  const login = async (username: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Login failed')
    }

    // Update state and localStorage synchronously
    const token = data.token
    const user = data.user
    
    localStorage.setItem('rfb_token', token)
    localStorage.setItem('rfb_user', JSON.stringify(user))
    
    // Update state after localStorage to ensure consistency
    setToken(token)
    setUser(user)
    
    console.log('Auth state updated:', { hasToken: !!token, hasUser: !!user })
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('rfb_token')
    localStorage.removeItem('rfb_user')
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

