'use client'

import { useState, useEffect, useRef } from 'react'
import { RefreshCw } from 'lucide-react'

interface PullToRefreshProps {
  onRefresh?: () => Promise<void>
}

export default function PullToRefresh({ onRefresh }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0)
  const [isPulling, setIsPulling] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [mounted, setMounted] = useState(false)
  const startY = useRef(0)
  const currentY = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const PULL_THRESHOLD = 80 // Minimum pull distance to trigger refresh
  const MAX_PULL = 120 // Maximum pull distance

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return

    let touchStartY = 0
    let isTouchDevice = false

    // Check if touch device
    const checkTouch = () => {
      isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    }
    checkTouch()

    const handleTouchStart = (e: TouchEvent) => {
      // Only trigger if at top of page
      if (window.scrollY === 0) {
        touchStartY = e.touches[0].clientY
        startY.current = touchStartY
        setIsPulling(true)
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling || window.scrollY > 0) return

      currentY.current = e.touches[0].clientY
      const distance = currentY.current - startY.current

      // Only pull down (positive distance)
      if (distance > 0) {
        // Prevent default scroll
        if (distance > 10) {
          e.preventDefault()
        }

        // Calculate pull distance with resistance
        const resistance = 0.5
        const adjustedDistance = Math.min(distance * resistance, MAX_PULL)
        setPullDistance(adjustedDistance)
      }
    }

    const handleTouchEnd = async () => {
      if (!isPulling) return

      setIsPulling(false)

      // Trigger refresh if pulled enough
      if (pullDistance >= PULL_THRESHOLD) {
        setIsRefreshing(true)
        
        try {
          // Call custom refresh function if provided
          if (onRefresh) {
            await onRefresh()
          } else {
            // Default: reload page data without full page reload
            await new Promise(resolve => setTimeout(resolve, 1000))
            
            // Trigger data refresh by dispatching custom event
            window.dispatchEvent(new CustomEvent('refresh-data'))
          }
        } catch (error) {
          console.error('Refresh error:', error)
        } finally {
          setIsRefreshing(false)
          setPullDistance(0)
        }
      } else {
        // Not pulled enough, reset
        setPullDistance(0)
      }
    }

    // Add event listeners
    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [mounted, isPulling, pullDistance, onRefresh])

  if (!mounted) return null

  const progress = Math.min((pullDistance / PULL_THRESHOLD) * 100, 100)
  const shouldTrigger = pullDistance >= PULL_THRESHOLD

  return (
    <div
      ref={containerRef}
      className="fixed top-0 left-0 right-0 z-[60] pointer-events-none"
      style={{
        transform: `translateY(${pullDistance}px)`,
        transition: isPulling ? 'none' : 'transform 0.3s ease-out',
      }}
    >
      <div className="flex justify-center pt-4">
        <div
          className={`
            flex items-center justify-center
            w-12 h-12 rounded-full
            transition-all duration-300
            ${shouldTrigger 
              ? 'bg-green-500 scale-110' 
              : 'bg-primary-600 scale-100'
            }
            ${isRefreshing ? 'animate-spin' : ''}
            shadow-lg
          `}
          style={{
            opacity: pullDistance > 0 ? 1 : 0,
          }}
        >
          <RefreshCw 
            size={24} 
            className="text-white"
            style={{
              transform: isRefreshing ? 'none' : `rotate(${progress * 3.6}deg)`,
            }}
          />
        </div>
      </div>

      {/* Progress indicator */}
      {pullDistance > 0 && !isRefreshing && (
        <div className="flex justify-center mt-2">
          <div className="bg-white rounded-full px-4 py-1 shadow-md">
            <p className="text-xs font-medium text-gray-600">
              {shouldTrigger ? '🎉 Release to refresh' : '⬇️ Pull to refresh'}
            </p>
          </div>
        </div>
      )}

      {/* Refreshing message */}
      {isRefreshing && (
        <div className="flex justify-center mt-2">
          <div className="bg-white rounded-full px-4 py-1 shadow-md">
            <p className="text-xs font-medium text-primary-600">
              🔄 Refreshing...
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

