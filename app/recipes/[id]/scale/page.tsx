'use client'

import { DashboardLayout } from '@/components/DashboardLayout'
import { PrintButton } from '@/components/PrintButton'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save } from 'lucide-react'

interface Recipe {
  id: string
  name: string
  yieldQuantity: number
  yieldUnit: {
    id: string
    symbol: string
  }
  ingredients: Array<{
    id: string
    quantity: number
    item: {
      name: string
    }
    unit: {
      id: string
      symbol: string
    }
  }>
}

interface ScaledIngredient {
  itemId: string
  itemName: string
  quantity: number
  unitId: string
  unitSymbol: string
  scaledQuantity: number
}

export default function ScaleRecipePage() {
  const params = useParams()
  const router = useRouter()
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [desiredYield, setDesiredYield] = useState('')
  const [desiredUnitId, setDesiredUnitId] = useState('')
  const [scaledIngredients, setScaledIngredients] = useState<ScaledIngredient[]>([])
  const [scalingFactor, setScalingFactor] = useState(1)
  const [loading, setLoading] = useState(false)
  const [selectedIngredients, setSelectedIngredients] = useState<Set<number>>(new Set()) // For selecting ingredients to print

  useEffect(() => {
    if (params.id) {
      fetchRecipe()
    }
  }, [params.id])

  const fetchRecipe = async () => {
    try {
      const response = await fetch(`/api/recipes/${params.id}`)
      const data = await response.json()
      setRecipe(data)
      setDesiredUnitId(data.yieldUnit.id)
    } catch (error) {
      console.error('Failed to fetch recipe:', error)
    }
  }

  const handleScale = async () => {
    if (!desiredYield || !desiredUnitId) {
      alert('Please enter desired yield and select unit')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/recipes/${params.id}/scale`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          desiredYield: parseFloat(desiredYield),
          desiredUnitId,
        }),
      })

      const data = await response.json()

      const scaled: ScaledIngredient[] = data.scaledIngredients.map((ing: any) => ({
        itemId: ing.item.id,
        itemName: ing.item.name,
        quantity: ing.quantity,
        unitId: ing.unit.id,
        unitSymbol: ing.unit.symbol,
        scaledQuantity: ing.scaledQuantity,
      }))

      setScaledIngredients(scaled)
      setScalingFactor(data.scalingFactor)
      // Select all ingredients by default
      setSelectedIngredients(new Set(scaled.map((_, idx) => idx)))
    } catch (error) {
      console.error('Failed to scale recipe:', error)
      alert('Failed to scale recipe')
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  if (!recipe) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center text-gray-500">Loading recipe...</div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href="/recipes"
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Scale Recipe: {recipe.name}</h2>
            <p className="text-gray-600 mt-1">Scale recipe to desired yield</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Original Recipe</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Original Yield</p>
                <p className="text-xl font-medium text-gray-900">
                  {recipe.yieldQuantity} {recipe.yieldUnit.symbol}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Ingredients</p>
                <p className="text-xl font-medium text-gray-900">
                  {recipe.ingredients.length} items
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Scale to Desired Yield</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Desired Yield *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={desiredYield}
                  onChange={(e) => setDesiredYield(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit *
                </label>
                <select
                  value={desiredUnitId}
                  onChange={(e) => setDesiredUnitId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select unit</option>
                  {recipe.yieldUnit && (
                    <option value={recipe.yieldUnit.id}>
                      {recipe.yieldUnit.symbol}
                    </option>
                  )}
                </select>
              </div>
            </div>
            <button
              onClick={handleScale}
              disabled={loading || !desiredYield || !desiredUnitId}
              className="mt-4 bg-primary text-white px-6 py-2 rounded-md hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Calculating...' : 'Calculate Scaled Recipe'}
            </button>
          </div>

          {scaledIngredients.length > 0 && (
            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Scaled Recipe</h3>
                  <p className="text-sm text-gray-600">
                    Scaling factor: {scalingFactor.toFixed(4)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (selectedIngredients.size === scaledIngredients.length) {
                        setSelectedIngredients(new Set())
                      } else {
                        setSelectedIngredients(new Set(scaledIngredients.map((_, idx) => idx)))
                      }
                    }}
                    className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    {selectedIngredients.size === scaledIngredients.length ? 'Deselect All' : 'Select All'}
                  </button>
                  {scaledIngredients.length > 0 && selectedIngredients.size > 0 && (
                    <PrintButton
                      endpoint="/api/pdf/generate"
                      options={{
                        title: `Production Breakdown: ${recipe.name}`,
                        subtitle: `RISHA FOODS AND BAKERY | Original Yield: ${recipe.yieldQuantity} ${recipe.yieldUnit.symbol} | Scaled Yield: ${desiredYield} ${recipe.yieldUnit.symbol}`,
                        columns: [
                          { header: 'S.No', dataKey: 'sno' },
                          { header: 'Ingredient Name', dataKey: 'itemName' },
                          { header: 'Original Qty', dataKey: 'originalQty' },
                          { header: 'Scaled Qty', dataKey: 'scaledQty' },
                          { header: 'Unit', dataKey: 'unit' },
                        ],
                        data: scaledIngredients
                          .filter((_, idx) => selectedIngredients.has(idx))
                          .map((ing, idx) => ({
                            sno: (idx + 1).toString(),
                            itemName: ing.itemName,
                            originalQty: ing.quantity.toFixed(2),
                            scaledQty: ing.scaledQuantity.toFixed(2),
                            unit: ing.unitSymbol,
                          })),
                        filename: `production-breakdown-${recipe.name}`,
                        showDate: true,
                      }}
                    />
                  )}
                </div>
              </div>

              <div className="mb-4 p-4 bg-primary/10 rounded-md">
                <p className="text-sm text-gray-600">New Yield</p>
                <p className="text-2xl font-bold text-gray-900">
                  {desiredYield} {recipe.yieldUnit.symbol}
                </p>
              </div>

              <div className="border border-gray-200 rounded-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedIngredients.size === scaledIngredients.length && scaledIngredients.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIngredients(new Set(scaledIngredients.map((_, idx) => idx)))
                            } else {
                              setSelectedIngredients(new Set())
                            }
                          }}
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        S.No
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Ingredient Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Original Quantity
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Scaled Quantity
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Unit
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {scaledIngredients.map((ing, idx) => {
                      const isSelected = selectedIngredients.has(idx)
                      return (
                        <tr key={idx} className={isSelected ? 'bg-primary/5' : ''}>
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                const newSelected = new Set(selectedIngredients)
                                if (e.target.checked) {
                                  newSelected.add(idx)
                                } else {
                                  newSelected.delete(idx)
                                }
                                setSelectedIngredients(newSelected)
                              }}
                              className="rounded border-gray-300 text-primary focus:ring-primary"
                            />
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {idx + 1}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {ing.itemName}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {ing.quantity.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {ing.scaledQuantity.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {ing.unitSymbol}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex items-center gap-4">
                <Link
                  href={`/production/new?recipeId=${recipe.id}&yield=${desiredYield}&unitId=${desiredUnitId}`}
                  className="flex items-center gap-2 bg-primary text-white px-6 py-2 rounded-md hover:bg-opacity-90"
                >
                  <Save className="h-4 w-4" />
                  Use for Production
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

