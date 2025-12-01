'use client'

import { useEffect } from 'react'

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator && typeof window !== 'undefined') {
      // Only register in production or when explicitly needed
      if (process.env.NODE_ENV === 'production' || window.location.hostname === 'localhost') {
      navigator.serviceWorker
          .register('/sw.js', { scope: '/' })
        .then((registration) => {
          console.log('Service Worker registered:', registration)
        })
        .catch((error) => {
            // Silently fail - PWA is optional
            console.log('Service Worker registration failed (non-critical):', error.message)
        })
      }
    }
  }, [])

  return null
}

