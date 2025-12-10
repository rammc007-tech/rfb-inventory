'use client'

import { DashboardLayout } from '@/components/DashboardLayout'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

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
      id: string
      name: string
      baseUnit: {
        id: string
        symbol: string
      }
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
}

export default function NewProductionPage() {
  const router = useRouter()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [selectedRecipeId, setSelectedRecipeId] = useState('')
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)
  const [producedQuantity, setProducedQuantity] = useState('')
  const [producedUnitId, setProducedUnitId] = useState('')
  const [laborCost, setLaborCost] = useState('')
  const [overheadCost, setOverheadCost] = useState('')
  const [notes, setNotes] = useState('')
  const [scaledIngredients, setScaledIngredients] = useState<ScaledIngredient[]>([])
  const [shortages, setShortages] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchRecipes()
  }, [])

  useEffect(() => {
    if (selectedRecipeId) {
      const recipe = recipes.find((r) => r.id === selectedRecipeId)
      setSelectedRecipe(recipe || null)
      if (recipe) {
        setProducedUnitId(recipe.yieldUnit.id)
      }
    }
  }, [selectedRecipeId, recipes])

  const fetchRecipes = async () => {
    try {
      const response = await fetch('/api/recipes')
      const data = await response.json()
      setRecipes(data)
    } catch (error) {
      console.error('Failed to fetch recipes:', error)
    }
  }

  const handleScaleRecipe = async () => {
    if (!selectedRecipeId || !producedQuantity || !producedUnitId) {
      alert('Please select a recipe and enter produced quantity')
      return
    }

    try {
      const response = await fetch(`/api/recipes/${selectedRecipeId}/scale`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          desiredYield: parseFloat(producedQuantity),
          desiredUnitId: producedUnitId,
        }),
      })

      const data = await response.json()

      const scaled: ScaledIngredient[] = data.scaledIngredients.map((ing: any) => ({
        itemId: ing.item.id,
        itemName: ing.item.name,
        quantity: ing.scaledQuantity,
        unitId: ing.unit.id,
        unitSymbol: ing.unit.symbol,
      }))

      setScaledIngredients(scaled)
    } catch (error) {
      console.error('Failed to scale recipe:', error)
      alert('Failed to scale recipe')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setShortages([])

    try {
      const response = await fetch('/api/production', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: new Date().toISOString(),
          recipeId: selectedRecipeId,
          producedQuantity: parseFloat(producedQuantity),
          producedUnitId,
          laborCost: parseFloat(laborCost) || 0,
          overheadCost: parseFloat(overheadCost) || 0,
          notes,
          scaledIngredients,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        router.push('/production')
      } else {
        if (data.shortages) {
          setShortages(data.shortages)
        } else {
          alert(data.error || 'Failed to create production')
        }
      }
    } catch (error) {
      console.error('Failed to create production:', error)
      alert('Failed to create production')
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href="/production"
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h2 className="text-3xl font-bold text-gray-900">New Production</h2>
            <p className="text-gray-600 mt-1">Record a new production batch</p>
          </div>
        </div>

        {shortages.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-800 mb-2">
              <AlertTriangle className="h-5 w-5" />
              <p className="font-medium">Insufficient Stock</p>
            </div>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {shortages.map((shortage, idx) => (
                <li key={idx}>
                  {shortage.itemName}: Required {shortage.required}{' '}
                  {shortage.requiredUnit}, Available {shortage.available}{' '}
                  {shortage.availableUnit}
                </li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Recipe *
            </label>
            <select
              value={selectedRecipeId}
              onChange={(e) => setSelectedRecipeId(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select a recipe</option>
              {recipes.map((recipe) => (
                <option key={recipe.id} value={recipe.id}>
                  {recipe.name} ({recipe.yieldQuantity} {recipe.yieldUnit.symbol})
                </option>
              ))}
            </select>
          </div>

          {selectedRecipe && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Produced Quantity *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={producedQuantity}
                    onChange={(e) => setProducedQuantity(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit *
                  </label>
                  <select
                    value={producedUnitId}
                    onChange={(e) => setProducedUnitId(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select unit</option>
                    {selectedRecipe.yieldUnit && (
                      <option value={selectedRecipe.yieldUnit.id}>
                        {selectedRecipe.yieldUnit.symbol}
                      </option>
                    )}
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={handleScaleRecipe}
                className="bg-primary text-white px-4 py-2 rounded-md hover:bg-opacity-90"
              >
                Calculate Ingredients
              </button>

              {scaledIngredients.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Required Ingredients
                  </h3>
                  <div className="border border-gray-200 rounded-md overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Item
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Quantity
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {scaledIngredients.map((ing, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {ing.itemName}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {ing.quantity.toFixed(2)} {ing.unitSymbol}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Labor Cost
              </label>
              <input
                type="number"
                step="0.01"
                value={laborCost}
                onChange={(e) => setLaborCost(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Overhead Cost
              </label>
              <input
                type="number"
                step="0.01"
                value={overheadCost}
                onChange={(e) => setOverheadCost(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={loading || scaledIngredients.length === 0}
              className="bg-primary text-white px-6 py-2 rounded-md hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Production'}
            </button>
            <Link
              href="/production"
              className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}

