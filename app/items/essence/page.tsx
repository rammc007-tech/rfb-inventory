'use client'

import { DashboardLayout } from '@/components/DashboardLayout'
import { PrintButton } from '@/components/PrintButton'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Search, Edit, Trash2, AlertTriangle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface Item {
  id: string
  name: string
  sku: string | null
  category: string | null
  reorderThreshold: number
  avgPrice: number
  location: string | null
  stock: {
    quantity: number
    unit: {
      symbol: string
    }
  } | null
}

export default function EssencePage() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [stockStatusFilter, setStockStatusFilter] = useState<string>('all')

  useEffect(() => {
    fetchItems()
  }, [])

  const fetchItems = async () => {
    try {
      const response = await fetch('/api/items?type=ESSENCE')
      if (!response.ok) {
        throw new Error('Failed to fetch items')
      }
      const data = await response.json()
      // Ensure data is an array
      setItems(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch items:', error)
      setItems([]) // Set to empty array on error
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) {
      return
    }

    setDeletingId(id)
    try {
      console.log('Deleting item with id:', id)
      const response = await fetch(`/api/items/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      console.log('Delete response status:', response.status)

      if (response.ok) {
        const result = await response.json()
        console.log('Delete successful:', result)
        alert('Item deleted successfully')
        fetchItems()
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('Delete failed:', errorData)
        alert(`Failed to delete item: ${errorData.error || errorData.details || 'Unknown error'}`)
      }
    } catch (error: any) {
      console.error('Failed to delete item:', error)
      alert(`Failed to delete item: ${error?.message || 'Network error'}`)
    } finally {
      setDeletingId(null)
    }
  }

  // Get unique categories for filter
  const categories = Array.from(new Set(items.map(item => item.category).filter(Boolean))) as string[]

  const filteredItems = Array.isArray(items)
    ? items.filter((item) => {
        // Search filter
        const matchesSearch = 
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.sku?.toLowerCase().includes(searchTerm.toLowerCase())
        
        if (!matchesSearch) return false

        // Category filter
        if (categoryFilter !== 'all') {
          if (categoryFilter === 'uncategorized' && item.category) return false
          if (categoryFilter !== 'uncategorized' && item.category !== categoryFilter) return false
        }

        // Stock status filter
        if (stockStatusFilter !== 'all') {
          const isLowStock = item.stock && item.stock.quantity <= item.reorderThreshold
          if (stockStatusFilter === 'low-stock' && !isLowStock) return false
          if (stockStatusFilter === 'in-stock' && isLowStock) return false
          if (stockStatusFilter === 'out-of-stock' && item.stock && item.stock.quantity > 0) return false
        }

        return true
      })
    : []

  const lowStockItems = filteredItems.filter(
    (item) => item.stock && item.stock.quantity <= item.reorderThreshold
  )

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Essences</h2>
            <p className="text-gray-600 mt-1">Manage essence inventory</p>
          </div>
          <div className="flex items-center gap-2">
            <PrintButton
              endpoint="/api/pdf/generate"
              options={{
                title: 'Essences List',
                subtitle: 'RISHA FOODS AND BAKERY',
                columns: [
                  { header: 'Name', dataKey: 'name' },
                  { header: 'SKU', dataKey: 'sku' },
                  { header: 'Category', dataKey: 'category' },
                  { header: 'Stock', dataKey: 'stockDisplay' },
                  { header: 'Avg Price', dataKey: 'avgPriceDisplay' },
                ],
                data: filteredItems.map((item) => ({
                  name: item.name,
                  sku: item.sku || '-',
                  category: item.category || '-',
                  stockDisplay: item.stock ? `${item.stock.quantity} ${item.stock.unit.symbol}` : '0',
                  avgPriceDisplay: formatCurrency(item.avgPrice),
                })),
                filename: 'essences',
              }}
            />
            <Link
              href="/items/essence/new"
              className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-md hover:bg-opacity-90"
            >
              <Plus className="h-5 w-5" />
              Add Essence
            </Link>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white p-4 rounded-lg shadow space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          
          {/* Filter Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value="uncategorized">Uncategorized</option>
              </select>
            </div>

            {/* Stock Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stock Status
              </label>
              <select
                value={stockStatusFilter}
                onChange={(e) => setStockStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Items</option>
                <option value="in-stock">In Stock</option>
                <option value="low-stock">Low Stock</option>
                <option value="out-of-stock">Out of Stock</option>
              </select>
            </div>
          </div>
        </div>

        {/* Low Stock Alert */}
        {lowStockItems.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              <p className="font-medium">
                {lowStockItems.length} item(s) below reorder threshold
              </p>
            </div>
          </div>
        )}

        {/* Items Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : filteredItems.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No items found</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Price
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredItems.map((item) => {
                  const isLowStock =
                    item.stock && item.stock.quantity <= item.reorderThreshold

                  return (
                    <tr
                      key={item.id}
                      className={isLowStock ? 'bg-red-50' : ''}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {item.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.sku || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.category || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {item.stock
                            ? `${item.stock.quantity} ${item.stock.unit.symbol}`
                            : '0'}
                          {isLowStock && (
                            <AlertTriangle className="inline-block ml-2 h-4 w-4 text-red-600" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatCurrency(item.avgPrice)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/items/essence/${item.id}/edit`}
                            className="text-primary hover:text-primary/80"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              handleDelete(item.id)
                            }}
                            disabled={deletingId === item.id}
                            className="text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            title="Delete item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

