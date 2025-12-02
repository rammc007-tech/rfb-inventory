'use client'

import { useState, useEffect } from 'react'
import { Wifi, WifiOff, CloudOff, Cloud } from 'lucide-react'

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true)
  const [showNotification, setShowNotification] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    if (typeof window === 'undefined') return

    // Set initial online status
    setIsOnline(navigator.onLine)

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true)
      setShowNotification(true)
      setTimeout(() => setShowNotification(false), 3000)
      console.log('✓ Back online - syncing data...')
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShowNotification(true)
      setTimeout(() => setShowNotification(false), 5000)
      console.log('⚠ Offline mode - using cached data')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!mounted) return null

  return (
    <>
      {/* Persistent Status Indicator */}
      <div className="fixed top-4 left-4 z-50 no-print">
        <div
          className={`
            flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg
            transition-all duration-300
            ${isOnline 
              ? 'bg-green-500 text-white' 
              : 'bg-orange-500 text-white animate-pulse'
            }
          `}
          title={isOnline ? 'Online - Data syncing' : 'Offline - Using cached data'}
        >
          {isOnline ? (
            <>
              <Cloud size={16} />
              <span className="text-xs font-medium">Online</span>
            </>
          ) : (
            <>
              <CloudOff size={16} />
              <span className="text-xs font-medium">Offline</span>
            </>
          )}
        </div>
      </div>

      {/* Notification Toast */}
      {showNotification && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 no-print">
          <div
            className={`
              flex items-center gap-3 px-6 py-4 rounded-lg shadow-2xl
              animate-slide-down
              ${isOnline 
                ? 'bg-green-600 text-white' 
                : 'bg-orange-600 text-white'
              }
            `}
          >
            {isOnline ? (
              <>
                <Wifi size={24} />
                <div>
                  <p className="font-semibold">Back Online!</p>
                  <p className="text-sm opacity-90">Syncing your data...</p>
                </div>
              </>
            ) : (
              <>
                <WifiOff size={24} />
                <div>
                  <p className="font-semibold">You're Offline</p>
                  <p className="text-sm opacity-90">Don't worry, your data is cached</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-down {
          from {
            transform: translate(-50%, -100%);
            opacity: 0;
          }
          to {
            transform: translate(-50%, 0);
            opacity: 1;
          }
        }
        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }
      `}</style>
    </>
  )
}

