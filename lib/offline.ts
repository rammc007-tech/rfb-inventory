// Offline-first utilities using IndexedDB

const DB_NAME = 'rfb_inventory_db'
const DB_VERSION = 1
const STORE_NAME = 'sync_queue'

export interface SyncQueueItem {
  id: string
  action: string
  entityType: string
  entityId: string
  data: any
  status: 'pending' | 'synced' | 'error'
  error?: string
  createdAt: number
  updatedAt: number
}

let db: IDBDatabase | null = null

export async function initIndexedDB(): Promise<IDBDatabase> {
  if (db) {
    return db
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      db = request.result
      resolve(db)
    }

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('status', 'status', { unique: false })
        store.createIndex('entityType', 'entityType', { unique: false })
      }
    }
  })
}

export async function addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const database = await initIndexedDB()
  const id = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  const queueItem: SyncQueueItem = {
    ...item,
    id,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.add(queueItem)

    request.onsuccess = () => resolve(id)
    request.onerror = () => reject(request.error)
  })
}

export async function getSyncQueue(status?: 'pending' | 'synced' | 'error'): Promise<SyncQueueItem[]> {
  const database = await initIndexedDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const index = store.index('status')
    const request = status ? index.getAll(status) : store.getAll()

    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => reject(request.error)
  })
}

export async function updateSyncQueueItem(
  id: string,
  updates: Partial<SyncQueueItem>
): Promise<void> {
  const database = await initIndexedDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const getRequest = store.get(id)

    getRequest.onsuccess = () => {
      const item = getRequest.result
      if (item) {
        const updated = {
          ...item,
          ...updates,
          updatedAt: Date.now(),
        }
        const putRequest = store.put(updated)
        putRequest.onsuccess = () => resolve()
        putRequest.onerror = () => reject(putRequest.error)
      } else {
        reject(new Error('Item not found'))
      }
    }
    getRequest.onerror = () => reject(getRequest.error)
  })
}

export async function removeFromSyncQueue(id: string): Promise<void> {
  const database = await initIndexedDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.delete(id)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function syncQueue(): Promise<void> {
  if (typeof window === 'undefined' || !navigator.onLine) {
    return
  }

  const pendingItems = await getSyncQueue('pending')

  for (const item of pendingItems) {
    try {
      const response = await fetch(`/api/sync/${item.entityType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: item.action,
          entityId: item.entityId,
          data: item.data,
        }),
      })

      if (response.ok) {
        await updateSyncQueueItem(item.id, { status: 'synced' })
      } else {
        const error = await response.text()
        await updateSyncQueueItem(item.id, {
          status: 'error',
          error,
        })
      }
    } catch (error) {
      await updateSyncQueueItem(item.id, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }
}

// Auto-sync when online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    syncQueue()
  })
}

