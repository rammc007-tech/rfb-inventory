'use client'

import { DashboardLayout } from '@/components/DashboardLayout'
import { PrintButton } from '@/components/PrintButton'
import { useEffect, useState } from 'react'
import { Search, AlertTriangle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface StockItem {
  id: string
  name: string
  sku: string | null
  type: string
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

export default function StockReportPage() {
  const [items, setItems] = useState<StockItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [stockStatusFilter, setStockStatusFilter] = useState<string>('all')

  useEffect(() => {
    fetchItems()
  }, [])

  const fetchItems = async () => {
    try {
      const response = await fetch('/api/items')
      if (!response.ok) {
        throw new Error('Failed to fetch items')
      }
      const data = await response.json()
      setItems(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch items:', error)
      setItems([])
    } finally {
      setLoading(false)
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

        // Type filter
        if (typeFilter !== 'all' && item.type !== typeFilter) {
          return false
        }

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

  const lowStockItems = Array.isArray(filteredItems)
    ? filteredItems.filter(
        (item) => item.stock && item.stock.quantity <= item.reorderThreshold
      )
    : []

  const totalValue = filteredItems.reduce((sum, item) => {
    if (!item.stock) return sum
    return sum + (item.stock.quantity * (item.avgPrice || 0))
  }, 0)

  // Calculate totals by type
  const rawMaterialTotal = filteredItems
    .filter((item) => item.type === 'RAW_MATERIAL')
    .reduce((sum, item) => {
      if (!item.stock) return sum
      return sum + (item.stock.quantity * (item.avgPrice || 0))
    }, 0)

  const essenceTotal = filteredItems
    .filter((item) => item.type === 'ESSENCE')
    .reduce((sum, item) => {
      if (!item.stock) return sum
      return sum + (item.stock.quantity * (item.avgPrice || 0))
    }, 0)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Stock Report</h2>
            <p className="text-gray-600 mt-1">Current inventory stock levels</p>
          </div>
          <PrintButton
            endpoint="/api/pdf/generate"
            options={{
              title: 'Stock Report',
              subtitle: 'RISHA FOODS AND BAKERY',
              columns: [
                { header: 'Item Name', dataKey: 'name' },
                { header: 'SKU', dataKey: 'sku' },
                { header: 'Type', dataKey: 'type' },
                { header: 'Category', dataKey: 'category' },
                { header: 'Stock', dataKey: 'stock' },
                { header: 'Reorder Threshold', dataKey: 'reorderThreshold' },
                { header: 'Avg Price', dataKey: 'avgPrice' },
                { header: 'Value', dataKey: 'value' },
                { header: 'Location', dataKey: 'location' },
              ],
              data: filteredItems.map((item) => ({
                name: item.name,
                sku: item.sku || '-',
                type: item.type === 'RAW_MATERIAL' ? 'Raw Material' : 'Essence',
                category: item.category || '-',
                stock: item.stock ? `${item.stock.quantity} ${item.stock.unit.symbol}` : '0',
                reorderThreshold: item.reorderThreshold.toString(),
                avgPrice: formatCurrency(item.avgPrice),
                value: item.stock ? formatCurrency(item.stock.quantity * item.avgPrice) : '₹0.00',
                location: item.location || '-',
              })),
              filename: 'stock-report',
              dailyTotals: [
                {
                  date: 'Raw Material Total',
                  total: formatCurrency(rawMaterialTotal),
                },
                {
                  date: 'Essence Total',
                  total: formatCurrency(essenceTotal),
                },
              ],
              grandTotal: formatCurrency(totalValue),
            }}
          />
        </div>

        {/* Summary */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <p className="text-sm text-gray-600">Total Items</p>
              <p className="text-2xl font-bold text-gray-900">{filteredItems.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Low Stock Items</p>
              <p className="text-2xl font-bold text-red-600">{lowStockItems.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Raw Material Total</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(rawMaterialTotal)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Essence Total</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(essenceTotal)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Grand Total</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(totalValue)}</p>
            </div>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Types</option>
                <option value="RAW_MATERIAL">Raw Material</option>
                <option value="ESSENCE">Essence</option>
              </select>
            </div>

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

        {/* Stock Table */}
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
                    Item Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredItems.map((item) => {
                  const isLowStock =
                    item.stock && item.stock.quantity <= item.reorderThreshold
                  const itemValue = item.stock
                    ? item.stock.quantity * item.avgPrice
                    : 0

                  return (
                    <tr
                      key={item.id}
                      className={isLowStock ? 'bg-red-50' : ''}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {item.name}
                        </div>
                        <div className="text-sm text-gray-500">{item.sku || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.type === 'RAW_MATERIAL' ? 'Raw Material' : 'Essence'}
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(itemValue)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isLowStock ? (
                          <span className="px-2 py-1 text-xs font-medium text-red-800 bg-red-100 rounded-full">
                            Low Stock
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full">
                            In Stock
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={2} className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                    Raw Material Total:
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                    {filteredItems
                      .filter((item) => item.type === 'RAW_MATERIAL')
                      .reduce((sum, item) => {
                        if (!item.stock) return sum
                        return sum + item.stock.quantity
                      }, 0)
                      .toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                    {formatCurrency(rawMaterialTotal)}
                  </td>
                  <td className="px-6 py-4"></td>
                </tr>
                <tr>
                  <td colSpan={2} className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                    Essence Total:
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                    {filteredItems
                      .filter((item) => item.type === 'ESSENCE')
                      .reduce((sum, item) => {
                        if (!item.stock) return sum
                        return sum + item.stock.quantity
                      }, 0)
                      .toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                    {formatCurrency(essenceTotal)}
                  </td>
                  <td className="px-6 py-4"></td>
                </tr>
                <tr className="bg-primary/10">
                  <td colSpan={2} className="px-6 py-4 text-right text-sm font-bold text-gray-900">
                    Grand Total:
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                    {filteredItems.reduce((sum, item) => {
                      if (!item.stock) return sum
                      return sum + item.stock.quantity
                    }, 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-primary">
                    {formatCurrency(totalValue)}
                  </td>
                  <td className="px-6 py-4"></td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

