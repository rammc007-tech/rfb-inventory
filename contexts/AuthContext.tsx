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
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return
    
    setMounted(true)
    
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
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      })

      // Check if response is actually JSON
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned invalid response format')
      }

      // Get response text first to debug
      const text = await response.text()
      
      // Try to parse JSON
      let data
      try {
        data = text ? JSON.parse(text) : {}
      } catch (parseError) {
        console.error('JSON parse error:', parseError)
        console.error('Response text:', text)
        throw new Error('Invalid server response format')
      }

      if (!response.ok) {
        throw new Error(data.error || 'Login failed')
      }

      // Validate response data
      if (!data.token || !data.user) {
        throw new Error('Invalid login response: missing token or user data')
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
    } catch (error: any) {
      console.error('Login error:', error)
      throw error
    }
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
        user: mounted ? user : null, // Prevent hydration mismatch
        token: mounted ? token : null,
        login,
        logout,
        isAuthenticated: mounted && !!user,
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

