'use client'

import { useState, useEffect, Suspense } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { Factory, Plus, X, Printer, Filter, Calendar, BarChart3, ChevronDown, ChevronUp, CheckSquare, Square, Search } from 'lucide-react'
import useSWR from 'swr'
import { useSearchParams } from 'next/navigation'
import { startOfWeek, startOfMonth, endOfWeek, endOfMonth, format } from 'date-fns'
import { fastFetcher, fastSWRConfig } from '@/lib/fast-fetcher'

// Interactive Production Chart Component
function ProductionChartComponent({ items }: { items: any[] }) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [viewMode, setViewMode] = useState<'cost' | 'batches'>('cost')
  const [maxItems, setMaxItems] = useState(10)

  const sortedItems = [...items].sort((a, b) => {
    if (viewMode === 'cost') return b.totalCost - a.totalCost
    return b.batches - a.batches
  }).slice(0, maxItems)

  const maxValue = sortedItems[0] ? 
    (viewMode === 'cost' ? sortedItems[0].totalCost : sortedItems[0].batches) : 1

  if (!isExpanded) {
    return (
      <div className="bg-white rounded-lg shadow p-4 no-print">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary-600" />
            <h3 className="text-lg font-semibold text-gray-800">Production Analytics</h3>
            <span className="text-sm text-gray-500">({items.length} items)</span>
          </div>
          <button
            onClick={() => setIsExpanded(true)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronDown size={20} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 no-print">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-primary-600" />
          <h3 className="text-lg font-semibold text-gray-800">Production Analytics</h3>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as any)}
            className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
          >
            <option value="cost">By Cost</option>
            <option value="batches">By Batches</option>
          </select>
          <select
            value={maxItems}
            onChange={(e) => setMaxItems(Number(e.target.value))}
            className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
          >
            <option value={5}>Top 5</option>
            <option value={10}>Top 10</option>
            <option value={20}>Top 20</option>
            <option value={items.length}>All</option>
          </select>
          <button
            onClick={() => setIsExpanded(false)}
            className="p-2 hover:bg-gray-100 rounded-lg"
            title="Collapse"
          >
            <ChevronUp size={20} />
          </button>
        </div>
      </div>
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {sortedItems.map((item, idx) => {
          const value = viewMode === 'cost' ? item.totalCost : item.batches
          const percentage = (value / maxValue) * 100
          const displayValue = viewMode === 'cost' ? `₹${value.toFixed(2)}` : `${value} batch${value > 1 ? 'es' : ''}`
          return (
            <div key={idx} className="space-y-1 p-2 hover:bg-gray-50 rounded-lg transition-colors">
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium text-gray-700">{item.name}</span>
                <span className="text-gray-600 font-semibold">{displayValue}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-6 relative">
                <div
                  className={`h-6 rounded-full transition-all ${
                    viewMode === 'cost' ? 'bg-green-600' : 'bg-blue-600'
                  }`}
                  style={{ width: `${percentage}%` }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-gray-700">
                  {percentage.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Batches: {item.batches}</span>
                <span>Total Cost: ₹{item.totalCost.toFixed(2)}</span>
                <span>Per Batch: ₹{(item.totalCost / item.batches).toFixed(2)}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface VariantIngredient {
  rawMaterialId: string
  quantity: string
  unit: string
}

interface ProductionVariant {
  variantName: string
  ingredients: VariantIngredient[]
  cost?: number
}

function ProductionPageContent() {
  const searchParams = useSearchParams()
  const recipeIdParam = searchParams.get('recipe')
  const { data: recipes } = useSWR('/api/recipes', fastFetcher, fastSWRConfig)
  const { data: materialsData } = useSWR('/api/raw-materials', fastFetcher, fastSWRConfig)
  const materials = Array.isArray(materialsData) ? materialsData : []
  const { data: productions, mutate } = useSWR('/api/production', fastFetcher, fastSWRConfig)

  const [selectedRecipeId, setSelectedRecipeId] = useState(recipeIdParam || '')
  const [batches, setBatches] = useState(1)
  const [costCalculation, setCostCalculation] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [utilityCost, setUtilityCost] = useState('')
  const [staffSalary, setStaffSalary] = useState('')
  const [showVariants, setShowVariants] = useState(false)
  const [variants, setVariants] = useState<ProductionVariant[]>([
    { variantName: '', ingredients: [{ rawMaterialId: '', quantity: '', unit: 'kg' }] },
  ])
  const [variantCosts, setVariantCosts] = useState<Record<string, any>>({})
  const [filterType, setFilterType] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all')
  const [selectedDate, setSelectedDate] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<Set<string>>(new Set())
  const [recipeSearchTerm, setRecipeSearchTerm] = useState('')

  const handlePrintSelectedRecipes = () => {
    if (selectedRecipeIds.size === 0) {
      alert('Please select at least one recipe to print')
      return
    }

    // Group productions by recipe
    const recipeGroups: Record<string, any[]> = {}
    filteredProductions.forEach((p: any) => {
      if (selectedRecipeIds.has(p.recipeId)) {
        if (!recipeGroups[p.recipeId]) {
          recipeGroups[p.recipeId] = []
        }
        recipeGroups[p.recipeId].push(p)
      }
    })

    // Print recipe-wise
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    let printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Recipe-wise Production Logs - RISHA FOODS AND BAKERY</title>
          <style>
            @page { margin: 1cm; }
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #000; padding-bottom: 20px; }
            .shop-name { font-size: 28px; font-weight: bold; color: #dc2626; margin-bottom: 10px; }
            .report-title { font-size: 20px; font-weight: bold; margin-bottom: 10px; }
            .report-info { font-size: 12px; color: #666; margin-top: 10px; }
            .recipe-section { page-break-after: always; margin-bottom: 40px; }
            .recipe-section:last-child { page-break-after: auto; }
            .recipe-header { background-color: #f3f4f6; padding: 15px; border: 2px solid #000; margin-bottom: 15px; }
            .recipe-name { font-size: 18px; font-weight: bold; color: #dc2626; margin-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #f3f4f6; border: 2px solid #000; padding: 12px; text-align: left; font-weight: bold; font-size: 12px; }
            td { border: 1px solid #000; padding: 10px; font-size: 12px; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 2px solid #000; font-size: 11px; }
            .summary { display: flex; justify-content: space-between; margin-top: 20px; }
            .summary-item { font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="report-title">Recipe-wise Production Logs Report</div>
            <div class="report-info">
              Report Date: ${format(new Date(), 'dd MMM yyyy, hh:mm a')}<br>
              Period: ${
                filterType === 'all' ? 'All Time' :
                filterType === 'today' ? `Today (${format(new Date(), 'dd MMM yyyy')})` :
                filterType === 'week' ? `Week of ${format(startOfWeek(new Date()), 'dd MMM yyyy')}` :
                filterType === 'month' ? format(startOfMonth(new Date()), 'MMMM yyyy') :
                filterType === 'custom' && startDate && endDate ? 
                  `${format(new Date(startDate), 'dd MMM yyyy')} - ${format(new Date(endDate), 'dd MMM yyyy')}` :
                'Custom Period'
              }<br>
              Selected Recipes: ${selectedRecipeIds.size}
            </div>
          </div>
    `

    // Generate recipe-wise sections
    Object.keys(recipeGroups).forEach((recipeId, recipeIdx) => {
      const recipeProductions = recipeGroups[recipeId]
      const recipeName = recipeProductions[0]?.recipeName || 'Unknown Recipe'
      const totalBatches = recipeProductions.reduce((sum: number, p: any) => sum + (p.batches || 0), 0)
      const totalCost = recipeProductions.reduce((sum: number, p: any) => sum + (p.totalCost || 0), 0)
      
      printContent += `
        <div class="recipe-section">
          <div class="recipe-header">
            <div class="recipe-name">${recipeName}</div>
            <div style="font-size: 12px; color: #666;">
              Total Logs: ${recipeProductions.length} | Total Batches: ${totalBatches} | Total Cost: ₹${totalCost.toFixed(2)}
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>S.No</th>
                <th>Date & Time</th>
                <th>Variant</th>
                <th>Batches</th>
                <th>Total Cost</th>
                <th>Cost/Unit</th>
              </tr>
            </thead>
            <tbody>
              ${recipeProductions.map((p: any, idx: number) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td>${format(new Date(p.productionDate), 'dd MMM yyyy, hh:mm a')}</td>
                  <td>${p.variantName || '-'}</td>
                  <td>${p.batches || 0}</td>
                  <td>₹${p.totalCost?.toFixed(2) || '0.00'}</td>
                  <td>₹${p.costPerUnit?.toFixed(2) || '0.00'}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr style="background-color: #f3f4f6; font-weight: bold;">
                <td colspan="3">Total for ${recipeName}</td>
                <td>${totalBatches}</td>
                <td>₹${totalCost.toFixed(2)}</td>
                <td>₹${(totalCost / (totalBatches * (recipeProductions[0]?.recipe?.outputQty || 1))).toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      `
    })

    const allSelectedProductions = filteredProductions.filter((p: any) => selectedRecipeIds.has(p.recipeId))
    const grandTotalBatches = allSelectedProductions.reduce((sum: number, p: any) => sum + (p.batches || 0), 0)
    const grandTotalCost = allSelectedProductions.reduce((sum: number, p: any) => sum + (p.totalCost || 0), 0)

    printContent += `
          <div class="footer">
            <div class="summary">
              <div class="summary-item">
                <p>Total Recipes: ${selectedRecipeIds.size}</p>
                <p>Total Production Logs: ${allSelectedProductions.length}</p>
                <p>Total Batches: ${grandTotalBatches}</p>
                <p>Grand Total Cost: ₹${grandTotalCost.toFixed(2)}</p>
              </div>
              <div>
                <p>Generated on: ${format(new Date(), 'dd MMM yyyy, hh:mm a')}</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `

    printWindow.document.write(printContent)
    printWindow.document.close()
    setTimeout(() => {
      printWindow.print()
    }, 250)
  }

  useEffect(() => {
    if (recipeIdParam) {
      setSelectedRecipeId(recipeIdParam)
    }
  }, [recipeIdParam])

  const calculateCost = async () => {
    if (!selectedRecipeId || batches < 1) {
      alert('Please select a recipe and enter number of batches')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/production/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipeId: selectedRecipeId, batches }),
      })

      if (res.ok) {
        const data = await res.json()
        setCostCalculation(data)
        setShowVariants(true)
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to calculate cost')
        setCostCalculation(null)
      }
    } catch (error) {
      alert('Failed to calculate cost')
      setCostCalculation(null)
    } finally {
      setLoading(false)
    }
  }

  const addVariant = () => {
    setVariants([
      ...variants,
      { variantName: '', ingredients: [{ rawMaterialId: '', quantity: '', unit: 'kg' }] },
    ])
  }

  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index))
    const newCosts = { ...variantCosts }
    delete newCosts[index.toString()]
    setVariantCosts(newCosts)
  }

  const addVariantIngredient = (variantIndex: number) => {
    const updated = [...variants]
    updated[variantIndex].ingredients.push({
      rawMaterialId: '',
      quantity: '',
      unit: 'kg',
    })
    setVariants(updated)
  }

  const removeVariantIngredient = (variantIndex: number, ingIndex: number) => {
    const updated = [...variants]
    updated[variantIndex].ingredients = updated[variantIndex].ingredients.filter(
      (_, i) => i !== ingIndex
    )
    setVariants(updated)
  }

  const updateVariantIngredient = (
    variantIndex: number,
    ingIndex: number,
    field: keyof VariantIngredient,
    value: string
  ) => {
    const updated = [...variants]
    updated[variantIndex].ingredients[ingIndex] = {
      ...updated[variantIndex].ingredients[ingIndex],
      [field]: value,
    }
    setVariants(updated)
  }

  const updateVariantName = (variantIndex: number, name: string) => {
    const updated = [...variants]
    updated[variantIndex].variantName = name
    setVariants(updated)
  }

  const calculateVariantCost = async (variantIndex: number) => {
    const variant = variants[variantIndex]
    if (!variant.variantName || !costCalculation?.canProduce) {
      alert('Please enter variant name and ensure base recipe cost is calculated')
      return
    }

    const validIngredients = variant.ingredients
      .filter((ing) => ing.rawMaterialId && ing.quantity)
      .map((ing) => ({
        rawMaterialId: ing.rawMaterialId,
        rawMaterialName:
          materials?.find((m: any) => m.id === ing.rawMaterialId)?.name || '',
        quantity: parseFloat(ing.quantity),
        unit: ing.unit,
      }))

    if (validIngredients.length === 0) {
      alert('Please add at least one additional ingredient')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/production/calculate-variant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseRecipeId: selectedRecipeId,
          baseBatches: batches,
          variantName: variant.variantName,
          additionalIngredients: validIngredients,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setVariantCosts({
          ...variantCosts,
          [variantIndex.toString()]: data,
        })
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to calculate variant cost')
      }
    } catch (error) {
      alert('Failed to calculate variant cost')
    } finally {
      setLoading(false)
    }
  }

  const handleProduce = async (variantIndex?: number) => {
    if (!selectedRecipeId || batches < 1) {
      alert('Please select a recipe and enter number of batches')
      return
    }

    if (!costCalculation?.canProduce) {
      alert('Cannot produce: Insufficient stock')
      return
    }

    const isVariant = variantIndex !== undefined
    const variant = isVariant ? variants[variantIndex] : null
    const variantCost = isVariant ? variantCosts[variantIndex.toString()] : null

    if (
      !confirm(
        isVariant
          ? `Produce ${batches} batch(es) of ${variant?.variantName}? This will deduct stock from inventory.`
          : `Produce ${batches} batch(es) of ${recipes?.find((r: any) => r.id === selectedRecipeId)?.name}? This will deduct stock from inventory.`
      )
    ) {
      return
    }

    const utility = parseFloat(utilityCost) || 0
    const staff = parseFloat(staffSalary) || 0
    
    setLoading(true)
    try {
      const res = await fetch('/api/production', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipeId: selectedRecipeId,
          batches,
          variantName: variant?.variantName,
          baseRecipeCost: costCalculation.totalCost,
          additionalCost: variantCost?.additionalCost || 0,
          utilityCost: utility,
          staffSalary: staff,
          variantIngredients: isVariant
            ? JSON.stringify(variant?.ingredients.filter((ing) => ing.rawMaterialId && ing.quantity))
            : undefined,
        }),
      })

      if (res.ok) {
        mutate()
        if (!isVariant) {
          setCostCalculation(null)
          setBatches(1)
          setVariants([
            { variantName: '', ingredients: [{ rawMaterialId: '', quantity: '', unit: 'kg' }] },
          ])
          setVariantCosts({})
          setShowVariants(false)
        }
        alert(`Production logged successfully${isVariant ? ` for ${variant?.variantName}` : ''}!`)
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to produce')
      }
    } catch (error) {
      alert('Failed to produce')
    } finally {
      setLoading(false)
    }
  }

  const selectedRecipe = recipes?.find((r: any) => r.id === selectedRecipeId)

  const handlePrint = () => {
    window.print()
  }

  // Calculate production stats for chart
  const productionStats: Record<string, { name: string; batches: number; totalCost: number }> = {}
  if (Array.isArray(productions)) {
    productions.forEach((prod: any) => {
      const key = prod.variantName ? `${prod.recipeName} - ${prod.variantName}` : prod.recipeName
      if (!productionStats[key]) {
        productionStats[key] = {
          name: key,
          batches: 0,
          totalCost: 0,
        }
      }
      productionStats[key].batches += prod.batches || 0
      productionStats[key].totalCost += prod.totalCost || 0
    })
  }

  const topProductions = Object.values(productionStats)
    .sort((a, b) => b.totalCost - a.totalCost)
    .slice(0, 10)

  // Filter productions
  const filteredProductions = Array.isArray(productions) ? productions.filter((prod: any) => {
    const prodDate = new Date(prod.productionDate)
    const now = new Date()
    
    // Date filter
    let dateMatch = true
    if (filterType === 'all') {
      dateMatch = true
    } else if (filterType === 'today') {
      dateMatch = prodDate.toDateString() === now.toDateString()
    } else if (filterType === 'week') {
      const weekStart = startOfWeek(now)
      const weekEnd = endOfWeek(now)
      dateMatch = prodDate >= weekStart && prodDate <= weekEnd
    } else if (filterType === 'month') {
      const monthStart = startOfMonth(now)
      const monthEnd = endOfMonth(now)
      dateMatch = prodDate >= monthStart && prodDate <= monthEnd
    } else if (filterType === 'custom') {
      if (!startDate || !endDate) {
        dateMatch = true
      } else {
        const start = new Date(startDate)
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999) // Include entire end date
        dateMatch = prodDate >= start && prodDate <= end
      }
    } else if (selectedDate) {
      const selected = new Date(selectedDate)
      dateMatch = prodDate.toDateString() === selected.toDateString()
    }
    
    // Recipe search filter
    let recipeMatch = true
    if (recipeSearchTerm && recipeSearchTerm.trim()) {
      const searchLower = recipeSearchTerm.toLowerCase().trim()
      const recipeName = (prod.recipeName || '').toLowerCase()
      const variantName = (prod.variantName || '').toLowerCase()
      recipeMatch = recipeName.includes(searchLower) || variantName.includes(searchLower)
    }
    
    return dateMatch && recipeMatch
  }) : []

  return (
    <DashboardLayout>
      <div className="space-y-6 print:space-y-0">
        <div className="flex items-center justify-between no-print">
          <div className="flex items-center gap-3">
            <Factory className="w-8 h-8 text-primary-600" />
            <h2 className="text-2xl font-bold text-gray-800">Daily Production</h2>
          </div>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            <Printer size={18} />
            Print Daily Production
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6 print:shadow-none">
          <div className="hidden print:block text-center py-3 print:py-2 print:mb-2 border-b print:border-gray-300">
            <p className="text-sm text-gray-600 print:text-xs">Daily Production Report</p>
            <p className="text-xs text-gray-500 print:mt-1">
              Date: {new Date().toLocaleDateString()}
            </p>
          </div>
          <div className="space-y-4 no-print">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Base Recipe (e.g., 5kg Maida Dough)
              </label>
              <select
                value={selectedRecipeId}
                onChange={(e) => {
                  setSelectedRecipeId(e.target.value)
                  setCostCalculation(null)
                  setShowVariants(false)
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select Recipe</option>
                {recipes?.map((recipe: any) => (
                  <option key={recipe.id} value={recipe.id}>
                    {recipe.name} ({recipe.outputQty} {recipe.outputUnit})
                  </option>
                ))}
              </select>
            </div>

            {selectedRecipe && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-2">
                  Base Recipe: {selectedRecipe.name}
                </h3>
                <p className="text-sm text-gray-600">
                  Output: {selectedRecipe.outputQty} {selectedRecipe.outputUnit} per batch
                </p>
                <div className="mt-2">
                  <p className="text-sm font-medium text-gray-700">Base Ingredients:</p>
                  <ul className="list-disc list-inside text-sm text-gray-600 mt-1">
                    {selectedRecipe.ingredients.map((ing: any, idx: number) => (
                      <li key={idx}>
                        {ing.rawMaterialName}: {ing.quantity} {ing.unit}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Batches
                </label>
                <input
                  type="number"
                  min="1"
                  value={batches}
                  onChange={(e) => {
                    setBatches(parseInt(e.target.value) || 1)
                    setCostCalculation(null)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Utility Cost (₹)
                  <span className="text-xs text-gray-500 ml-1">(Optional)</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={utilityCost}
                  onChange={(e) => setUtilityCost(e.target.value)}
                  placeholder="e.g., 50"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Staff Salary (₹)
                  <span className="text-xs text-gray-500 ml-1">(Optional)</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={staffSalary}
                  onChange={(e) => setStaffSalary(e.target.value)}
                  placeholder="e.g., 200"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={calculateCost}
                disabled={loading || !selectedRecipeId}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Calculate Base Cost
              </button>
            </div>
          </div>
        </div>

        {costCalculation && (
          <div className="bg-white rounded-lg shadow-lg border-2 border-green-500 p-6">
            <div className="mb-4 pb-4 border-b">
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                💰 Base Recipe Cost Preview
              </h3>
              <p className="text-sm text-gray-600">
                Base recipe cost calculated. You can now add variants or produce directly.
              </p>
            </div>

            {!costCalculation.canProduce && costCalculation.missingMaterials && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="font-semibold text-red-800 mb-2">Insufficient Stock:</p>
                <ul className="list-disc list-inside text-sm text-red-700">
                  {costCalculation.missingMaterials.map((mat: any, idx: number) => (
                    <li key={idx}>
                      {mat.materialName}: Need {mat.required} {mat.unit}, Available{' '}
                      {mat.available} {mat.unit}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {costCalculation.canProduce && (
              <>
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Base Recipe:</p>
                      <p className="text-lg font-semibold text-gray-800">
                        {selectedRecipe?.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Batches:</p>
                      <p className="text-lg font-semibold text-gray-800">{batches}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Base Cost:</p>
                      <p className="text-lg font-semibold text-green-600">
                        ₹{costCalculation.totalCost.toFixed(2)}
                      </p>
                    </div>
                    {(parseFloat(utilityCost) > 0 || parseFloat(staffSalary) > 0) && (
                      <>
                        {parseFloat(utilityCost) > 0 && (
                          <div>
                            <p className="text-sm text-gray-600">Utility Cost:</p>
                            <p className="text-lg font-semibold text-blue-600">
                              ₹{parseFloat(utilityCost).toFixed(2)}
                            </p>
                          </div>
                        )}
                        {parseFloat(staffSalary) > 0 && (
                          <div>
                            <p className="text-sm text-gray-600">Staff Salary:</p>
                            <p className="text-lg font-semibold text-blue-600">
                              ₹{parseFloat(staffSalary).toFixed(2)}
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="text-sm text-gray-600">Total with Utilities:</p>
                          <p className="text-lg font-semibold text-green-600">
                            ₹
                            {(
                              costCalculation.totalCost +
                              (parseFloat(utilityCost) || 0) +
                              (parseFloat(staffSalary) || 0)
                            ).toFixed(2)}
                          </p>
                        </div>
                      </>
                    )}
                    <div>
                      <p className="text-sm text-gray-600">Cost per {selectedRecipe?.outputUnit}:</p>
                      <p className="text-lg font-semibold text-green-600">
                        ₹
                        {(
                          (costCalculation.totalCost +
                            (parseFloat(utilityCost) || 0) +
                            (parseFloat(staffSalary) || 0)) /
                          (selectedRecipe?.outputQty * batches)
                        ).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleProduce()}
                  disabled={loading}
                  className="w-full mb-4 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold"
                >
                  {loading ? 'Processing...' : 'Produce Base Recipe'}
                </button>
              </>
            )}
          </div>
        )}

        {showVariants && costCalculation?.canProduce && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Production Variants (e.g., Egg Puff, Chicken Puff, Veg Puff)
              </h3>
              <button
                onClick={addVariant}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus size={16} />
                Add Variant
              </button>
            </div>

            <div className="space-y-4">
              {variants.map((variant, variantIndex) => (
                <div
                  key={variantIndex}
                  className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Variant Name (e.g., Egg Puff, Chicken Puff)
                      </label>
                      <input
                        type="text"
                        value={variant.variantName}
                        onChange={(e) => updateVariantName(variantIndex, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        placeholder="e.g., Egg Puff"
                      />
                    </div>
                    {variants.length > 1 && (
                      <button
                        onClick={() => removeVariant(variantIndex)}
                        className="ml-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>

                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Additional Ingredients for this Variant:
                    </label>
                    {variant.ingredients.map((ing, ingIndex) => (
                      <div
                        key={ingIndex}
                        className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2"
                      >
                        <select
                          value={ing.rawMaterialId}
                          onChange={(e) =>
                            updateVariantIngredient(
                              variantIndex,
                              ingIndex,
                              'rawMaterialId',
                              e.target.value
                            )
                          }
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="">Select Material</option>
                          {materials?.map((mat: any) => (
                            <option key={mat.id} value={mat.id}>
                              {mat.name}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          step="0.01"
                          value={ing.quantity}
                          onChange={(e) =>
                            updateVariantIngredient(
                              variantIndex,
                              ingIndex,
                              'quantity',
                              e.target.value
                            )
                          }
                          placeholder="Quantity"
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        />
                        <select
                          value={ing.unit}
                          onChange={(e) =>
                            updateVariantIngredient(
                              variantIndex,
                              ingIndex,
                              'unit',
                              e.target.value
                            )
                          }
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="kg">kg</option>
                          <option value="g">g</option>
                          <option value="liter">liter</option>
                          <option value="ml">ml</option>
                          <option value="pieces">pieces</option>
                        </select>
                        {variant.ingredients.length > 1 && (
                          <button
                            onClick={() =>
                              removeVariantIngredient(variantIndex, ingIndex)
                            }
                            className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => addVariantIngredient(variantIndex)}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      + Add Ingredient
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => calculateVariantCost(variantIndex)}
                      disabled={loading || !variant.variantName}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300"
                    >
                      Calculate Variant Cost
                    </button>
                    {variantCosts[variantIndex.toString()] && (
                      <div className="flex-1 bg-green-50 border border-green-200 rounded-lg p-3">
                        <p className="text-sm font-semibold text-gray-800">
                          {variant.variantName} Cost Breakdown:
                        </p>
                        <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                          <div>
                            <span className="text-gray-600">Base Cost:</span>{' '}
                            <span className="font-semibold">
                              ₹{variantCosts[variantIndex.toString()].baseCost.toFixed(2)}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Additional:</span>{' '}
                            <span className="font-semibold">
                              ₹{variantCosts[variantIndex.toString()].additionalCost.toFixed(2)}
                            </span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-gray-600">Total Cost:</span>{' '}
                            <span className="font-semibold text-green-600 text-lg">
                              ₹{variantCosts[variantIndex.toString()].totalCost.toFixed(2)}
                            </span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-gray-600">Cost per Unit:</span>{' '}
                            <span className="font-semibold">
                              ₹{variantCosts[variantIndex.toString()].costPerUnit.toFixed(2)} /{' '}
                              {variantCosts[variantIndex.toString()].outputUnit}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleProduce(variantIndex)}
                          disabled={loading}
                          className="w-full mt-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300"
                        >
                          Produce {variant.variantName}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Production Chart - Interactive */}
        {topProductions.length > 0 && (
          <ProductionChartComponent items={topProductions} />
        )}

        <div className="bg-white rounded-lg shadow p-6 print:shadow-none">
          <div className="hidden print:block text-center py-3 print:py-2 print:mb-2 border-b print:border-gray-300">
            <p className="text-sm text-gray-600 print:text-xs">Daily Production Report</p>
            <p className="text-xs text-gray-500 print:mt-1">
              Date: {new Date().toLocaleDateString()}
            </p>
          </div>
          <div className="flex justify-between items-center mb-4 no-print">
            <h3 className="text-lg font-semibold text-gray-800">
              Recent Production Logs
            </h3>
            <div className="flex items-center gap-2">
              <Filter size={18} />
              <select
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value as any)
                  if (e.target.value !== 'custom') {
                    setStartDate('')
                    setEndDate('')
                  }
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="custom">Custom Date Range</option>
              </select>
              {filterType === 'custom' && (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="Start Date"
                  />
                  <span className="text-gray-500">to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="End Date"
                  />
                </div>
              )}
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={recipeSearchTerm}
                  onChange={(e) => setRecipeSearchTerm(e.target.value)}
                  placeholder="Search recipes..."
                  className="pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 w-48 no-print"
                />
              </div>
              {selectedRecipeIds.size > 0 && (
                <button
                  onClick={handlePrintSelectedRecipes}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 no-print"
                >
                  <Printer size={18} />
                  Print Selected ({selectedRecipeIds.size} recipes)
                </button>
              )}
              <button
                onClick={() => {
                  setSelectedRecipeIds(new Set())
                  setRecipeSearchTerm('')
                }}
                className={`px-3 py-2 text-sm text-gray-600 hover:text-gray-800 no-print ${selectedRecipeIds.size === 0 && !recipeSearchTerm ? 'hidden' : ''}`}
              >
                Clear Selection
              </button>
              <button
                onClick={() => {
                  // Print only the Recent Production Logs section
                  const printWindow = window.open('', '_blank')
                  if (!printWindow) return
                  
                  const printContent = `
                    <!DOCTYPE html>
                    <html>
                      <head>
                        <title>Recent Production Logs - RISHA FOODS AND BAKERY</title>
                        <style>
                          @page { margin: 1cm; }
                          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
                          .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #000; padding-bottom: 20px; }
                          .shop-name { font-size: 28px; font-weight: bold; color: #dc2626; margin-bottom: 10px; }
                          .report-title { font-size: 20px; font-weight: bold; margin-bottom: 10px; }
                          .report-info { font-size: 12px; color: #666; margin-top: 10px; }
                          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                          th { background-color: #f3f4f6; border: 2px solid #000; padding: 12px; text-align: left; font-weight: bold; font-size: 12px; }
                          td { border: 1px solid #000; padding: 10px; font-size: 12px; }
                          .footer { margin-top: 30px; padding-top: 20px; border-top: 2px solid #000; font-size: 11px; }
                          .summary { display: flex; justify-content: space-between; margin-top: 20px; }
                          .summary-item { font-weight: bold; }
                        </style>
                      </head>
                      <body>
                        <div class="header">
                          <div class="report-title">Recent Production Logs Report</div>
                          <div class="report-info">
                            Report Date: ${format(new Date(), 'dd MMM yyyy, hh:mm a')}<br>
                            Period: ${
                              filterType === 'all' ? 'All Time' :
                              filterType === 'today' ? `Today (${format(new Date(), 'dd MMM yyyy')})` :
                              filterType === 'week' ? `Week of ${format(startOfWeek(new Date()), 'dd MMM yyyy')}` :
                              filterType === 'month' ? format(startOfMonth(new Date()), 'MMMM yyyy') :
                              filterType === 'custom' && startDate && endDate ? 
                                `${format(new Date(startDate), 'dd MMM yyyy')} - ${format(new Date(endDate), 'dd MMM yyyy')}` :
                              'Custom Period'
                            }
                          </div>
                        </div>
                        <table>
                          <thead>
                            <tr>
                              <th>S.No</th>
                              <th>Date & Time</th>
                              <th>Recipe/Variant</th>
                              <th>Batches</th>
                              <th>Total Cost</th>
                              <th>Cost/Unit</th>
                            </tr>
                          </thead>
                          <tbody>
                            ${filteredProductions.map((prod: any, idx: number) => `
                              <tr>
                                <td>${idx + 1}</td>
                                <td>${format(new Date(prod.productionDate), 'dd MMM yyyy, hh:mm a')}</td>
                                <td>${prod.variantName ? `${prod.recipeName} - ${prod.variantName}` : prod.recipeName}</td>
                                <td>${prod.batches}</td>
                                <td>₹${prod.totalCost.toFixed(2)}</td>
                                <td>₹${prod.costPerUnit.toFixed(2)}</td>
                              </tr>
                            `).join('')}
                          </tbody>
                        </table>
                        <div class="footer">
                          <div class="summary">
                            <div>
                              <div class="summary-item">Total Production Logs: ${filteredProductions.length}</div>
                              <div class="summary-item">Total Batches: ${filteredProductions.reduce((sum: number, p: any) => sum + (p.batches || 0), 0)}</div>
                            </div>
                            <div>
                              <div class="summary-item">Total Cost: ₹${filteredProductions.reduce((sum: number, p: any) => sum + (p.totalCost || 0), 0).toFixed(2)}</div>
                              <div class="summary-item">Average Cost/Unit: ₹${filteredProductions.length > 0 ? (filteredProductions.reduce((sum: number, p: any) => sum + (p.totalCost || 0), 0) / filteredProductions.reduce((sum: number, p: any) => sum + (p.batches || 0) * (recipes?.find((r: any) => r.id === p.recipeId)?.outputQty || 1), 0)).toFixed(2) : '0.00'}</div>
                            </div>
                          </div>
                          <div style="margin-top: 20px; text-align: right; font-size: 10px; color: #666;">
                            Generated on: ${format(new Date(), 'dd MMM yyyy, hh:mm a')}<br>
                          </div>
                        </div>
                      </body>
                    </html>
                  `
                  printWindow.document.write(printContent)
                  printWindow.document.close()
                  setTimeout(() => {
                    printWindow.print()
                    printWindow.close()
                  }, 250)
                }}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Printer size={18} />
                Print Recent Logs
              </button>
            </div>
          </div>
          {/* Print Header for Recent Production Logs */}
          <div className="hidden print:block mb-6 border-b-2 border-gray-800 pb-4">
            <div className="text-center mb-4">
              <p className="text-lg font-semibold text-gray-800 mb-1">
                Recent Production Logs Report
              </p>
              <p className="text-sm text-gray-600 mt-2">
                Report Date: {format(new Date(), 'dd MMM yyyy, hh:mm a')} | 
                Period: {
                  filterType === 'all' ? 'All Time' :
                  filterType === 'today' ? `Today (${format(new Date(), 'dd MMM yyyy')})` :
                  filterType === 'week' ? `Week of ${format(startOfWeek(new Date()), 'dd MMM yyyy')}` :
                  filterType === 'month' ? format(startOfMonth(new Date()), 'MMMM yyyy') :
                  filterType === 'custom' && startDate && endDate ? 
                    `${format(new Date(startDate), 'dd MMM yyyy')} - ${format(new Date(endDate), 'dd MMM yyyy')}` :
                  'Custom Period'
                }
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 print:border-collapse print:border-2 print:border-gray-800">
              <thead className="bg-gray-50 print:bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:border print:border-gray-800 print:px-3 print:py-2 print:font-bold no-print">
                    <button
                      onClick={() => {
                        const allRecipeIds = new Set(filteredProductions.map((p: any) => p.recipeId).filter(Boolean))
                        if (selectedRecipeIds.size === allRecipeIds.size) {
                          setSelectedRecipeIds(new Set())
                        } else {
                          setSelectedRecipeIds(allRecipeIds)
                        }
                      }}
                      className="flex items-center gap-1"
                    >
                      {selectedRecipeIds.size > 0 && selectedRecipeIds.size === new Set(filteredProductions.map((p: any) => p.recipeId).filter(Boolean)).size ? (
                        <CheckSquare size={18} className="text-primary-600" />
                      ) : (
                        <Square size={18} className="text-gray-400" />
                      )}
                      Select
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:border print:border-gray-800 print:px-3 print:py-2 print:font-bold">
                    S.No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:border print:border-gray-800 print:px-3 print:py-2 print:font-bold">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:border print:border-gray-800 print:px-3 print:py-2 print:font-bold">
                    Recipe/Variant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:border print:border-gray-800 print:px-3 print:py-2 print:font-bold">
                    Batches
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:border print:border-gray-800 print:px-3 print:py-2 print:font-bold">
                    Total Cost
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:border print:border-gray-800 print:px-3 print:py-2 print:font-bold">
                    Cost/Unit
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProductions.length > 0 ? (
                  filteredProductions.map((prod: any, idx: number) => {
                    const isRecipeSelected = selectedRecipeIds.has(prod.recipeId)
                    const shouldHide = selectedRecipeIds.size > 0 && !isRecipeSelected
                    
                    return (
                      <tr key={prod.id} className={`print:border-b print:border-gray-300 ${shouldHide ? 'hidden print:hidden' : ''}`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm no-print">
                          <button
                            onClick={() => {
                              const newSelected = new Set(selectedRecipeIds)
                              if (newSelected.has(prod.recipeId)) {
                                newSelected.delete(prod.recipeId)
                              } else {
                                newSelected.add(prod.recipeId)
                              }
                              setSelectedRecipeIds(newSelected)
                            }}
                            className="flex items-center gap-1"
                          >
                            {isRecipeSelected ? (
                              <CheckSquare size={18} className="text-primary-600" />
                            ) : (
                              <Square size={18} className="text-gray-400" />
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 print:border print:border-gray-800 print:px-3 print:py-2 print:font-semibold">
                          {idx + 1}
                        </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 print:border print:border-gray-800 print:px-3 print:py-2">
                      {format(new Date(prod.productionDate), 'dd MMM yyyy, hh:mm a')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 print:border print:border-gray-800 print:px-3 print:py-2 print:font-bold">
                      {prod.variantName ? `${prod.recipeName} - ${prod.variantName}` : prod.recipeName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 print:border print:border-gray-800 print:px-3 print:py-2">
                      {prod.batches}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 print:border print:border-gray-800 print:px-3 print:py-2 print:font-semibold">
                      ₹{prod.totalCost.toFixed(2)}
                    </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 print:border print:border-gray-800 print:px-3 print:py-2">
                          ₹{prod.costPerUnit.toFixed(2)}
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500 print:border print:border-gray-800 print:px-3 print:py-2">
                      No production logs yet
                    </td>
                  </tr>
                )}
              </tbody>
              {filteredProductions.length > 0 && (
                <tfoot className="bg-gray-50 print:bg-gray-100 print:border-t-2 print:border-gray-800">
                  <tr>
                    <td className="px-6 py-3 text-sm font-bold text-gray-700 print:border print:border-gray-800 print:px-3 print:py-2 no-print"></td>
                    <td colSpan={3} className="px-6 py-3 text-right text-sm font-bold text-gray-700 print:border print:border-gray-800 print:px-3 print:py-2">
                      Totals:
                    </td>
                    <td className="px-6 py-3 text-sm font-bold text-gray-700 print:border print:border-gray-800 print:px-3 print:py-2">
                      {filteredProductions.reduce((sum: number, p: any) => sum + (p.batches || 0), 0)}
                    </td>
                    <td className="px-6 py-3 text-sm font-bold text-gray-700 print:border print:border-gray-800 print:px-3 print:py-2">
                      ₹{filteredProductions.reduce((sum: number, p: any) => sum + (p.totalCost || 0), 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-3 text-sm font-bold text-gray-700 print:border print:border-gray-800 print:px-3 print:py-2">
                      ₹{filteredProductions.length > 0 ? (filteredProductions.reduce((sum: number, p: any) => sum + (p.totalCost || 0), 0) / filteredProductions.reduce((sum: number, p: any) => sum + (p.batches || 0) * (recipes?.find((r: any) => r.id === p.recipeId)?.outputQty || 1), 0)).toFixed(2) : '0.00'}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Print Footer for Recent Production Logs */}
          {filteredProductions.length > 0 && (
            <div className="hidden print:block mt-8 pt-6 border-t-2 border-gray-800">
              <div className="grid grid-cols-2 gap-6 text-sm">
                <div>
                  <p className="font-bold mb-2 text-base">Summary:</p>
                  <p className="mb-1"><span className="font-semibold">Total Production Logs:</span> {filteredProductions.length}</p>
                  <p className="mb-1"><span className="font-semibold">Total Batches:</span> {filteredProductions.reduce((sum: number, p: any) => sum + (p.batches || 0), 0)}</p>
                  <p className="mb-1"><span className="font-semibold">Total Cost:</span> ₹{filteredProductions.reduce((sum: number, p: any) => sum + (p.totalCost || 0), 0).toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold mb-2 text-base">Document Information:</p>
                  <p className="mb-1">Generated on: {format(new Date(), 'dd MMM yyyy, hh:mm a')}</p>
                  <p className="mb-1">Report Period: {
                    filterType === 'all' ? 'All Time' :
                    filterType === 'today' ? `Today (${format(new Date(), 'dd MMM yyyy')})` :
                    filterType === 'week' ? `Week of ${format(startOfWeek(new Date()), 'dd MMM yyyy')}` :
                    filterType === 'month' ? format(startOfMonth(new Date()), 'MMMM yyyy') :
                    filterType === 'custom' && startDate && endDate ? 
                      `${format(new Date(startDate), 'dd MMM yyyy')} - ${format(new Date(endDate), 'dd MMM yyyy')}` :
                    'Custom Period'
                  }</p>
                  <p className="text-xs text-gray-500 mt-1">Recent Production Logs Report</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

export default function ProductionPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProductionPageContent />
    </Suspense>
  )
}
