// Optimized fetcher for fast performance

export const fastFetcher = async (url: string) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('rfb_token') : null
  
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    // Performance optimizations
    cache: 'no-store',
    next: { revalidate: 0 }
  })
  
  if (!response.ok) {
    throw new Error('Failed to fetch')
  }
  
  return response.json()
}

// Optimized SWR config for all pages
export const fastSWRConfig = {
  revalidateOnFocus: false,        // Don't refetch on tab focus
  revalidateOnReconnect: false,    // Don't refetch on reconnect
  revalidateIfStale: false,        // Don't refetch if data is stale
  dedupingInterval: 5000,          // Dedupe requests for 5 seconds
  focusThrottleInterval: 0,        // No throttle
  refreshInterval: 0,              // No auto-refresh (manual only)
  errorRetryCount: 1,              // Only retry once
  errorRetryInterval: 1000,        // Wait 1s before retry
  shouldRetryOnError: false,       // Don't auto-retry on error
  suspense: false,
  fallbackData: [],                // Instant render with empty array
  keepPreviousData: true,          // Show old data while fetching new
}

// Ultra-fast config for critical pages
export const ultraFastSWRConfig = {
  ...fastSWRConfig,
  dedupingInterval: 10000,         // Even longer deduping
  revalidateOnMount: false,        // Don't revalidate on mount
}

