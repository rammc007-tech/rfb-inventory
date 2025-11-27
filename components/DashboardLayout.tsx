'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  ChefHat,
  Factory,
  FileText,
  Menu,
  X,
  Calculator,
  Star,
  Settings,
} from 'lucide-react'

interface DashboardLayoutProps {
  children: React.ReactNode
}

const menuItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/raw-materials', icon: Package, label: 'Raw Materials' },
  { href: '/essential-items', icon: Star, label: 'Essential Items' },
  { href: '/purchases', icon: ShoppingCart, label: 'Purchase Entry' },
  { href: '/recipes', icon: ChefHat, label: 'Recipes' },
  { href: '/cost-calculator', icon: Calculator, label: 'Cost Calculator' },
  { href: '/production', icon: Factory, label: 'Production' },
  { href: '/reports', icon: FileText, label: 'Cost Reports' },
  { href: '/settings', icon: Settings, label: 'Settings' },
]

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white shadow-sm border-b border-gray-200 no-print">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <h1 className="text-xl font-bold text-primary-600">RFB</h1>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`
            fixed lg:static inset-y-0 left-0 z-50
            w-64 bg-white shadow-lg
            transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            lg:translate-x-0 transition-transform duration-300 ease-in-out
            border-r border-gray-200
            no-print
          `}
        >
          <div className="h-full flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold" style={{ color: '#dc2626' }}>
                RISHA FOODS AND BAKERY
              </h2>
              <p className="text-xs text-gray-500 mt-1">Inventory Management</p>
            </div>

            <nav className="flex-1 overflow-y-auto p-4 relative z-10">
              <ul className="space-y-2">
                {menuItems.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href
                  return (
                    <li key={item.href} className="relative z-10">
                      <Link
                        href={item.href}
                        onClick={() => {
                          setSidebarOpen(false)
                        }}
                        className={`
                          flex items-center gap-3 px-4 py-3 rounded-lg
                          transition-colors duration-200 cursor-pointer
                          relative z-10 block w-full
                          ${
                            isActive
                              ? 'bg-primary-100 text-primary-700 font-semibold'
                              : 'text-gray-700 hover:bg-gray-100'
                          }
                        `}
                        style={{ 
                          pointerEvents: 'auto',
                          position: 'relative',
                          zIndex: 10,
                          textDecoration: 'none'
                        }}
                      >
                        <Icon size={20} />
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:ml-0">
          {/* Desktop Header */}
          <div className="hidden lg:block bg-white shadow-sm border-b border-gray-200 no-print">
            <div className="flex items-center justify-between p-4">
              <h1 className="text-2xl font-bold text-gray-800">
                {menuItems.find((item) => item.href === pathname)?.label ||
                  'Dashboard'}
              </h1>
            </div>
          </div>

          <div className="p-4 lg:p-6">{children}</div>
        </main>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}

