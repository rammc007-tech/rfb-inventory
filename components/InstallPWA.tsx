'use client'

import { useState, useEffect } from 'react'
import { Download } from 'lucide-react'

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showInstallButton, setShowInstallButton] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    const isIOSStandalone = (window.navigator as any).standalone === true
    
    if (isStandalone || isIOSStandalone) {
      setIsInstalled(true)
      setShowInstallButton(false)
      return
    }

    // Listen for beforeinstallprompt event (Chrome, Edge, etc.)
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowInstallButton(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    // For iOS Safari, always show install button if not installed
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
    
    if (isIOS && isSafari && !isIOSStandalone) {
      setShowInstallButton(true)
    }

    // Show button after a short delay if service worker is ready
    // This ensures button appears even if beforeinstallprompt doesn't fire immediately
    const checkAndShow = () => {
      if (isStandalone || isIOSStandalone) {
        return
      }

      // Check if we're on a supported platform
      const isSupported = 
        /Chrome/.test(navigator.userAgent) || 
        /Edg/.test(navigator.userAgent) ||
        /Firefox/.test(navigator.userAgent) ||
        isIOS ||
        /Android/.test(navigator.userAgent)

      if (isSupported) {
        // Show button after checking service worker status
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready
            .then(() => {
              setTimeout(() => {
                if (!isStandalone && !isIOSStandalone) {
                  setShowInstallButton(true)
                }
              }, 500)
            })
            .catch(() => {
              // Even if service worker fails, show button for supported browsers
              setTimeout(() => {
                if (!isStandalone && !isIOSStandalone && isSupported) {
                  setShowInstallButton(true)
                }
              }, 1000)
            })
        } else {
          // No service worker support, but still show for iOS
          if (isIOS) {
            setShowInstallButton(true)
          }
        }
      }
    }

    // Initial check
    checkAndShow()

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleInstallClick = async () => {
    // If we have the deferred prompt, use it
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice

        if (outcome === 'accepted') {
          setDeferredPrompt(null)
          setShowInstallButton(false)
          setIsInstalled(true)
        }
      } catch (error) {
        console.error('Error showing install prompt:', error)
      }
      return
    }

    // For iOS Safari, show instructions
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    if (isIOS) {
      alert('To install this app:\n1. Tap the Share button\n2. Select "Add to Home Screen"\n3. Tap "Add"')
      return
    }

    // Fallback: try to trigger install via manifest
    // This won't work in all browsers, but provides a fallback
    console.log('Install prompt not available. Please use browser menu to install.')
  }

  if (isInstalled) {
    return null
  }

  if (!showInstallButton) {
    return null
  }

  return (
    <button
      onClick={handleInstallClick}
      className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-opacity-90 transition-colors"
      title="Install App"
    >
      <Download className="h-4 w-4" />
      <span className="hidden sm:inline">Install App</span>
    </button>
  )
}

