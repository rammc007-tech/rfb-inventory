'use client'

import { useEffect } from 'react'

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    // Only register in production
    if (process.env.NODE_ENV !== 'production') return
    
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          // Silent success - no console log in production
          if (process.env.NODE_ENV === 'development') {
            console.log('✓ Service Worker registered')
          }
        })
        .catch((error) => {
          // Silent fail - PWA is optional
          if (process.env.NODE_ENV === 'development') {
            console.log('ℹ Service Worker not available:', error.message)
          }
        })
    }
  }, [])

  return null
}

