import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration'

export const metadata: Metadata = {
  title: 'RFB Inventory Management',
  description: 'RISHA FOODS AND BAKERY - Inventory Management System',
  manifest: '/manifest.json',
  themeColor: '#dc2626',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
  icons: {
    icon: '/icon',
    apple: '/apple-icon',
  },
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="RFB Inventory" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <ServiceWorkerRegistration />
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}

