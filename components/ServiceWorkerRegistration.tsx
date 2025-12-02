'use client'

import { useEffect } from 'react'

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    // Register service worker for PWA functionality
    if ('serviceWorker' in navigator) {
      // Register on page load
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js', { scope: '/' })
          .then((registration) => {
            console.log('✓ Service Worker registered successfully')
            
            // Check for updates
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    // New service worker available
                    console.log('New version available! Refresh to update.')
                  }
                })
              }
            })
          })
          .catch((error) => {
            console.warn('Service Worker registration failed:', error.message)
          })
      })
    }
  }, [])

  return null
}

