import { offlineDB, SyncQueueItem } from './offline-db'

class OfflineSyncManager {
  private syncInterval: NodeJS.Timeout | null = null
  private isSyncing = false
  private listeners: Set<(status: SyncStatus) => void> = new Set()

  startAutoSync(intervalMs: number = 30000) {
    if (this.syncInterval) return

    // Initial sync
    this.syncNow()

    // Periodic sync
    this.syncInterval = setInterval(() => {
      this.syncNow()
    }, intervalMs)

    console.log('✅ Auto-sync started (every 30s)')
  }

  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
      console.log('⏸️ Auto-sync stopped')
    }
  }

  async syncNow(): Promise<SyncResult> {
    if (this.isSyncing) {
      console.log('⏳ Sync already in progress')
      return { success: false, message: 'Sync in progress' }
    }

    if (!navigator.onLine) {
      console.log('📡 Offline - skipping sync')
      return { success: false, message: 'Offline' }
    }

    this.isSyncing = true
    this.notifyListeners({ status: 'syncing', message: 'Syncing...' })

    try {
      const queue = await offlineDB.getSyncQueue()
      const unsynced = queue.filter(item => !item.synced)

      if (unsynced.length === 0) {
        this.notifyListeners({ status: 'idle', message: 'Up to date' })
        this.isSyncing = false
        return { success: true, message: 'No items to sync', synced: 0 }
      }

      console.log(`🔄 Syncing ${unsynced.length} items...`)
      let synced = 0
      let failed = 0

      for (const item of unsynced) {
        try {
          await this.syncItem(item)
          item.synced = true
          await offlineDB.updateSyncQueueItem(item)
          synced++
        } catch (error) {
          console.error('Failed to sync item:', item, error)
          item.error = error instanceof Error ? error.message : 'Unknown error'
          await offlineDB.updateSyncQueueItem(item)
          failed++
        }
      }

      // Clean up synced items older than 24 hours
      await this.cleanupSyncQueue()

      const message = `Synced ${synced} items${failed > 0 ? `, ${failed} failed` : ''}`
      this.notifyListeners({ status: failed > 0 ? 'error' : 'success', message })
      this.isSyncing = false

      return { success: true, message, synced, failed }
    } catch (error) {
      console.error('Sync error:', error)
      this.notifyListeners({ status: 'error', message: 'Sync failed' })
      this.isSyncing = false
      return { success: false, message: 'Sync failed' }
    }
  }

  private async syncItem(item: SyncQueueItem): Promise<void> {
    const { type, table, data } = item

    let endpoint = `/api/${table.replace(/_/g, '-')}`
    let method = 'POST'
    let body = data

    switch (type) {
      case 'CREATE':
        method = 'POST'
        break
      case 'UPDATE':
        method = 'PUT'
        endpoint = `${endpoint}/${data.id}`
        break
      case 'DELETE':
        method = 'DELETE'
        endpoint = `${endpoint}/${data.id}`
        body = undefined
        break
    }

    const response = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('rfb_token') || ''}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`)
    }

    console.log(`✅ Synced ${type} ${table}:`, data.id)
  }

  private async cleanupSyncQueue(): Promise<void> {
    const queue = await offlineDB.getSyncQueue()
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000

    for (const item of queue) {
      if (item.synced && item.timestamp < oneDayAgo) {
        await offlineDB.deleteSyncQueueItem(item.id)
      }
    }
  }

  onStatusChange(callback: (status: SyncStatus) => void) {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  private notifyListeners(status: SyncStatus) {
    this.listeners.forEach(listener => listener(status))
  }

  async getPendingCount(): Promise<number> {
    const queue = await offlineDB.getSyncQueue()
    return queue.filter(item => !item.synced).length
  }
}

export interface SyncStatus {
  status: 'idle' | 'syncing' | 'success' | 'error'
  message: string
}

export interface SyncResult {
  success: boolean
  message: string
  synced?: number
  failed?: number
}

export const syncManager = new OfflineSyncManager()

// Start auto-sync when online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('📡 Back online - starting sync')
    syncManager.syncNow()
  })

  window.addEventListener('offline', () => {
    console.log('📡 Went offline')
  })

  // Start auto-sync if online
  if (navigator.onLine) {
    syncManager.startAutoSync()
  }
}

