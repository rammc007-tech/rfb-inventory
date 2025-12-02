'use client'

import { useEffect } from 'react'
import { mutate } from 'swr'

// Hook to handle data refresh on pull-to-refresh
export function useRefreshData(apiEndpoint: string) {
  useEffect(() => {
    const handleRefresh = async () => {
      try {
        console.log('Refreshing data for:', apiEndpoint)
        // Revalidate SWR cache
        await mutate(apiEndpoint)
      } catch (error) {
        console.error('Refresh error:', error)
      }
    }

    // Listen for refresh event
    window.addEventListener('refresh-data', handleRefresh)

    return () => {
      window.removeEventListener('refresh-data', handleRefresh)
    }
  }, [apiEndpoint])
}

// Hook to refresh all data
export function useRefreshAll(endpoints: string[]) {
  useEffect(() => {
    const handleRefresh = async () => {
      try {
        console.log('Refreshing all data...')
        // Revalidate all endpoints
        await Promise.all(endpoints.map(endpoint => mutate(endpoint)))
        console.log('✓ All data refreshed')
      } catch (error) {
        console.error('Refresh error:', error)
      }
    }

    window.addEventListener('refresh-data', handleRefresh)

    return () => {
      window.removeEventListener('refresh-data', handleRefresh)
    }
  }, [endpoints])
}

