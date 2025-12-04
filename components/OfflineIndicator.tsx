'use client'

import { useState, useEffect } from 'react'
import { Wifi, WifiOff, RefreshCw, Check, AlertCircle } from 'lucide-react'
import { syncManager, SyncStatus } from '@/lib/offline-sync'

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    status: 'idle',
    message: 'Up to date',
  })
  const [pendingCount, setPendingCount] = useState(0)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Listen to sync status
    const unsubscribe = syncManager.onStatusChange(setSyncStatus)

    // Update pending count periodically
    const interval = setInterval(async () => {
      const count = await syncManager.getPendingCount()
      setPendingCount(count)
    }, 5000)

    // Initial count
    syncManager.getPendingCount().then(setPendingCount)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      unsubscribe()
      clearInterval(interval)
    }
  }, [])

  const handleSync = () => {
    syncManager.syncNow()
  }

  const getStatusColor = () => {
    if (!isOnline) return 'bg-red-500'
    if (syncStatus.status === 'syncing') return 'bg-yellow-500'
    if (syncStatus.status === 'error') return 'bg-orange-500'
    if (pendingCount > 0) return 'bg-blue-500'
    return 'bg-green-500'
  }

  const getStatusIcon = () => {
    if (!isOnline) return <WifiOff className="w-4 h-4" />
    if (syncStatus.status === 'syncing') return <RefreshCw className="w-4 h-4 animate-spin" />
    if (syncStatus.status === 'error') return <AlertCircle className="w-4 h-4" />
    if (pendingCount > 0) return <RefreshCw className="w-4 h-4" />
    return <Check className="w-4 h-4" />
  }

  const getStatusText = () => {
    if (!isOnline) return 'Offline'
    if (syncStatus.status === 'syncing') return 'Syncing...'
    if (pendingCount > 0) return `${pendingCount} pending`
    return 'Online'
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="relative">
        {/* Status Badge */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className={`
            ${getStatusColor()} text-white px-4 py-2 rounded-full shadow-lg
            flex items-center gap-2 hover:shadow-xl transition-all
            ${showDetails ? 'rounded-b-none' : ''}
          `}
          suppressHydrationWarning
        >
          {getStatusIcon()}
          <span className="font-medium text-sm">{getStatusText()}</span>
        </button>

        {/* Details Panel */}
        {showDetails && (
          <div className="absolute bottom-full right-0 mb-0 bg-white rounded-t-lg shadow-xl p-4 w-64 border border-gray-200">
            <div className="space-y-3">
              {/* Connection Status */}
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <Wifi className="w-5 h-5 text-green-600" />
                ) : (
                  <WifiOff className="w-5 h-5 text-red-600" />
                )}
                <span className="font-medium">
                  {isOnline ? 'Connected' : 'Offline Mode'}
                </span>
              </div>

              {/* Sync Status */}
              {isOnline && (
                <div className="text-sm text-gray-600">
                  <div className="flex items-center justify-between mb-2">
                    <span>Sync Status:</span>
                    <span className="font-medium">{syncStatus.message}</span>
                  </div>
                  {pendingCount > 0 && (
                    <div className="flex items-center justify-between">
                      <span>Pending Items:</span>
                      <span className="font-medium text-blue-600">{pendingCount}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Offline Info */}
              {!isOnline && (
                <div className="text-sm text-gray-600">
                  <p>✅ You can still:</p>
                  <ul className="ml-4 mt-1 space-y-1 text-xs">
                    <li>• Add items</li>
                    <li>• Edit items</li>
                    <li>• Delete items</li>
                    <li>• View all data</li>
                  </ul>
                  <p className="mt-2 text-xs text-blue-600">
                    Changes will sync when back online
                  </p>
                </div>
              )}

              {/* Sync Button */}
              {isOnline && pendingCount > 0 && (
                <button
                  onClick={handleSync}
                  disabled={syncStatus.status === 'syncing'}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm font-medium"
                >
                  <RefreshCw className={`w-4 h-4 ${syncStatus.status === 'syncing' ? 'animate-spin' : ''}`} />
                  {syncStatus.status === 'syncing' ? 'Syncing...' : 'Sync Now'}
                </button>
              )}

              {/* Last Updated */}
              <div className="text-xs text-gray-500 text-center pt-2 border-t" suppressHydrationWarning>
                Last checked: {new Date().toLocaleTimeString()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

