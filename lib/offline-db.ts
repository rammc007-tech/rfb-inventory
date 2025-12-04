// IndexedDB wrapper for offline storage
const DB_NAME = 'rfb-inventory-offline'
const DB_VERSION = 1

export interface OfflineStore {
  raw_materials: any[]
  purchase_batches: any[]
  recipes: any[]
  recipe_ingredients: any[]
  production_logs: any[]
  users: any[]
  deleted_items: any[]
  packing_materials: any[]
  packing_purchases: any[]
  settings: any[]
}

export interface SyncQueueItem {
  id: string
  type: 'CREATE' | 'UPDATE' | 'DELETE'
  table: keyof OfflineStore
  data: any
  timestamp: number
  synced: boolean
  error?: string
}

class OfflineDatabase {
  private db: IDBDatabase | null = null
  private initPromise: Promise<IDBDatabase> | null = null

  async init(): Promise<IDBDatabase> {
    if (this.db) return this.db
    if (this.initPromise) return this.initPromise

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        console.error('Failed to open IndexedDB')
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        console.log('✅ IndexedDB initialized')
        resolve(this.db)
      }

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result

        // Create object stores for each table
        const stores: (keyof OfflineStore)[] = [
          'raw_materials',
          'purchase_batches',
          'recipes',
          'recipe_ingredients',
          'production_logs',
          'users',
          'deleted_items',
          'packing_materials',
          'packing_purchases',
          'settings'
        ]

        stores.forEach(storeName => {
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName, { keyPath: 'id' })
          }
        })

        // Create sync queue store
        if (!db.objectStoreNames.contains('sync_queue')) {
          const syncStore = db.createObjectStore('sync_queue', { keyPath: 'id' })
          syncStore.createIndex('synced', 'synced', { unique: false })
          syncStore.createIndex('timestamp', 'timestamp', { unique: false })
        }

        // Create metadata store
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' })
        }

        console.log('✅ IndexedDB stores created')
      }
    })

    return this.initPromise
  }

  // Get all items from a store
  async getAll<K extends keyof OfflineStore>(storeName: K): Promise<OfflineStore[K]> {
    const db = await this.init()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  // Get single item by id
  async getById<K extends keyof OfflineStore>(
    storeName: K,
    id: string
  ): Promise<any | null> {
    const db = await this.init()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.get(id)

      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  // Add or update item
  async put<K extends keyof OfflineStore>(
    storeName: K,
    data: any
  ): Promise<void> {
    const db = await this.init()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.put(data)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  // Delete item
  async delete<K extends keyof OfflineStore>(
    storeName: K,
    id: string
  ): Promise<void> {
    const db = await this.init()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.delete(id)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  // Sync queue operations
  async addToSyncQueue(item: Omit<SyncQueueItem, 'id'>): Promise<void> {
    const db = await this.init()
    const queueItem: SyncQueueItem = {
      ...item,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction('sync_queue', 'readwrite')
      const store = transaction.objectStore('sync_queue')
      const request = store.put(queueItem)

      request.onsuccess = () => {
        console.log('Added to sync queue:', queueItem)
        resolve()
      }
      request.onerror = () => reject(request.error)
    })
  }

  async getSyncQueue(): Promise<SyncQueueItem[]> {
    const db = await this.init()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('sync_queue', 'readonly')
      const store = transaction.objectStore('sync_queue')
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  async updateSyncQueueItem(item: SyncQueueItem): Promise<void> {
    const db = await this.init()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('sync_queue', 'readwrite')
      const store = transaction.objectStore('sync_queue')
      const request = store.put(item)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async deleteSyncQueueItem(id: string): Promise<void> {
    const db = await this.init()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('sync_queue', 'readwrite')
      const store = transaction.objectStore('sync_queue')
      const request = store.delete(id)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  // Metadata operations
  async setMetadata(key: string, value: any): Promise<void> {
    const db = await this.init()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('metadata', 'readwrite')
      const store = transaction.objectStore('metadata')
      const request = store.put({ key, value, timestamp: Date.now() })

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getMetadata(key: string): Promise<any> {
    const db = await this.init()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('metadata', 'readonly')
      const store = transaction.objectStore('metadata')
      const request = store.get(key)

      request.onsuccess = () => resolve(request.result?.value || null)
      request.onerror = () => reject(request.error)
    })
  }

  // Clear all data (for testing)
  async clearAll(): Promise<void> {
    const db = await this.init()
    const stores = Array.from(db.objectStoreNames)
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(stores, 'readwrite')
      
      stores.forEach(storeName => {
        transaction.objectStore(storeName).clear()
      })

      transaction.oncomplete = () => {
        console.log('✅ All offline data cleared')
        resolve()
      }
      transaction.onerror = () => reject(transaction.error)
    })
  }
}

// Export singleton instance
export const offlineDB = new OfflineDatabase()

// Initialize on load
if (typeof window !== 'undefined') {
  offlineDB.init().catch(console.error)
}

