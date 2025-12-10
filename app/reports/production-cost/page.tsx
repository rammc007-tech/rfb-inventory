'use client'

import { DashboardLayout } from '@/components/DashboardLayout'
import { PrintButton } from '@/components/PrintButton'
import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
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
  laborCost: number
  overheadCost: number
  items: Array<{
    quantity: number
    unit: {
      symbol: string
    }
    item: {
      name: string
    }
    unitCost: number
    lineTotal: number
  }>
}

export default function ProductionCostReportPage() {
  const [productions, setProductions] = useState<Production[]>([])
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [recipeFilter, setRecipeFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
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
          production.recipe?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          production.items?.some((item) =>
            item.item?.name?.toLowerCase().includes(searchTerm.toLowerCase())
          )
        
        if (!matchesSearch) return false

        // Date range filter
        if (startDate || endDate) {
          const prodDate = new Date(production.date)
          if (startDate && prodDate < new Date(startDate)) return false
          if (endDate && prodDate > new Date(endDate + 'T23:59:59')) return false
        }

        // Recipe filter
        if (recipeFilter !== 'all' && production.recipe?.id !== recipeFilter) {
          return false
        }

        return true
      })
    : []

  const totalCost = filteredProductions.reduce((sum, p) => sum + p.totalCost, 0)
  const totalProduced = filteredProductions.reduce((sum, p) => sum + p.producedQuantity, 0)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Production Cost Report</h2>
            <p className="text-gray-600 mt-1">Detailed production cost analysis</p>
          </div>
          <div className="flex items-center gap-2">
            <PrintButton
              endpoint="/api/pdf/generate"
              options={{
                title: 'Production Cost Report',
                subtitle: startDate && endDate 
                  ? `RISHA FOODS AND BAKERY | From ${formatDate(startDate)} to ${formatDate(endDate)}`
                  : 'RISHA FOODS AND BAKERY',
                columns: [
                  { header: 'S.No', dataKey: 'sno' },
                  { header: 'Recipe', dataKey: 'recipe' },
                  { header: 'Date', dataKey: 'date' },
                  { header: 'Quantity', dataKey: 'quantity' },
                  { header: 'Total Cost', dataKey: 'totalCost' },
                  { header: 'Cost/Unit', dataKey: 'costPerUnit' },
                ],
                data: filteredProductions.map((production, idx) => ({
                  sno: (idx + 1).toString(),
                  recipe: production.recipe.name,
                  date: formatDate(production.date),
                  quantity: `${production.producedQuantity} ${production.producedUnit.symbol}`,
                  totalCost: formatCurrency(production.totalCost),
                  costPerUnit: formatCurrency(production.costPerUnit),
                })),
                filename: 'production-cost-report',
                showDate: true,
                detailedBreakdown: filteredProductions.map((production) => ({
                  recipeName: production.recipe.name,
                  date: formatDate(production.date),
                  quantity: `${production.producedQuantity} ${production.producedUnit.symbol}`,
                  ingredients: production.items.map((item) => ({
                    itemName: item.item.name,
                    quantity: `${item.quantity.toFixed(2)} ${item.unit.symbol}`,
                    unitCost: formatCurrency(item.unitCost),
                    total: formatCurrency(item.lineTotal),
                  })),
                  laborCost: formatCurrency(production.laborCost),
                  overheadCost: formatCurrency(production.overheadCost),
                  totalCost: formatCurrency(production.totalCost),
                  costPerUnit: formatCurrency(production.costPerUnit),
                })),
                summary: {
                  totalProductions: filteredProductions.length,
                  totalQuantity: totalProduced.toFixed(2),
                  totalCost: formatCurrency(totalCost),
                },
              }}
            />
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white p-4 rounded-lg shadow space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by recipe name or ingredient..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          
          {/* Filter Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
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

        {/* Summary */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Total Productions</p>
              <p className="text-2xl font-bold text-gray-900">{filteredProductions.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Quantity</p>
              <p className="text-2xl font-bold text-gray-900">{totalProduced.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Cost</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalCost)}</p>
            </div>
          </div>
        </div>

        {/* Detailed Report */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : filteredProductions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No productions found</div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredProductions.map((production) => (
                <div key={production.id} className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">
                        {production.recipe.name}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {formatDate(production.date)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Quantity</p>
                      <p className="text-lg font-medium text-gray-900">
                        {production.producedQuantity} {production.producedUnit.symbol}
                      </p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Ingredients</h5>
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Item
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Quantity
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Unit Cost
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {production.items.map((item, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {item.item.name}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-500">
                              {item.quantity.toFixed(2)} {item.unit.symbol}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-500">
                              {formatCurrency(item.unitCost)}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {formatCurrency(item.lineTotal)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Labor Cost:</span>
                        <span className="text-gray-900">{formatCurrency(production.laborCost)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Overhead Cost:</span>
                        <span className="text-gray-900">{formatCurrency(production.overheadCost)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Total Cost</p>
                      <p className="text-xl font-bold text-gray-900">
                        {formatCurrency(production.totalCost)}
                      </p>
                      <p className="text-sm text-gray-600">
                        Cost/Unit: {formatCurrency(production.costPerUnit)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

