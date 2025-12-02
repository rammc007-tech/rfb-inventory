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
      // iOS installation instructions
      if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
        alert(
          '📱 iOS Installation:\n\n' +
          '1. Tap the Share button (⬆️)\n' +
          '2. Scroll and tap "Add to Home Screen"\n' +
          '3. Tap "Add"\n\n' +
          '✅ The app will appear on your home screen!'
        )
      } else {
        // Android/Desktop fallback
        alert(
          '📱 Installation:\n\n' +
          'To install this app:\n' +
          '1. Look for the install icon in your browser\n' +
          '2. Or check browser menu for "Install app"\n' +
          '3. Follow the prompts\n\n' +
          '✅ The app will be installed on your device!'
        )
      }
      return
    }

    try {
      // Show the install prompt
      await deferredPrompt.prompt()
      
      // Wait for user choice
      const { outcome } = await deferredPrompt.userChoice
      
      console.log(`User ${outcome} the install prompt`)

      if (outcome === 'accepted') {
        setShowInstallButton(false)
        setDeferredPrompt(null)
        setIsInstalled(true)
        
        // Show success message
        setTimeout(() => {
          alert('✅ App installed successfully! You can now access it from your home screen.')
        }, 500)
      }
    } catch (error) {
      console.error('Install error:', error)
      alert('Installation failed. Please try again or install manually from browser menu.')
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

