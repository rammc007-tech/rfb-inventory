'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/DashboardLayout'
import { Package, ShoppingCart, ChefHat, Factory } from 'lucide-react'
import useSWR from 'swr'
import ShopLogo from '@/components/ShopLogo'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

function DashboardContent() {
  const { data: materials } = useSWR('/api/raw-materials', fetcher)
  const { data: recipes } = useSWR('/api/recipes', fetcher)
  const { data: purchases } = useSWR('/api/purchases', fetcher)
  const { data: productions } = useSWR('/api/production', fetcher)
  const { data: shopSettings } = useSWR('/api/settings', fetcher)

  // Ensure all data is arrays
  const materialsArray = Array.isArray(materials) ? materials : []
  const recipesArray = Array.isArray(recipes) ? recipes : []
  const productionsArray = Array.isArray(productions) ? productions : []

  const totalMaterials = materialsArray.length
  const totalRecipes = recipesArray.length
  const lowStockMaterials = materialsArray.filter(
    (m: any) => m.currentStock < 10
  ).length
  const todayProductions = productionsArray.filter(
    (p: any) =>
      new Date(p.productionDate).toDateString() === new Date().toDateString()
  ).length

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between no-print">
          <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
          <ShopLogo 
            size="small" 
            showText={false}
            shopName={shopSettings?.shopName}
            logoUrl={shopSettings?.logoUrl}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Raw Materials</p>
                <p className="text-3xl font-bold text-gray-800 mt-2">
                  {totalMaterials}
                </p>
              </div>
              <Package className="w-12 h-12 text-primary-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Recipes</p>
                <p className="text-3xl font-bold text-gray-800 mt-2">
                  {totalRecipes}
                </p>
              </div>
              <ChefHat className="w-12 h-12 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Low Stock Items</p>
                <p className="text-3xl font-bold text-orange-600 mt-2">
                  {lowStockMaterials}
                </p>
              </div>
              <ShoppingCart className="w-12 h-12 text-orange-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Today&apos;s Production</p>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  {todayProductions}
                </p>
              </div>
              <Factory className="w-12 h-12 text-green-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Recent Production Logs
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Recipe
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Batches
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Cost
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cost/Unit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {productionsArray.length > 0 ? (
                  productionsArray.slice(0, 5).map((prod: any) => (
                  <tr key={prod.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {prod.recipeName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {prod.batches}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ₹{prod.totalCost.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ₹{prod.costPerUnit.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(prod.productionDate).toLocaleDateString()}
                    </td>
                  </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                      No production logs yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default function DashboardPage() {
  const { isAuthenticated } = useAuth()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    
    // Check localStorage as fallback
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('rfb_token') : null
    
    if (!isAuthenticated && !storedToken) {
      router.push('/')
    }
  }, [isAuthenticated, router, mounted])

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Show loading while checking auth
  if (!isAuthenticated) {
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('rfb_token') : null
    if (!storedToken) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Redirecting to login...</p>
          </div>
        </div>
      )
    }
    // If token exists but state not updated, wait a bit
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return <DashboardContent />
}
