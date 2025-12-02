// Client-side storage using IndexedDB for persistent local storage
// This stores all data in the browser, so it persists across sessions

const DB_NAME = 'rfb-inventory-db';
const DB_VERSION = 1;
const STORE_NAME = 'inventory-data';

interface Database {
  raw_materials: any[];
  purchase_batches: any[];
  recipes: any[];
  recipe_ingredients: any[];
  production_logs: any[];
  users: any[];
  shop_settings: any[];
  packing_materials: any[];
  packing_purchases: any[];
  deleted_items: any[];
}

let dbInstance: IDBDatabase | null = null;

// Initialize IndexedDB
export function initIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB'));
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

// Load database from IndexedDB
export async function loadFromIndexedDB(): Promise<Database> {
  try {
    const db = await initIndexedDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get('main');

      request.onsuccess = () => {
        const data = request.result;
        if (data && data.data) {
          resolve(data.data);
        } else {
          // Return empty database
          resolve({
            raw_materials: [],
            purchase_batches: [],
            recipes: [],
            recipe_ingredients: [],
            production_logs: [],
            users: [],
            shop_settings: [],
            packing_materials: [],
            packing_purchases: [],
            deleted_items: [],
          });
        }
      };

      request.onerror = () => {
        reject(new Error('Failed to load from IndexedDB'));
      };
    });
  } catch (error) {
    console.error('Error loading from IndexedDB:', error);
    // Return empty database on error
    return {
      raw_materials: [],
      purchase_batches: [],
      recipes: [],
      recipe_ingredients: [],
      production_logs: [],
      users: [],
      shop_settings: [],
      packing_materials: [],
      packing_purchases: [],
      deleted_items: [],
    };
  }
}

// Save database to IndexedDB
export async function saveToIndexedDB(data: Database): Promise<boolean> {
  try {
    const db = await initIndexedDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put({
        id: 'main',
        data: data,
        updatedAt: new Date().toISOString(),
      });

      request.onsuccess = () => {
        console.log('✅ Database saved to IndexedDB');
        resolve(true);
      };

      request.onerror = () => {
        console.error('❌ Failed to save to IndexedDB');
        reject(new Error('Failed to save to IndexedDB'));
      };
    });
  } catch (error) {
    console.error('Error saving to IndexedDB:', error);
    return false;
  }
}

// Export database as JSON (for backup)
export async function exportDatabase(): Promise<string> {
  const data = await loadFromIndexedDB();
  return JSON.stringify(data, null, 2);
}

// Import database from JSON (for restore)
export async function importDatabase(jsonData: string): Promise<boolean> {
  try {
    const data = JSON.parse(jsonData);
    return await saveToIndexedDB(data);
  } catch (error) {
    console.error('Error importing database:', error);
    return false;
  }
}

// Clear all data
export async function clearIndexedDB(): Promise<boolean> {
  try {
    const db = await initIndexedDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('✅ IndexedDB cleared');
        resolve(true);
      };

      request.onerror = () => {
        reject(new Error('Failed to clear IndexedDB'));
      };
    });
  } catch (error) {
    console.error('Error clearing IndexedDB:', error);
    return false;
  }
}

