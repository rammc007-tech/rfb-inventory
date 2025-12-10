'use client'

import { DashboardLayout } from '@/components/DashboardLayout'
import { PrintButton } from '@/components/PrintButton'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Search, Edit, Trash2 } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'

interface Purchase {
  id: string
  date: string
  supplier: {
    id: string
    name: string
  }
  totalAmount: number
  items: Array<{
    quantity: number
    unit: {
      symbol: string
    }
    item: {
      id: string
      name: string
      stock: {
        quantity: number
        unit: {
          symbol: string
        }
      } | null
    }
    unitPrice: number
    lineTotal: number
  }>
}

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedDate, setSelectedDate] = useState('') // Single date select
  const [supplierFilter, setSupplierFilter] = useState<string>('all')
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string }>>([])
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    fetchPurchases()
    fetchSuppliers()
  }, [])

  const fetchSuppliers = async () => {
    try {
      const response = await fetch('/api/suppliers')
      if (response.ok) {
        const data = await response.json()
        setSuppliers(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Failed to fetch suppliers:', error)
    }
  }

  const fetchPurchases = async () => {
    try {
      const response = await fetch('/api/purchases')
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        if (response.status === 401) {
          // Unauthorized - user needs to login
          console.warn('Unauthorized access - please login')
        } else {
          console.error('Failed to fetch purchases:', errorData.error || 'Unknown error')
        }
        setPurchases([])
        return
      }
      const data = await response.json()
      setPurchases(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch purchases:', error)
      setPurchases([])
    } finally {
      setLoading(false)
    }
  }

  const filteredPurchases = Array.isArray(purchases)
    ? purchases.filter((purchase) => {
        // Search filter
        const matchesSearch = 
          purchase.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          purchase.items?.some((item) =>
            item.item?.name?.toLowerCase().includes(searchTerm.toLowerCase())
          )
        
        if (!matchesSearch) return false

        // Single date filter (priority over date range)
        if (selectedDate) {
          const purchaseDate = new Date(purchase.date)
          const selected = new Date(selectedDate)
          const purchaseDateStr = purchaseDate.toISOString().split('T')[0]
          const selectedDateStr = selected.toISOString().split('T')[0]
          if (purchaseDateStr !== selectedDateStr) return false
        } else {
          // Date range filter
          if (startDate || endDate) {
            const purchaseDate = new Date(purchase.date)
            if (startDate && purchaseDate < new Date(startDate)) return false
            if (endDate && purchaseDate > new Date(endDate + 'T23:59:59')) return false
          }
        }

        // Supplier filter
        if (supplierFilter !== 'all' && purchase.supplier?.id !== supplierFilter) {
          return false
        }

        return true
      })
    : []

  // Calculate daily totals grouped by date
  const dailyTotals = filteredPurchases.reduce((acc, purchase) => {
    const dateStr = new Date(purchase.date).toISOString().split('T')[0]
    if (!acc[dateStr]) {
      acc[dateStr] = 0
    }
    acc[dateStr] += purchase.totalAmount
    return acc
  }, {} as Record<string, number>)

  // Calculate monthly totals
  const monthlyTotals = filteredPurchases.reduce((acc, purchase) => {
    const date = new Date(purchase.date)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    if (!acc[monthKey]) {
      acc[monthKey] = 0
    }
    acc[monthKey] += purchase.totalAmount
    return acc
  }, {} as Record<string, number>)

  // Calculate grand total
  const grandTotal = filteredPurchases.reduce((sum, purchase) => sum + purchase.totalAmount, 0)

  // Get selected date total
  const selectedDateTotal = selectedDate ? dailyTotals[selectedDate] || 0 : 0

  const handleDelete = async (purchaseId: string) => {
    if (!confirm('Are you sure you want to delete this purchase? This will move it to trash.')) {
      return
    }

    setDeletingId(purchaseId)
    try {
      const response = await fetch(`/api/purchases/${purchaseId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        alert('Purchase deleted successfully')
        fetchPurchases()
      } else {
        const errorData = await response.json().catch(() => ({}))
        alert(`Failed to delete purchase: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Failed to delete purchase:', error)
      alert('Failed to delete purchase')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Purchases</h2>
            <p className="text-gray-600 mt-1">View purchase records</p>
          </div>
          <div className="flex items-center gap-2">
            <PrintButton
              endpoint="/api/pdf/generate"
              options={{
                title: 'Purchase Records',
                subtitle: selectedDate 
                  ? `RISHA FOODS AND BAKERY | Date: ${formatDate(selectedDate)} | Total: ${formatCurrency(selectedDateTotal)}`
                  : startDate || endDate
                  ? `RISHA FOODS AND BAKERY | From ${startDate ? formatDate(startDate) : 'Start'} to ${endDate ? formatDate(endDate) : 'End'}`
                  : 'RISHA FOODS AND BAKERY',
                columns: [
                  { header: 'Date', dataKey: 'date' },
                  { header: 'Supplier', dataKey: 'supplier' },
                  { header: 'Items', dataKey: 'items' },
                  { header: 'Total Amount', dataKey: 'totalAmount' },
                ],
                data: filteredPurchases.map((purchase) => ({
                  date: formatDate(purchase.date),
                  supplier: purchase.supplier.name,
                  items: purchase.items.map((item) => 
                    `${item.quantity} ${item.unit.symbol} ${item.item.name}`
                  ).join(', '),
                  totalAmount: formatCurrency(purchase.totalAmount),
                })),
                filename: selectedDate ? `purchases-${selectedDate}` : 'purchases',
                dailyTotals: Object.entries(dailyTotals)
                  .sort(([a], [b]) => b.localeCompare(a))
                  .map(([date, total]) => ({
                    date: formatDate(date),
                    total: formatCurrency(total),
                  })),
                monthlyTotals: Object.entries(monthlyTotals)
                  .sort(([a], [b]) => b.localeCompare(a))
                  .map(([month, total]) => {
                    const [year, monthNum] = month.split('-')
                    const monthName = new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' })
                    return {
                      month: monthName,
                      total: formatCurrency(total),
                    }
                  }),
                grandTotal: formatCurrency(grandTotal),
              }}
            />
            <Link
              href="/purchases/new"
              className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-md hover:bg-opacity-90"
            >
              <Plus className="h-5 w-5" />
              New Purchase
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
              placeholder="Search by supplier or item..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          
          {/* Filter Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Single Date Select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value)
                  setStartDate('')
                  setEndDate('')
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {selectedDate && selectedDateTotal > 0 && (
                <p className="text-xs text-primary font-medium mt-1">
                  Total: {formatCurrency(selectedDateTotal)}
                </p>
              )}
            </div>

            {/* Date Range - Start */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  setSelectedDate('')
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Date Range - End */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value)
                  setSelectedDate('')
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Supplier Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Supplier
              </label>
              <select
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Suppliers</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Purchases Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : filteredPurchases.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No purchases found</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Supplier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPurchases.map((purchase) => (
                  <tr key={purchase.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(purchase.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {purchase.supplier.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="space-y-1">
                        {purchase.items.map((item, idx) => (
                          <div key={idx} className="text-xs">
                            {item.quantity.toFixed(2)} {item.unit.symbol} {item.item.name}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(purchase.totalAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/purchases/${purchase.id}/edit`}
                          className="text-primary hover:text-primary/80"
                          title="Edit Purchase"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleDelete(purchase.id)
                          }}
                          disabled={deletingId === purchase.id}
                          className="text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Delete Purchase"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Daily and Monthly Totals Summary */}
        {filteredPurchases.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Summary</h3>
            
            {/* Daily Totals */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Daily Totals</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {Object.entries(dailyTotals)
                  .sort(([a], [b]) => b.localeCompare(a))
                  .map(([date, total]) => (
                    <div key={date} className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">{formatDate(date)}</span>
                      <span className="text-sm font-medium text-gray-900">{formatCurrency(total)}</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Monthly Totals */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Monthly Totals</h4>
              <div className="space-y-2">
                {Object.entries(monthlyTotals)
                  .sort(([a], [b]) => b.localeCompare(a))
                  .map(([month, total]) => {
                    const [year, monthNum] = month.split('-')
                    const monthName = new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' })
                    return (
                      <div key={month} className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-600">{monthName}</span>
                        <span className="text-sm font-medium text-gray-900">{formatCurrency(total)}</span>
                      </div>
                    )
                  })}
              </div>
            </div>

            {/* Grand Total */}
            <div className="pt-4 border-t-2 border-gray-300">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold text-gray-900">Grand Total</span>
                <span className="text-xl font-bold text-primary">{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

