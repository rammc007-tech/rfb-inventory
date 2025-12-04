import { useState, useEffect } from 'react'
import { offlineDB, OfflineStore } from '@/lib/offline-db'
import { syncManager } from '@/lib/offline-sync'
import useSWR from 'swr'

interface UseOfflineDataOptions {
  refreshInterval?: number
  revalidateOnFocus?: boolean
}

export function useOfflineData<K extends keyof OfflineStore>(
  storeName: K,
  apiEndpoint: string,
  options: UseOfflineDataOptions = {}
) {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Fetch data with SWR (online mode)
  const { data: onlineData, error, mutate: mutateSWR } = useSWR(
    isOnline ? apiEndpoint : null,
    async (url) => {
      const token = localStorage.getItem('rfb_token')
      const response = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!response.ok) throw new Error('Failed to fetch')
      const data = await response.json()
      
      // Cache data offline
      if (Array.isArray(data)) {
        for (const item of data) {
          await offlineDB.put(storeName, item)
        }
      }
      
      return data
    },
    {
      refreshInterval: options.refreshInterval,
      revalidateOnFocus: options.revalidateOnFocus ?? true,
    }
  )

  // Fetch offline data
  const [offlineData, setOfflineData] = useState<any>(null)

  useEffect(() => {
    if (!isOnline) {
      offlineDB.getAll(storeName).then(setOfflineData)
    }
  }, [isOnline, storeName])

  // Use online data if available, otherwise offline data
  const data = isOnline ? onlineData : offlineData
  const isLoading = isOnline ? !onlineData && !error : !offlineData

  // Create item (works offline)
  const create = async (item: any) => {
    const newItem = { ...item, id: item.id || `offline_${Date.now()}` }
    
    // Save to offline DB immediately
    await offlineDB.put(storeName, newItem)
    
    // Add to sync queue
    await offlineDB.addToSyncQueue({
      type: 'CREATE',
      table: storeName,
      data: newItem,
      timestamp: Date.now(),
      synced: false,
    })
    
    // If online, sync immediately
    if (isOnline) {
      syncManager.syncNow()
    }
    
    // Refresh data
    if (isOnline) {
      mutateSWR()
    } else {
      const updated = await offlineDB.getAll(storeName)
      setOfflineData(updated)
    }
    
    return newItem
  }

  // Update item (works offline)
  const update = async (id: string, updates: any) => {
    // Get existing item
    const existing = await offlineDB.getById(storeName, id)
    const updated = { ...existing, ...updates }
    
    // Save to offline DB
    await offlineDB.put(storeName, updated)
    
    // Add to sync queue
    await offlineDB.addToSyncQueue({
      type: 'UPDATE',
      table: storeName,
      data: updated,
      timestamp: Date.now(),
      synced: false,
    })
    
    // If online, sync immediately
    if (isOnline) {
      syncManager.syncNow()
    }
    
    // Refresh data
    if (isOnline) {
      mutateSWR()
    } else {
      const allData = await offlineDB.getAll(storeName)
      setOfflineData(allData)
    }
    
    return updated
  }

  // Delete item (works offline)
  const remove = async (id: string) => {
    // Delete from offline DB
    await offlineDB.delete(storeName, id)
    
    // Add to sync queue
    await offlineDB.addToSyncQueue({
      type: 'DELETE',
      table: storeName,
      data: { id },
      timestamp: Date.now(),
      synced: false,
    })
    
    // If online, sync immediately
    if (isOnline) {
      syncManager.syncNow()
    }
    
    // Refresh data
    if (isOnline) {
      mutateSWR()
    } else {
      const allData = await offlineDB.getAll(storeName)
      setOfflineData(allData)
    }
  }

  return {
    data,
    isLoading,
    isOnline,
    error,
    create,
    update,
    remove,
    mutate: mutateSWR,
  }
}

