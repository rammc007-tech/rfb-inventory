import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { RegisterSW } from './register-sw'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'RFB Inventory & Production System',
  description: 'Bakery inventory and production management system',
  manifest: '/manifest.json',
  themeColor: '#D64545',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'RFB Inventory',
  },
  other: {
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <RegisterSW />
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

