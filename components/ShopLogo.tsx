'use client'

import React from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface ShopLogoProps {
  size?: 'small' | 'medium' | 'large'
  showText?: boolean
  className?: string
  shopName?: string
  logoUrl?: string
}

export default function ShopLogo({ size = 'medium', showText = true, className = '', shopName, logoUrl }: ShopLogoProps) {
  const { data: settings } = useSWR('/api/settings', fetcher)
  
  const sizeClasses = {
    small: 'w-24 h-24',
    medium: 'w-32 h-32',
    large: 'w-48 h-48',
  }

  const textSizeClasses = {
    small: 'text-lg',
    medium: 'text-2xl',
    large: 'text-4xl',
  }

  // Use provided values or fallback to settings
  const displayShopName = shopName || settings?.shopName || 'RISHA FOODS AND BAKERY'
  const displayLogoUrl = logoUrl || settings?.logoUrl || null

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {displayLogoUrl ? (
        <img
          src={displayLogoUrl}
          alt="Shop Logo"
          className={`${sizeClasses[size]} rounded-lg object-contain print:hidden`}
        />
      ) : (
        <div
          className={`${sizeClasses[size]} rounded-lg flex flex-col items-center justify-center relative overflow-hidden print:hidden`}
          style={{
            backgroundColor: '#dc2626',
            color: '#fef3c7',
          }}
        >
          {/* RFB Text */}
          <div
            className="font-bold"
            style={{
              fontSize: size === 'small' ? '32px' : size === 'medium' ? '48px' : '72px',
              letterSpacing: '2px',
              marginBottom: '4px',
            }}
          >
            RFB
          </div>
          
          {/* Food Illustrations - Simplified */}
          <div className="absolute top-1 left-1 opacity-80" style={{ fontSize: '8px' }}>
            🥟
          </div>
          <div className="absolute bottom-1 right-1 opacity-80" style={{ fontSize: '8px' }}>
            🍰
          </div>
        </div>
      )}
      
      {showText && (
        <div className={`mt-2 font-semibold text-gray-800 print:hidden ${textSizeClasses[size]}`}>
          {displayShopName}
        </div>
      )}
    </div>
  )
}

