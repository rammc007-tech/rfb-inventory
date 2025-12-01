'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import LoginPage from '@/components/LoginPage'

export default function Home() {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    setMounted(true)
    
    // Check authentication after mount
    const checkAuth = () => {
      if (typeof window === 'undefined') return
      
      const storedToken = localStorage.getItem('rfb_token')
      const storedUser = localStorage.getItem('rfb_user')
      
      if (isAuthenticated || (storedToken && storedUser)) {
        router.push('/dashboard')
      } else {
        setChecking(false)
      }
    }
    
    // Small delay to ensure auth context is ready
    const timer = setTimeout(checkAuth, 100)
    return () => clearTimeout(timer)
  }, [isAuthenticated, router])

  if (!mounted || checking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return <LoginPage />
}

