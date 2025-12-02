// Offline Storage Manager for RFB Inventory
// Handles data persistence when offline

const DB_NAME = 'rfb_offline_storage'
const DB_VERSION = 2

interface OfflineData {
  id: string
  type: string
  data: any
  timestamp: number
  synced: boolean
}

let db: IDBDatabase | null = null

// Initialize IndexedDB
async function initDB(): Promise<IDBDatabase> {
  if (db) return db

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    
    request.onsuccess = () => {
      db = request.result
      resolve(db)
    }

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result

      // Create stores for each data type
      const stores = [
        'raw_materials',
        'essential_items',
        'recipes',
        'production',
        'purchases',
        'users',
        'settings',
        'offline_queue', // Queue for actions to sync when online
      ]

      stores.forEach((storeName) => {
        if (!database.objectStoreNames.contains(storeName)) {
          const store = database.createObjectStore(storeName, { keyPath: 'id' })
          store.createIndex('timestamp', 'timestamp', { unique: false })
          store.createIndex('synced', 'synced', { unique: false })
        }
      })
    }
  })
}

// Save data offline
export async function saveOffline(storeName: string, data: any): Promise<void> {
  const database = await initDB()
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite')
    const store = transaction.objectStore(storeName)
    
    const item = {
      ...data,
      id: data.id || `offline_${Date.now()}_${Math.random()}`,
      timestamp: Date.now(),
      synced: false,
    }
    
    const request = store.put(item)
    
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

// Get all offline data
export async function getOfflineData(storeName: string): Promise<any[]> {
  const database = await initDB()
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly')
    const store = transaction.objectStore(storeName)
    const request = store.getAll()
    
    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => reject(request.error)
  })
}

// Queue action for sync when online
export async function queueOfflineAction(action: any): Promise<void> {
  const database = await initDB()
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction('offline_queue', 'readwrite')
    const store = transaction.objectStore('offline_queue')
    
    const item = {
      id: `action_${Date.now()}_${Math.random()}`,
      ...action,
      timestamp: Date.now(),
      synced: false,
    }
    
    const request = store.add(item)
    
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

// Get pending actions
export async function getPendingActions(): Promise<any[]> {
  const database = await initDB()
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction('offline_queue', 'readonly')
    const store = transaction.objectStore('offline_queue')
    const request = store.getAll()
    
    request.onsuccess = () => {
      const allItems = request.result || []
      // Filter for unsynced items
      const pendingItems = allItems.filter((item: any) => !item.synced)
      resolve(pendingItems)
    }
    request.onerror = () => reject(request.error)
  })
}

// Mark action as synced
export async function markAsSynced(actionId: string): Promise<void> {
  const database = await initDB()
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction('offline_queue', 'readwrite')
    const store = transaction.objectStore('offline_queue')
    const request = store.get(actionId)
    
    request.onsuccess = () => {
      const item = request.result
      if (item) {
        item.synced = true
        store.put(item)
      }
      resolve()
    }
    request.onerror = () => reject(request.error)
  })
}

// Sync all pending actions when online
export async function syncPendingActions(): Promise<void> {
  if (!navigator.onLine) {
    console.log('[Offline] Cannot sync - no internet connection')
    return
  }

  const actions = await getPendingActions()
  console.log(`[Sync] Found ${actions.length} pending actions`)

  for (const action of actions) {
    try {
      // Send action to API
      const response = await fetch(action.url, {
        method: action.method,
        headers: {
          'Content-Type': 'application/json',
          ...action.headers,
        },
        body: action.body ? JSON.stringify(action.body) : undefined,
      })

      if (response.ok) {
        await markAsSynced(action.id)
        console.log('[Sync] Action synced:', action.id)
      }
    } catch (error) {
      console.error('[Sync] Failed to sync action:', action.id, error)
    }
  }
}

// Check if online
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine
}

// Listen for online/offline events
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[Network] Back online - syncing data...')
    syncPendingActions()
  })

  window.addEventListener('offline', () => {
    console.log('[Network] Gone offline - using cached data')
  })
}

// Export database for backup
export async function exportDatabase(): Promise<any> {
  const database = await initDB()
  const stores = [
    'raw_materials',
    'essential_items',
    'recipes',
    'production',
    'purchases',
    'users',
    'settings',
  ]

  const data: any = {}
  
  for (const storeName of stores) {
    data[storeName] = await getOfflineData(storeName)
  }

  return data
}

// Import database from backup
export async function importDatabase(data: any): Promise<void> {
  const database = await initDB()
  
  for (const [storeName, items] of Object.entries(data)) {
    if (Array.isArray(items)) {
      const transaction = database.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      
      // Clear existing data
      await new Promise((resolve) => {
        const clearRequest = store.clear()
        clearRequest.onsuccess = () => resolve(null)
      })
      
      // Add new data
      for (const item of items) {
        store.add(item)
      }
    }
  }
}

