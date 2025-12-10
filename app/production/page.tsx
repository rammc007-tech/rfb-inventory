'use client'

import { DashboardLayout } from '@/components/DashboardLayout'
import { PrintButton } from '@/components/PrintButton'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Search } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'

interface Production {
  id: string
  date: string
  recipe: {
    id: string
    name: string
  }
  producedQuantity: number
  producedUnit: {
    symbol: string
  }
  totalCost: number
  costPerUnit: number
}

export default function ProductionPage() {
  const [productions, setProductions] = useState<Production[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedDate, setSelectedDate] = useState('') // Single date select
  const [recipeFilter, setRecipeFilter] = useState<string>('all')
  const [recipes, setRecipes] = useState<Array<{ id: string; name: string }>>([])

  useEffect(() => {
    fetchProductions()
    fetchRecipes()
  }, [])

  const fetchRecipes = async () => {
    try {
      const response = await fetch('/api/recipes')
      if (response.ok) {
        const data = await response.json()
        setRecipes(Array.isArray(data) ? data.map((r: any) => ({ id: r.id, name: r.name })) : [])
      }
    } catch (error) {
      console.error('Failed to fetch recipes:', error)
    }
  }

  const fetchProductions = async () => {
    try {
      const response = await fetch('/api/production')
      if (!response.ok) {
        throw new Error('Failed to fetch productions')
      }
      const data = await response.json()
      setProductions(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch productions:', error)
      setProductions([])
    } finally {
      setLoading(false)
    }
  }

  const filteredProductions = Array.isArray(productions)
    ? productions.filter((production) => {
        // Search filter
        const matchesSearch = 
          production.recipe?.name?.toLowerCase().includes(searchTerm.toLowerCase())
        
        if (!matchesSearch) return false

        // Single date filter (priority over date range)
        if (selectedDate) {
          const prodDate = new Date(production.date)
          const selected = new Date(selectedDate)
          const prodDateStr = prodDate.toISOString().split('T')[0]
          const selectedDateStr = selected.toISOString().split('T')[0]
          if (prodDateStr !== selectedDateStr) return false
        } else {
          // Date range filter
          if (startDate || endDate) {
            const prodDate = new Date(production.date)
            if (startDate && prodDate < new Date(startDate)) return false
            if (endDate && prodDate > new Date(endDate + 'T23:59:59')) return false
          }
        }

        // Recipe filter
        if (recipeFilter !== 'all' && production.recipe?.id !== recipeFilter) {
          return false
        }

        return true
      })
    : []

  // Calculate daily totals grouped by date
  const dailyTotals = filteredProductions.reduce((acc, production) => {
    const dateStr = new Date(production.date).toISOString().split('T')[0]
    if (!acc[dateStr]) {
      acc[dateStr] = 0
    }
    acc[dateStr] += production.totalCost
    return acc
  }, {} as Record<string, number>)

  // Calculate monthly totals
  const monthlyTotals = filteredProductions.reduce((acc, production) => {
    const date = new Date(production.date)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    if (!acc[monthKey]) {
      acc[monthKey] = 0
    }
    acc[monthKey] += production.totalCost
    return acc
  }, {} as Record<string, number>)

  // Calculate grand total
  const grandTotal = filteredProductions.reduce((sum, production) => sum + production.totalCost, 0)

  // Get selected date total
  const selectedDateTotal = selectedDate ? dailyTotals[selectedDate] || 0 : 0

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Production</h2>
            <p className="text-gray-600 mt-1">View production records</p>
          </div>
          <div className="flex items-center gap-2">
            <PrintButton
              endpoint="/api/pdf/generate"
              options={{
                title: 'Production Records',
                subtitle: selectedDate 
                  ? `RISHA FOODS AND BAKERY | Date: ${formatDate(selectedDate)} | Total Cost: ${formatCurrency(selectedDateTotal)}`
                  : startDate || endDate
                  ? `RISHA FOODS AND BAKERY | From ${startDate ? formatDate(startDate) : 'Start'} to ${endDate ? formatDate(endDate) : 'End'}`
                  : 'RISHA FOODS AND BAKERY',
                columns: [
                  { header: 'Date', dataKey: 'date' },
                  { header: 'Recipe', dataKey: 'recipe' },
                  { header: 'Quantity', dataKey: 'quantity' },
                  { header: 'Total Cost', dataKey: 'totalCost' },
                  { header: 'Cost/Unit', dataKey: 'costPerUnit' },
                ],
                data: filteredProductions.map((production) => ({
                  date: formatDate(production.date),
                  recipe: production.recipe.name,
                  quantity: `${production.producedQuantity} ${production.producedUnit.symbol}`,
                  totalCost: formatCurrency(production.totalCost),
                  costPerUnit: formatCurrency(production.costPerUnit),
                })),
                filename: selectedDate ? `productions-${selectedDate}` : 'productions',
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
              href="/production/new"
              className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-md hover:bg-opacity-90"
            >
              <Plus className="h-5 w-5" />
              New Production
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
              placeholder="Search by recipe name..."
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

            {/* Recipe Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Recipe
              </label>
              <select
                value={recipeFilter}
                onChange={(e) => setRecipeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Recipes</option>
                {recipes.map((recipe) => (
                  <option key={recipe.id} value={recipe.id}>
                    {recipe.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Productions Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : filteredProductions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No productions found</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Recipe
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Cost
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cost/Unit
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProductions.map((production) => (
                  <tr key={production.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(production.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {production.recipe.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {production.producedQuantity} {production.producedUnit.symbol}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(production.totalCost)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(production.costPerUnit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Daily and Monthly Totals Summary */}
        {filteredProductions.length > 0 && (
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

