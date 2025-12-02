'use client'

// Client-side IndexedDB for Netlify deployment
// This solves the read-only file system issue

const DB_NAME = 'rfb_inventory'
const DB_VERSION = 1

interface Database {
  raw_materials: any[]
  purchase_batches: any[]
  recipes: any[]
  recipe_ingredients: any[]
  production_logs: any[]
  users: any[]
  shop_settings: any[]
  packing_materials: any[]
  packing_purchases: any[]
  deleted_items: any[]
}

let dbInstance: IDBDatabase | null = null

// Initialize IndexedDB
export async function initDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      dbInstance = request.result
      resolve(request.result)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // Create object stores
      const stores = [
        'raw_materials',
        'purchase_batches',
        'recipes',
        'recipe_ingredients',
        'production_logs',
        'users',
        'shop_settings',
        'packing_materials',
        'packing_purchases',
        'deleted_items',
      ]

      stores.forEach((storeName) => {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'id' })
        }
      })
    }
  })
}

// Get all items from a store
export async function getAll(storeName: string): Promise<any[]> {
  const db = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly')
    const store = transaction.objectStore(storeName)
    const request = store.getAll()

    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => reject(request.error)
  })
}

// Add or update item
export async function saveItem(storeName: string, item: any): Promise<void> {
  const db = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite')
    const store = transaction.objectStore(storeName)
    const request = store.put(item)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

// Delete item
export async function deleteItem(storeName: string, id: string): Promise<void> {
  const db = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite')
    const store = transaction.objectStore(storeName)
    const request = store.delete(id)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

// Get single item
export async function getItem(storeName: string, id: string): Promise<any> {
  const db = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly')
    const store = transaction.objectStore(storeName)
    const request = store.get(id)

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// Clear all data from a store
export async function clearStore(storeName: string): Promise<void> {
  const db = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite')
    const store = transaction.objectStore(storeName)
    const request = store.clear()

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

// Sync data to/from API
export async function syncWithAPI(endpoint: string, storeName: string): Promise<void> {
  try {
    // Get data from API
    const response = await fetch(endpoint)
    if (!response.ok) return

    const data = await response.json()
    
    // Save to IndexedDB
    if (Array.isArray(data)) {
      for (const item of data) {
        await saveItem(storeName, item)
      }
    }
  } catch (error) {
    console.error('Sync error:', error)
  }
}

// Export all data (for backup)
export async function exportAllData(): Promise<Database> {
  const stores = [
    'raw_materials',
    'purchase_batches',
    'recipes',
    'recipe_ingredients',
    'production_logs',
    'users',
    'shop_settings',
    'packing_materials',
    'packing_purchases',
    'deleted_items',
  ]

  const data: any = {}
  for (const store of stores) {
    data[store] = await getAll(store)
  }

  return data as Database
}

// Import all data (for restore)
export async function importAllData(data: Database): Promise<void> {
  const stores = Object.keys(data) as (keyof Database)[]

  for (const storeName of stores) {
    const items = data[storeName]
    if (Array.isArray(items)) {
      for (const item of items) {
        await saveItem(storeName, item)
      }
    }
  }
}

