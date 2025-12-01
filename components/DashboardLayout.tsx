'use client'

import { useState, useEffect } from 'react'
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
  Trash2,
  LogIn,
  LogOut,
  Maximize,
  Minimize,
  User,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import ShopLogo from '@/components/ShopLogo'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

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
  { href: '/deleted-items', icon: Trash2, label: 'Deleted Items' },
  { href: '/settings', icon: Settings, label: 'Settings' },
]

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout, isAuthenticated } = useAuth()
  const { data: shopSettings } = useSWR('/api/settings', fetcher)

  useEffect(() => {
    // Get user from localStorage
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('rfb_user')
      if (userStr) {
        setCurrentUser(JSON.parse(userStr))
      }
    }
  }, [user])

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      logout()
      router.push('/')
    }
  }

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true)
      }).catch((err) => {
        console.error('Error attempting to enable fullscreen:', err)
      })
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false)
      }).catch((err) => {
        console.error('Error attempting to exit fullscreen:', err)
      })
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

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
          <ShopLogo size="small" showText={false} />
          <div className="flex items-center gap-2">
            {currentUser && (
              <div className="flex items-center gap-2 px-2 py-1 bg-blue-50 rounded-lg">
                <User size={16} className="text-blue-600" />
                <span className="text-xs font-medium text-blue-800">{currentUser.username}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  currentUser.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                  currentUser.role === 'supervisor' ? 'bg-orange-100 text-orange-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {currentUser.role}
                </span>
              </div>
            )}
            <button
              onClick={handleFullscreen}
              className="p-2 rounded-lg hover:bg-gray-100"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
            {isAuthenticated ? (
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-red-100 text-red-600"
                title="Logout"
              >
                <LogOut size={20} />
              </button>
            ) : (
              <Link
                href="/"
                className="p-2 rounded-lg hover:bg-blue-100 text-blue-600"
                title="Login"
              >
                <LogIn size={20} />
              </Link>
            )}
          </div>
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
              <ShopLogo 
                size="small" 
                showText={true} 
                shopName={shopSettings?.shopName}
                logoUrl={shopSettings?.logoUrl}
              />
              <p className="text-xs text-gray-500 mt-2 text-center">Inventory Management</p>
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
              <div className="flex items-center gap-3">
                {currentUser && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-200">
                    <User size={18} className="text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">{currentUser.username}</span>
                    <span className={`text-xs px-2 py-0.5 rounded font-semibold ${
                      currentUser.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                      currentUser.role === 'supervisor' ? 'bg-orange-100 text-orange-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {currentUser.role}
                    </span>
                  </div>
                )}
                <button
                  onClick={handleFullscreen}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Toggle Fullscreen"
                >
                  {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                </button>
                {isAuthenticated ? (
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-100 text-red-600 transition-colors"
                    title="Logout"
                  >
                    <LogOut size={18} />
                    <span className="text-sm font-medium">Logout</span>
                  </button>
                ) : (
                  <Link
                    href="/"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-blue-100 text-blue-600 transition-colors"
                    title="Login"
                  >
                    <LogIn size={18} />
                    <span className="text-sm font-medium">Login</span>
                  </Link>
                )}
              </div>
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

