'use client'

import { useState, useEffect } from 'react'
import { Download } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function useInstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallButton, setShowInstallButton] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      setShowInstallButton(false)
      return
    }

    const handler = (e: Event) => {
      // Prevent default banner
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowInstallButton(true)
      
      // Silent - no console logs
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
        alert('To install this app on iOS:\n1. Tap the Share button\n2. Tap "Add to Home Screen"')
      }
      return
    }

    try {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice

      if (outcome === 'accepted') {
        setShowInstallButton(false)
        setDeferredPrompt(null)
        setIsInstalled(true)
      }
    } catch (error) {
      console.error('Install error:', error)
    }
  }

  return {
    showInstallButton: showInstallButton && !isInstalled,
    handleInstallClick,
  }
}

export function InstallButton() {
  const { showInstallButton, handleInstallClick } = useInstallPWA()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || !showInstallButton) return null

  return (
    <button
      onClick={handleInstallClick}
      className="flex items-center gap-2 px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
      title="Install App"
    >
      <Download size={18} />
      <span className="text-sm font-medium">Install</span>
    </button>
  )
}

