// Centralized sync manager for real-time data synchronization

class DataSyncManager {
  private listeners: Map<string, Set<() => void>> = new Map()

  // Register a listener for a specific event
  on(event: string, callback: () => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)
    
    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback)
    }
  }

  // Emit an event to all listeners
  emit(event: string, data?: any) {
    console.log(`📡 Sync event: ${event}`, data)
    
    // Dispatch browser event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(event, { detail: data }))
    }
    
    // Call registered listeners
    this.listeners.get(event)?.forEach(callback => {
      try {
        callback()
      } catch (error) {
        console.error(`Error in sync listener for ${event}:`, error)
      }
    })
  }

  // Emit multiple related events
  emitAll(events: string[], data?: any) {
    events.forEach(event => this.emit(event, data))
  }

  // Common sync events
  notifyDelete(category: string, id: string) {
    this.emitAll([
      `${category}-deleted`,
      'deleted-items-updated',
      'data-changed',
    ], { category, id })
  }

  notifyRestore(category: string, id: string) {
    this.emitAll([
      `${category}-restored`,
      'data-restored',
      'raw-material-updated',
      'essential-item-updated',
      'data-changed',
    ], { category, id })
  }

  notifyUpdate(category: string, id: string) {
    this.emitAll([
      `${category}-updated`,
      'data-changed',
    ], { category, id })
  }
}

export const syncManager = new DataSyncManager()

// Auto-setup global sync events
if (typeof window !== 'undefined') {
  // Log all sync events in development
  if (process.env.NODE_ENV === 'development') {
    window.addEventListener('data-changed', (e: any) => {
      console.log('📡 Data changed:', e.detail)
    })
  }
}

