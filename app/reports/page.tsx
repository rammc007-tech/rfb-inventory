'use client'

import { useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { Printer, Filter, Calendar } from 'lucide-react'
import useSWR from 'swr'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function ReportsPage() {
  const { data: productions } = useSWR('/api/production', fetcher)
  const { data: recipes } = useSWR('/api/recipes', fetcher)
  const [filterType, setFilterType] = useState<'all' | 'today' | 'week' | 'month'>('all')
  const [selectedDate, setSelectedDate] = useState('')

  const filteredProductions = productions?.filter((p: any) => {
    const prodDate = new Date(p.productionDate)
    const now = new Date()
    
    if (selectedDate) {
      const selected = new Date(selectedDate)
      return prodDate.toDateString() === selected.toDateString()
    }
    
    if (filterType === 'all') return true
    
    if (filterType === 'today') {
      return prodDate.toDateString() === now.toDateString()
    }
    
    if (filterType === 'week') {
      const weekStart = startOfWeek(now)
      return prodDate >= weekStart
    }
    
    if (filterType === 'month') {
      const monthStart = startOfMonth(now)
      return prodDate >= monthStart
    }
    
    return true
  }) || []

  // Calculate statistics
  const totalProductions = filteredProductions.length || 0
  const totalCost = filteredProductions.reduce((sum: number, p: any) => sum + p.totalCost, 0) || 0
  const todayProductions = filteredProductions.filter(
    (p: any) =>
      new Date(p.productionDate).toDateString() === new Date().toDateString()
  ) || []
  const todayCost = todayProductions.reduce((sum: number, p: any) => sum + p.totalCost, 0)

  // Group by recipe
  const recipeStats: Record<string, any> = {}
  filteredProductions.forEach((prod: any) => {
    if (!recipeStats[prod.recipeId]) {
      recipeStats[prod.recipeId] = {
        recipeName: prod.recipeName,
        totalBatches: 0,
        totalCost: 0,
        avgCostPerUnit: 0,
      }
    }
    recipeStats[prod.recipeId].totalBatches += prod.batches
    recipeStats[prod.recipeId].totalCost += prod.totalCost
  })

  // Calculate average cost per unit for each recipe
  Object.keys(recipeStats).forEach((recipeId) => {
    const recipe = recipes?.find((r: any) => r.id === recipeId)
    if (recipe) {
      const totalOutput = recipe.outputQty * recipeStats[recipeId].totalBatches
      recipeStats[recipeId].avgCostPerUnit =
        totalOutput > 0 ? recipeStats[recipeId].totalCost / totalOutput : 0
    }
  })

  const handlePrint = () => {
    window.print()
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">Cost Reports</h2>
          <div className="flex gap-2">
            <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-1">
              <Filter size={16} />
              <select
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value as any)
                  setSelectedDate('')
                }}
                className="border-0 focus:ring-0 text-sm"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>
            <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-1">
              <Calendar size={16} />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value)
                  setFilterType('all')
                }}
                className="border-0 focus:ring-0 text-sm"
              />
            </div>
            {filteredProductions.length > 0 && (
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                <Printer size={18} />
                Print Report
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Total Production Runs</p>
            <p className="text-3xl font-bold text-gray-800 mt-2">
              {totalProductions}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Total Production Cost</p>
            <p className="text-3xl font-bold text-green-600 mt-2">
              ₹{totalCost.toFixed(2)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Today&apos;s Production Cost</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">
              ₹{todayCost.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 print:shadow-none">
          <div className="hidden print:block mb-4 border-b pb-4">
            <h3 className="text-xl font-bold" style={{ color: '#dc2626' }}>
              RISHA FOODS AND BAKERY
            </h3>
            <p className="text-sm text-gray-600">Production Cost Report</p>
            <p className="text-xs text-gray-500">
              {selectedDate
                ? format(new Date(selectedDate), 'MMM dd, yyyy')
                : filterType === 'today'
                ? format(new Date(), 'MMM dd, yyyy')
                : filterType === 'week'
                ? `Week: ${format(startOfWeek(new Date()), 'MMM dd')} - ${format(endOfWeek(new Date()), 'MMM dd, yyyy')}`
                : filterType === 'month'
                ? `Month: ${format(new Date(), 'MMMM yyyy')}`
                : 'All Time'}
            </p>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Recipe-wise Statistics
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Recipe
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Batches
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Cost
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Cost/Unit
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Object.values(recipeStats).map((stat: any, idx: number) => (
                  <tr key={idx}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {stat.recipeName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {stat.totalBatches}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ₹{stat.totalCost.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ₹{stat.avgCostPerUnit.toFixed(2)}
                    </td>
                  </tr>
                ))}
                {Object.keys(recipeStats).length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                      No production data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 print:shadow-none">
          <div className="hidden print:block mb-4 border-b pb-4">
            <h3 className="text-xl font-bold" style={{ color: '#dc2626' }}>
              RISHA FOODS AND BAKERY
            </h3>
            <p className="text-sm text-gray-600">Detailed Production Logs</p>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            All Production Logs with Cost Breakdown
          </h3>
          <div className="space-y-4">
            {filteredProductions.map((prod: any) => {
              const breakdown = typeof prod.costBreakdown === 'string'
                ? JSON.parse(prod.costBreakdown)
                : prod.costBreakdown
              return (
                <div key={prod.id} className="border border-gray-200 rounded-lg p-4 print:border print:mb-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-gray-800">
                        {prod.recipeName}
                      </p>
                      <p className="text-sm text-gray-600">
                        {new Date(prod.productionDate).toLocaleString()} -{' '}
                        {prod.batches} batch(es)
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">
                        ₹{prod.totalCost.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-600">
                        ₹{prod.costPerUnit.toFixed(2)} per unit
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      Cost Breakdown:
                    </p>
                    <ul className="list-disc list-inside text-sm text-gray-600">
                      {Array.isArray(breakdown) &&
                        breakdown.map((item: any, idx: number) => (
                          <li key={idx}>
                            {item.materialName}: {item.quantity} {item.unit} -{' '}
                            ₹{item.cost.toFixed(2)}
                          </li>
                        ))}
                    </ul>
                  </div>
                </div>
              )
            })}
            {filteredProductions.length === 0 && (
              <p className="text-center text-gray-500 py-8">
                No production logs found
              </p>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
