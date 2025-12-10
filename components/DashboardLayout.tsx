'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Package,
  FlaskConical,
  BookOpen,
  ShoppingCart,
  ChefHat,
  FileText,
  Settings,
  Users,
  Shield,
  Database,
  LogOut,
  Trash2,
} from 'lucide-react'
import { FullscreenToggle } from './FullscreenToggle'
import { InstallPWA } from './InstallPWA'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Raw Material', href: '/items/raw-material', icon: Package },
  { name: 'Essence', href: '/items/essence', icon: FlaskConical },
  { name: 'Recipe', href: '/recipes', icon: BookOpen },
  { name: 'Purchase', href: '/purchases', icon: ShoppingCart },
  { name: 'Production', href: '/production', icon: ChefHat },
  { name: 'Production Cost Report', href: '/reports/production-cost', icon: FileText },
  { name: 'Stock Report', href: '/reports/stock', icon: Package },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
    children: [
      { name: 'User Management', href: '/settings/users', icon: Users },
      { name: 'Access Control', href: '/settings/access', icon: Shield },
      { name: 'Backup', href: '/settings/backup', icon: Database },
    ],
  },
  {
    name: 'Trash Bin',
    href: '/trash',
    icon: Trash2,
  },
]

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-secondary">
      <div className="flex">
        {/* Sidebar Navigation */}
        <aside className="w-64 bg-white border-r border-gray-200 min-h-screen">
          <div className="p-4">
            <div className="bg-primary text-white px-3 py-2 rounded text-xl font-bold text-center mb-6">
              RFB
            </div>
            <nav className="space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
                const Icon = item.icon

                return (
                  <div key={item.name}>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                        isActive
                          ? 'bg-primary text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      )}
                    >
                      <Icon className="mr-3 h-5 w-5" />
                      {item.name}
                    </Link>
                    {item.children && isActive && (
                      <div className="ml-8 mt-1 space-y-1">
                        {item.children.map((child) => {
                          const ChildIcon = child.icon
                          const isChildActive = pathname === child.href
                          return (
                            <Link
                              key={child.name}
                              href={child.href}
                              className={cn(
                                'flex items-center px-3 py-2 text-sm rounded-md transition-colors',
                                isChildActive
                                  ? 'bg-primary text-white'
                                  : 'text-gray-600 hover:bg-gray-50'
                              )}
                            >
                              <ChildIcon className="mr-3 h-4 w-4" />
                              {child.name}
                            </Link>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">RFB Inventory System</h1>
                <p className="text-sm text-gray-600">
                  {session?.user?.name} ({session?.user?.role})
                </p>
              </div>
              <div className="flex items-center gap-4">
                {/* Logo - 20mm size for print */}
                <div className="bg-primary text-white px-4 py-2 rounded text-xl font-bold logo-print">
                  RFB
                </div>
                <InstallPWA />
                <FullscreenToggle />
                <button
                  onClick={() => signOut()}
                  className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </div>
  )
}

