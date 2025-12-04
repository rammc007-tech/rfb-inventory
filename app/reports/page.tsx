'use client'

import { useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { Printer, Filter, Calendar, Search, RotateCcw, RefreshCw } from 'lucide-react'
import useSWR from 'swr'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function ReportsPage() {
  const { data: productions } = useSWR('/api/production', fastFetcher, fastSWRConfig)
  const { data: recipes } = useSWR('/api/recipes', fastFetcher, fastSWRConfig)
  const { data: settings, mutate: mutateSettings } = useSWR('/api/settings', fastFetcher, fastSWRConfig)
  const [filterType, setFilterType] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all')
  const [selectedDate, setSelectedDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<Set<string>>(new Set())
  const [recipeSearchTerm, setRecipeSearchTerm] = useState('')

  // Ensure productions is always an array
  const productionsArray = Array.isArray(productions) ? productions : []

  const filteredProductions = productionsArray.filter((p: any) => {
    const prodDate = new Date(p.productionDate)
    const now = new Date()
    
    // Date filtering
    if (filterType === 'custom' && selectedDate && endDate) {
      const start = new Date(selectedDate)
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      if (prodDate < start || prodDate > end) return false
    } else if (selectedDate && !endDate) {
      const selected = new Date(selectedDate)
      return prodDate.toDateString() === selected.toDateString()
    } else if (filterType === 'all') {
      // No date filter
    } else if (filterType === 'today') {
      if (prodDate.toDateString() !== now.toDateString()) return false
    } else if (filterType === 'week') {
      const weekStart = startOfWeek(now)
      if (prodDate < weekStart) return false
    } else if (filterType === 'month') {
      const monthStart = startOfMonth(now)
      if (prodDate < monthStart) return false
    }
    
    // Recipe filtering
    if (selectedRecipeIds.size > 0) {
      if (!selectedRecipeIds.has(p.recipeId)) return false
    }
    
    return true
  }) || []

  // Calculate statistics from counters (not from production data)
  // Use settings counters if available, otherwise calculate from productions
  const settingsData = settings && Array.isArray(settings) ? settings[0] : settings
  const totalProductions = settingsData?.totalProductionRuns !== undefined 
    ? settingsData.totalProductionRuns 
    : filteredProductions.length || 0
  const totalCost = settingsData?.totalProductionCost !== undefined
    ? settingsData.totalProductionCost
    : filteredProductions.reduce((sum: number, p: any) => sum + p.totalCost, 0) || 0
  const todayProductions = filteredProductions.filter(
    (p: any) =>
      new Date(p.productionDate).toDateString() === new Date().toDateString()
  ) || []
  const todayCost = settingsData?.todayProductionCost !== undefined
    ? settingsData.todayProductionCost
    : todayProductions.reduce((sum: number, p: any) => sum + p.totalCost, 0)

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

  // Ensure recipes is always an array
  const recipesArray = Array.isArray(recipes) ? recipes : []

  // Calculate average cost per unit for each recipe
  Object.keys(recipeStats).forEach((recipeId) => {
    const recipe = recipesArray.find((r: any) => r.id === recipeId)
    if (recipe) {
      const totalOutput = recipe.outputQty * recipeStats[recipeId].totalBatches
      recipeStats[recipeId].avgCostPerUnit =
        totalOutput > 0 ? recipeStats[recipeId].totalCost / totalOutput : 0
    }
  })

  const handlePrint = () => {
    window.print()
  }

  const handleReset = async (type: 'runs' | 'cost' | 'today') => {
    let message = ''
    if (type === 'runs') {
      message = 'Are you sure you want to reset Total Production Runs?'
    } else if (type === 'cost') {
      message = 'Are you sure you want to reset Total Production Cost?'
    } else {
      message = 'Are you sure you want to reset Today&apos;s Production Cost?'
    }

    if (confirm(message)) {
      try {
        const res = await fetch('/api/production/reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type }),
        })

        if (res.ok) {
          const result = await res.json()
          // Refresh settings to update counters
          mutateSettings()
          alert(result.message || 'Reset successful')
        } else {
          const error = await res.json()
          alert(error.error || 'Failed to reset')
        }
      } catch (error) {
        alert('Failed to reset')
      }
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Cost Reports</h2>
            <p className="text-sm text-gray-600 mt-1">
              Report Date: {format(new Date(), 'dd MMM yyyy, hh:mm a')}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              <Printer size={18} />
              Print Report
            </button>
          </div>
        </div>

        {/* Filter Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Filter size={20} />
            Filter Reports
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Filter Type</label>
              <select
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value as any)
                  setSelectedDate('')
                  setEndDate('')
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="custom">Custom Date Range</option>
              </select>
            </div>
            {filterType === 'custom' ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </>
            ) : filterType !== 'all' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            ) : null}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Recipe (Optional)</label>
            
            {/* Recipe Search */}
            <div className="mb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={recipeSearchTerm}
                  onChange={(e) => setRecipeSearchTerm(e.target.value)}
                  placeholder="Search recipes..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            {/* Filtered Recipe List */}
            <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50">
              <div className="space-y-2">
                {recipesArray
                  .filter((recipe: any) => 
                    recipe.name.toLowerCase().includes(recipeSearchTerm.toLowerCase())
                  )
                  .map((recipe: any) => {
                    const isSelected = selectedRecipeIds.has(recipe.id)
                    return (
                      <div
                        key={recipe.id}
                        onClick={() => {
                          const newSelected = new Set(selectedRecipeIds)
                          if (newSelected.has(recipe.id)) {
                            newSelected.delete(recipe.id)
                          } else {
                            newSelected.add(recipe.id)
                          }
                          setSelectedRecipeIds(newSelected)
                        }}
                        className={`p-3 rounded-lg border-2 transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-primary-50 border-primary-500 ring-2 ring-primary-200'
                            : 'bg-white border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                                isSelected
                                  ? 'bg-primary-600 border-primary-600'
                                  : 'border-gray-300'
                              }`}>
                                {isSelected && (
                                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                              <span className="font-medium text-gray-800">{recipe.name}</span>
                            </div>
                            {isSelected && recipe.unitWeight && (
                              <div className="mt-2 ml-6">
                                <p className="text-xs text-gray-600">
                                  Unit Weight: <span className="font-semibold">{recipe.unitWeight}g per piece</span>
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                {recipesArray.filter((recipe: any) => 
                  recipe.name.toLowerCase().includes(recipeSearchTerm.toLowerCase())
                ).length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No recipes found matching &quot;{recipeSearchTerm}&quot;
                  </p>
                )}
              </div>
            </div>

            {selectedRecipeIds.size > 0 && (
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  {selectedRecipeIds.size} recipe(s) selected
                </span>
                <button
                  onClick={() => {
                    setSelectedRecipeIds(new Set())
                  }}
                  className="text-sm text-red-600 hover:text-red-800 font-medium"
                >
                  Clear All
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Report Date Display */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm font-semibold text-blue-800">
            Report Period: {
              filterType === 'custom' && selectedDate && endDate
                ? `${new Date(selectedDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`
                : filterType === 'today'
                ? new Date().toLocaleDateString()
                : filterType === 'week'
                ? `Week of ${startOfWeek(new Date()).toLocaleDateString()}`
                : filterType === 'month'
                ? `Month of ${startOfMonth(new Date()).toLocaleDateString()}`
                : 'All Time'
            }
          </p>
          {selectedRecipeIds.size > 0 && (
            <div className="mt-1 space-y-1">
              <p className="text-sm font-semibold text-blue-800">Filtered Recipes:</p>
              {Array.from(selectedRecipeIds).map(id => {
                const recipe = recipesArray.find((r: any) => r.id === id)
                return (
                  <p key={id} className="text-sm text-blue-700">
                    • {recipe?.name}
                    {recipe?.unitWeight && ` (${recipe.unitWeight}g per piece)`}
                  </p>
                )
              })}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-6 relative">
            <button
              onClick={(e) => {
                e.preventDefault()
                handleReset('runs')
              }}
              className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700"
              title="Reset Total Production Runs"
            >
              <RefreshCw size={16} />
            </button>
            <p className="text-sm text-gray-600">Total Production Runs</p>
            <p className="text-3xl font-bold text-gray-800 mt-2">
              {totalProductions}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 relative">
            <button
              onClick={(e) => {
                e.preventDefault()
                handleReset('cost')
              }}
              className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700"
              title="Reset Total Production Cost"
            >
              <RefreshCw size={16} />
            </button>
            <p className="text-sm text-gray-600">Total Production Cost</p>
            <p className="text-3xl font-bold text-green-600 mt-2">
              ₹{totalCost.toFixed(2)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 relative">
            <button
              onClick={(e) => {
                e.preventDefault()
                handleReset('today')
              }}
              className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700"
              title="Reset Today's Production Cost"
            >
              <RefreshCw size={16} />
            </button>
            <p className="text-sm text-gray-600">Today&apos;s Production Cost</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">
              ₹{todayCost.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 print:shadow-none print:p-4">
          {/* Print Header for Recipe Statistics */}
          <div className="hidden print:block mb-4 border-b-2 border-gray-800 pb-3">
            <p className="text-center text-sm font-semibold text-gray-700 mt-1">
              Recipe-wise Production Statistics
            </p>
            <p className="text-center text-xs text-gray-600 mt-1">
              Report Date: {format(new Date(), 'dd MMM yyyy, hh:mm a')}
              {filterType === 'custom' && selectedDate && endDate && (
                <span> | Period: {format(new Date(selectedDate), 'dd MMM yyyy')} - {format(new Date(endDate), 'dd MMM yyyy')}</span>
              )}
              {filterType === 'today' && (
                <span> | Period: Today ({format(new Date(), 'dd MMM yyyy')})</span>
              )}
              {filterType === 'week' && (
                <span> | Period: Week of {format(startOfWeek(new Date()), 'dd MMM yyyy')}</span>
              )}
              {filterType === 'month' && (
                <span> | Period: {format(startOfMonth(new Date()), 'MMMM yyyy')}</span>
              )}
            </p>
          </div>
          
          <h3 className="text-lg font-semibold text-gray-800 mb-4 no-print">
            Recipe-wise Statistics
          </h3>
          
          <div className="overflow-x-auto print:overflow-visible">
            <table className="min-w-full divide-y divide-gray-200 print:border-2 print:border-gray-800 print:border-collapse">
              <thead className="bg-gray-50 print:bg-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:border print:border-gray-800 print:px-3 print:py-2 print:text-xs print:font-bold print:text-black">
                    S.No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:border print:border-gray-800 print:px-3 print:py-2 print:text-xs print:font-bold print:text-black">
                    Recipe Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:border print:border-gray-800 print:px-3 print:py-2 print:text-xs print:font-bold print:text-black">
                    Unit Weight
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider print:border print:border-gray-800 print:px-3 print:py-2 print:text-xs print:font-bold print:text-black">
                    Total Batches
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider print:border print:border-gray-800 print:px-3 print:py-2 print:text-xs print:font-bold print:text-black">
                    Total Cost
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider print:border print:border-gray-800 print:px-3 print:py-2 print:text-xs print:font-bold print:text-black">
                    Avg Cost/Unit
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider print:border print:border-gray-800 print:px-3 print:py-2 print:text-xs print:font-bold print:text-black">
                    Cost per Gram
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 print:divide-none">
                {Object.values(recipeStats).map((stat: any, idx: number) => {
                  const recipeId = Object.keys(recipeStats).find(id => recipeStats[id].recipeName === stat.recipeName)
                  const recipe = recipesArray.find((r: any) => r.id === recipeId)
                  const unitWeight = recipe?.unitWeight
                  const totalWeight = unitWeight && recipe 
                    ? Math.round(stat.totalBatches * recipe.outputQty * parseFloat(unitWeight) / 1000)
                    : null
                  const costPerGram = unitWeight 
                    ? (stat.avgCostPerUnit / (parseFloat(unitWeight) / 1000))
                    : null
                  
                  return (
                    <tr key={idx} className="hover:bg-gray-50 print:hover:bg-white print:border-b print:border-gray-800">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 print:border print:border-gray-800 print:px-3 print:py-2 print:text-xs print:text-center print:font-semibold">
                        {idx + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap print:border print:border-gray-800 print:px-3 print:py-2">
                        <div>
                          <div className="text-sm font-medium text-gray-900 print:text-xs print:font-bold">
                            {stat.recipeName}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 print:border print:border-gray-800 print:px-3 print:py-2 print:text-xs print:text-center">
                        {unitWeight ? `${unitWeight}g` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 print:border print:border-gray-800 print:px-3 print:py-2 print:text-xs print:text-center">
                        <div>
                          <div className="font-semibold print:font-bold">{stat.totalBatches}</div>
                          {totalWeight && (
                            <div className="text-xs text-gray-400 print:text-xs print:text-gray-600 print:mt-0.5">
                              ({totalWeight}g total)
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 print:border print:border-gray-800 print:px-3 print:py-2 print:text-xs print:text-right print:font-semibold">
                        ₹{stat.totalCost.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 print:border print:border-gray-800 print:px-3 print:py-2 print:text-xs print:text-right">
                        <div>
                          <div className="font-semibold print:font-bold">₹{stat.avgCostPerUnit.toFixed(2)}</div>
                          <div className="text-xs text-gray-400 print:text-xs print:text-gray-600 print:mt-0.5">
                            per unit
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 print:border print:border-gray-800 print:px-3 print:py-2 print:text-xs print:text-right">
                        {costPerGram ? (
                          <div>
                            <div className="font-semibold print:font-bold">₹{costPerGram.toFixed(2)}</div>
                            <div className="text-xs text-gray-400 print:text-xs print:text-gray-600 print:mt-0.5">
                              per gram
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {Object.keys(recipeStats).length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500 print:border print:border-gray-800 print:px-3 print:py-4 print:font-semibold">
                      No production data available
                    </td>
                  </tr>
                )}
                {/* Summary Row */}
                {Object.keys(recipeStats).length > 0 && (
                  <tr className="bg-gray-100 print:bg-gray-200 print:border-t-2 print:border-gray-800">
                    <td className="px-6 py-4 text-sm font-bold text-gray-900 print:border print:border-gray-800 print:px-3 print:py-2 print:text-xs print:text-center">
                      {/* S.No - empty for total row */}
                    </td>
                    <td colSpan={2} className="px-6 py-4 text-sm font-bold text-gray-900 print:border print:border-gray-800 print:px-3 print:py-2 print:text-xs print:text-right">
                      TOTAL:
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900 print:border print:border-gray-800 print:px-3 print:py-2 print:text-xs print:text-center">
                      {Object.values(recipeStats).reduce((sum: number, stat: any) => sum + stat.totalBatches, 0)}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-green-600 print:text-black print:border print:border-gray-800 print:px-3 print:py-2 print:text-xs print:text-right">
                      ₹{totalCost.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900 print:border print:border-gray-800 print:px-3 print:py-2 print:text-xs print:text-right">
                      {/* Avg Cost/Unit - empty for total row */}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900 print:border print:border-gray-800 print:px-3 print:py-2 print:text-xs print:text-right">
                      {/* Cost per Gram - empty for total row */}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Print Footer */}
          {Object.keys(recipeStats).length > 0 && (
            <div className="hidden print:block mt-4 pt-3 border-t-2 border-gray-800">
              <div className="flex justify-between text-xs">
                <div>
                  <p className="font-semibold">Total Recipes: {Object.keys(recipeStats).length}</p>
                  <p className="font-semibold">Total Batches: {Object.values(recipeStats).reduce((sum: number, stat: any) => sum + stat.totalBatches, 0)}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">Total Cost: ₹{totalCost.toFixed(2)}</p>
                  <p className="text-xs text-gray-600 mt-1">Generated on: {format(new Date(), 'dd MMM yyyy, hh:mm a')}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Group productions by recipe for SOP-style display */}
        {Object.keys(recipeStats).length > 0 && Object.keys(recipeStats).map((recipeId: string, recipeIndex: number) => {
          const recipeStat = recipeStats[recipeId]
          const recipe = recipesArray.find((r: any) => r.id === recipeId)
          const recipeProductions = filteredProductions.filter((p: any) => p.recipeId === recipeId)
          
          if (recipeProductions.length === 0) return null
          
          return (
            <div key={recipeId} className="bg-white rounded-lg shadow p-6 print:shadow-none print:p-4 print:mb-6 print:break-after-page" style={{ pageBreakAfter: 'always' }}>
              {/* SOP-Style Print Header for Each Recipe */}
              <div className="hidden print:block mb-6 border-b-2 border-gray-800 pb-4">
                <div className="text-center mb-4">
                  <p className="text-lg font-semibold text-gray-800 mb-1">
                    STANDARD OPERATING PROCEDURE (SOP)
                  </p>
                  <p className="text-base font-semibold text-gray-700 mb-2">
                    Production Log & Cost Breakdown Report
                  </p>
                  <p className="text-sm font-bold text-gray-800 border-t border-b border-gray-800 py-2 inline-block px-4">
                    Recipe: {recipeStat.recipeName}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs mt-4">
                  <div>
                    <p><span className="font-semibold">Report Date:</span> {format(new Date(), 'dd MMM yyyy, hh:mm a')}</p>
                    {filterType === 'custom' && selectedDate && endDate && (
                      <p><span className="font-semibold">Period:</span> {format(new Date(selectedDate), 'dd MMM yyyy')} - {format(new Date(endDate), 'dd MMM yyyy')}</p>
                    )}
                    {filterType === 'today' && (
                      <p><span className="font-semibold">Period:</span> Today ({format(new Date(), 'dd MMM yyyy')})</p>
                    )}
                    {filterType === 'week' && (
                      <p><span className="font-semibold">Period:</span> Week of {format(startOfWeek(new Date()), 'dd MMM yyyy')}</p>
                    )}
                    {filterType === 'month' && (
                      <p><span className="font-semibold">Period:</span> {format(startOfMonth(new Date()), 'MMMM yyyy')}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p><span className="font-semibold">Total Batches:</span> {recipeStat.totalBatches}</p>
                    <p><span className="font-semibold">Total Cost:</span> ₹{recipeStat.totalCost.toFixed(2)}</p>
                    <p><span className="font-semibold">Avg Cost/Unit:</span> ₹{recipeStat.avgCostPerUnit.toFixed(2)}</p>
                    {recipe?.unitWeight && (
                      <p><span className="font-semibold">Unit Weight:</span> {recipe.unitWeight}g per piece</p>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Screen View Header */}
              <div className="no-print mb-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  {recipeStat.recipeName} - Production Logs with Cost Breakdown
                </h3>
                <div className="flex gap-4 text-sm text-gray-600">
                  <span>Total Batches: <strong>{recipeStat.totalBatches}</strong></span>
                  <span>Total Cost: <strong>₹{recipeStat.totalCost.toFixed(2)}</strong></span>
                  <span>Avg Cost/Unit: <strong>₹{recipeStat.avgCostPerUnit.toFixed(2)}</strong></span>
                </div>
              </div>
              
              <div className="space-y-4 print:space-y-4">
                {recipeProductions.map((prod: any, index: number) => {
                  const breakdown = typeof prod.costBreakdown === 'string'
                    ? JSON.parse(prod.costBreakdown)
                    : prod.costBreakdown || {}
                  
                  // Calculate additional costs
                  const utilityCost = prod.utilityCost || 0
                  const staffSalary = prod.staffSalary || 0
                  const additionalCost = prod.additionalCost || 0
                  const baseCost = prod.baseRecipeCost || prod.totalCost - utilityCost - staffSalary - additionalCost
                  
                  return (
                <div 
                  key={prod.id} 
                  className="border border-gray-200 rounded-lg p-4 print:border-2 print:border-gray-800 print:rounded-none print:mb-3 print:break-inside-avoid print:page-break-inside-avoid"
                  style={{ pageBreakInside: 'avoid' }}
                >
                  {/* Production Header - SOP Style */}
                  <div className="flex justify-between items-start mb-4 print:mb-3 print:border-b-2 print:border-gray-800 print:pb-3">
                    <div className="flex-1">
                      <p className="font-bold text-gray-800 print:text-lg print:font-bold print:mb-2">
                        Production Log #{index + 1}
                        {prod.variantName && (
                          <span className="text-sm text-gray-600 print:text-sm print:font-normal"> - Variant: {prod.variantName}</span>
                        )}
                      </p>
                      <div className="mt-2 print:mt-1 space-y-1">
                        <p className="text-sm text-gray-600 print:text-sm print:font-semibold">
                          Production Date: {format(new Date(prod.productionDate), 'dd MMM yyyy, hh:mm a')}
                        </p>
                        <p className="text-sm text-gray-600 print:text-sm">
                          Batches Produced: <strong>{prod.batches}</strong> | Cost per Unit: <strong>₹{prod.costPerUnit.toFixed(2)}</strong>
                        </p>
                      </div>
                    </div>
                    <div className="text-right ml-4 print:ml-4 print:border-l-2 print:border-gray-800 print:pl-4">
                      <p className="text-xs text-gray-500 print:text-xs print:mb-1">Total Production Cost</p>
                      <p className="text-xl font-bold text-green-600 print:text-2xl print:font-bold print:text-black">
                        ₹{prod.totalCost.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  
                  {/* Cost Breakdown Table */}
                  <div className="mt-3 print:mt-2">
                    <p className="text-sm font-semibold text-gray-700 mb-2 print:text-xs print:font-bold print:mb-1 print:border-b print:border-gray-300 print:pb-1">
                      Cost Breakdown:
                    </p>
                    
                    {/* Base Recipe Ingredients */}
                    {Array.isArray(breakdown) && breakdown.length > 0 && (
                      <div className="mb-2 print:mb-1">
                        <p className="text-xs font-semibold text-gray-600 print:text-xs print:font-bold mb-1">
                          Ingredients:
                        </p>
                        <table className="w-full text-xs print:text-xs border-collapse">
                          <thead>
                            <tr className="bg-gray-50 print:bg-gray-100">
                              <th className="border border-gray-300 px-2 py-1 text-left print:border-gray-800 print:font-bold">Material</th>
                              <th className="border border-gray-300 px-2 py-1 text-right print:border-gray-800 print:font-bold">Quantity</th>
                              <th className="border border-gray-300 px-2 py-1 text-right print:border-gray-800 print:font-bold">Cost</th>
                            </tr>
                          </thead>
                          <tbody>
                            {breakdown.map((item: any, idx: number) => (
                              <tr key={idx} className="print:border-b print:border-gray-300">
                                <td className="border border-gray-300 px-2 py-1 print:border-gray-800">{item.materialName || item.name}</td>
                                <td className="border border-gray-300 px-2 py-1 text-right print:border-gray-800">
                                  {item.quantity} {item.unit}
                                </td>
                                <td className="border border-gray-300 px-2 py-1 text-right print:border-gray-800 font-semibold">
                                  ₹{item.cost.toFixed(2)}
                                </td>
                              </tr>
                            ))}
                            <tr className="bg-gray-50 print:bg-gray-100 font-bold">
                              <td colSpan={2} className="border border-gray-300 px-2 py-1 text-right print:border-gray-800">
                                Subtotal (Ingredients):
                              </td>
                              <td className="border border-gray-300 px-2 py-1 text-right print:border-gray-800">
                                ₹{baseCost.toFixed(2)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                    
                    {/* Additional Costs */}
                    {(utilityCost > 0 || staffSalary > 0 || additionalCost > 0) && (
                      <div className="mt-2 print:mt-1">
                        <p className="text-xs font-semibold text-gray-600 print:text-xs print:font-bold mb-1">
                          Additional Costs:
                        </p>
                        <table className="w-full text-xs print:text-xs border-collapse">
                          <tbody>
                            {utilityCost > 0 && (
                              <tr className="print:border-b print:border-gray-300">
                                <td className="border border-gray-300 px-2 py-1 print:border-gray-800">Utility Cost</td>
                                <td className="border border-gray-300 px-2 py-1 text-right print:border-gray-800 font-semibold">
                                  ₹{utilityCost.toFixed(2)}
                                </td>
                              </tr>
                            )}
                            {staffSalary > 0 && (
                              <tr className="print:border-b print:border-gray-300">
                                <td className="border border-gray-300 px-2 py-1 print:border-gray-800">Staff Salary</td>
                                <td className="border border-gray-300 px-2 py-1 text-right print:border-gray-800 font-semibold">
                                  ₹{staffSalary.toFixed(2)}
                                </td>
                              </tr>
                            )}
                            {additionalCost > 0 && (
                              <tr className="print:border-b print:border-gray-300">
                                <td className="border border-gray-300 px-2 py-1 print:border-gray-800">Additional Cost</td>
                                <td className="border border-gray-300 px-2 py-1 text-right print:border-gray-800 font-semibold">
                                  ₹{additionalCost.toFixed(2)}
                                </td>
                              </tr>
                            )}
                            <tr className="bg-gray-50 print:bg-gray-100 font-bold">
                              <td className="border border-gray-300 px-2 py-1 text-right print:border-gray-800">
                                Total Cost:
                              </td>
                              <td className="border border-gray-300 px-2 py-1 text-right print:border-gray-800">
                                ₹{prod.totalCost.toFixed(2)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
                {recipeProductions.length === 0 && (
                  <div className="text-center text-gray-500 py-8 print:py-4">
                    <p className="print:text-sm print:font-semibold">No production logs found for {recipeStat.recipeName}</p>
                  </div>
                )}
              </div>
              
              {/* SOP-Style Print Footer for Each Recipe */}
              {recipeProductions.length > 0 && (
                <div className="hidden print:block mt-8 pt-6 border-t-2 border-gray-800">
                  <div className="grid grid-cols-2 gap-6 text-sm">
                    <div>
                      <p className="font-bold mb-2 text-base">Summary for {recipeStat.recipeName}:</p>
                      <p className="mb-1"><span className="font-semibold">Total Production Logs:</span> {recipeProductions.length}</p>
                      <p className="mb-1"><span className="font-semibold">Total Batches:</span> {recipeStat.totalBatches}</p>
                      <p className="mb-1"><span className="font-semibold">Total Cost:</span> ₹{recipeStat.totalCost.toFixed(2)}</p>
                      <p className="mb-1"><span className="font-semibold">Average Cost per Unit:</span> ₹{recipeStat.avgCostPerUnit.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold mb-2 text-base">Document Information:</p>
                      <p className="mb-1">Generated on: {format(new Date(), 'dd MMM yyyy, hh:mm a')}</p>
                      <p className="mb-1">Report Period: {
                        filterType === 'custom' && selectedDate && endDate
                          ? `${format(new Date(selectedDate), 'dd MMM yyyy')} - ${format(new Date(endDate), 'dd MMM yyyy')}`
                          : filterType === 'today'
                          ? `Today (${format(new Date(), 'dd MMM yyyy')})`
                          : filterType === 'week'
                          ? `Week of ${format(startOfWeek(new Date()), 'dd MMM yyyy')}`
                          : filterType === 'month'
                          ? format(startOfMonth(new Date()), 'MMMM yyyy')
                          : 'All Time'
                      }</p>
                      <p className="text-xs text-gray-500 mt-1">SOP Document - Recipe Production Log</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
        
        {/* Fallback if no recipes */}
        {Object.keys(recipeStats).length === 0 && (
          <div className="bg-white rounded-lg shadow p-6 print:shadow-none print:p-4">
            <div className="text-center text-gray-500 py-8 print:py-4">
              <p className="print:text-sm print:font-semibold">No production logs found for the selected period</p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
