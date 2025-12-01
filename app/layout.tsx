import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import InstallPWA from '@/components/InstallPWA'
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration'

export const metadata: Metadata = {
  title: 'RFB Inventory Management',
  description: 'RISHA FOODS AND BAKERY - Inventory Management System',
  manifest: '/manifest.json',
  themeColor: '#dc2626',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'RFB Inventory',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="antialiased">
        <ServiceWorkerRegistration />
        <AuthProvider>
          {children}
          <InstallPWA />
        </AuthProvider>
      </body>
    </html>
  )
}

