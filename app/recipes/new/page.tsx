'use client'

import { DashboardLayout } from '@/components/DashboardLayout'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'

interface Item {
  id: string
  name: string
  sku: string | null
  baseUnit: {
    id: string
    symbol: string
  }
  itemUnits: Array<{
    unit: {
      id: string
      symbol: string
    }
  }>
}

interface Unit {
  id: string
  name: string
  symbol: string
}

interface Ingredient {
  itemId: string
  itemName: string
  quantity: number
  unitId: string
  unitSymbol: string
}

export default function NewRecipePage() {
  const router = useRouter()
  const [items, setItems] = useState<Item[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [allUnits, setAllUnits] = useState<Unit[]>([]) // All available units in system
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    yieldQuantity: '',
    yieldUnitId: '',
  })
  const [ingredients, setIngredients] = useState<Ingredient[]>([])

  useEffect(() => {
    fetchItems()
    fetchUnits()
    fetchAllUnits()
  }, [])

  const fetchItems = async () => {
    try {
      const response = await fetch('/api/items')
      const data = await response.json()
      setItems(data)
    } catch (error) {
      console.error('Failed to fetch items:', error)
    }
  }

  const fetchUnits = async () => {
    try {
      const response = await fetch('/api/units')
      const data = await response.json()
      setUnits(data)
    } catch (error) {
      console.error('Failed to fetch units:', error)
    }
  }

  const fetchAllUnits = async () => {
    try {
      const response = await fetch('/api/units')
      const data = await response.json()
      setAllUnits(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch all units:', error)
    }
  }

  const addIngredient = () => {
    setIngredients([
      ...ingredients,
      {
        itemId: '',
        itemName: '',
        quantity: 0,
        unitId: '',
        unitSymbol: '',
      },
    ])
  }

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index))
  }

  const updateIngredient = (index: number, updates: Partial<Ingredient>) => {
    const updated = [...ingredients]
    updated[index] = { ...updated[index], ...updates }

    // Update item name and default unit when item changes
    if (updates.itemId !== undefined) {
      const item = items.find((i) => i.id === updates.itemId)
      if (item && item.baseUnit) {
        updated[index].itemName = item.name
        // Always set to base unit when item changes
        updated[index].unitId = item.baseUnit.id
        updated[index].unitSymbol = item.baseUnit.symbol
      } else if (!updates.itemId) {
        // Clear unit when item is cleared
        updated[index].unitId = ''
        updated[index].unitSymbol = ''
        updated[index].itemName = ''
      }
    }

    setIngredients(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          yieldQuantity: parseFloat(formData.yieldQuantity),
          ingredients: ingredients.map((ing) => ({
            itemId: ing.itemId,
            quantity: ing.quantity,
            unitId: ing.unitId,
          })),
        }),
      })

      if (response.ok) {
        router.push('/recipes')
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to create recipe')
      }
    } catch (error) {
      console.error('Failed to create recipe:', error)
      alert('Failed to create recipe')
    } finally {
      setLoading(false)
    }
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
            <h2 className="text-3xl font-bold text-gray-900">New Recipe</h2>
            <p className="text-gray-600 mt-1">Create a new recipe</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Recipe Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Yield Quantity *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.yieldQuantity}
                onChange={(e) => setFormData({ ...formData, yieldQuantity: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Yield Unit *
              </label>
              <select
                value={formData.yieldUnitId}
                onChange={(e) => setFormData({ ...formData, yieldUnitId: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select unit</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.symbol} ({unit.name})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Ingredients *
              </label>
              <button
                type="button"
                onClick={addIngredient}
                className="flex items-center gap-2 text-sm text-primary hover:text-primary/80"
              >
                <Plus className="h-4 w-4" />
                Add Ingredient
              </button>
            </div>

            {ingredients.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No ingredients added. Click &quot;Add Ingredient&quot; to start.
              </p>
            ) : (
              <div className="space-y-4">
                {ingredients.map((ingredient, index) => {
                  const selectedItem = items.find((i) => i.id === ingredient.itemId)
                  
                  // Calculate available units - show ALL units from system for flexibility
                  // User can select any unit (g, kg, ml, L, etc.) even if item is stored in different unit
                  let availableUnits: Array<{ unit: { id: string; symbol: string } }> = []
                  
                  if (selectedItem) {
                    // Include base unit first
                    if (selectedItem.baseUnit) {
                      availableUnits.push({
                        unit: {
                          id: selectedItem.baseUnit.id,
                          symbol: selectedItem.baseUnit.symbol,
                        },
                      })
                    }
                    
                    // Add all itemUnits
                    const itemUnits = (selectedItem.itemUnits || []).filter(
                      (iu) => iu && iu.unit && iu.unit.id && iu.unit.symbol
                    )
                    
                    // Add itemUnits that aren't already in the list
                    itemUnits.forEach((iu) => {
                      if (!availableUnits.some((au) => au.unit.id === iu.unit.id)) {
                        availableUnits.push({
                          unit: {
                            id: iu.unit.id,
                            symbol: iu.unit.symbol,
                          },
                        })
                      }
                    })
                    
                    // Add ALL other units from system for maximum flexibility
                    // This allows selecting g when item is in kg, etc.
                    allUnits.forEach((unit) => {
                      if (!availableUnits.some((au) => au.unit.id === unit.id)) {
                        availableUnits.push({
                          unit: {
                            id: unit.id,
                            symbol: unit.symbol,
                          },
                        })
                      }
                    })
                    
                    console.log('Available units for ingredient', index + 1, 'item:', selectedItem.name, 'total units:', availableUnits.length)
                  }

                  return (
                    <div
                      key={index}
                      className="border border-gray-200 rounded-md p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-900">Ingredient {index + 1}</h4>
                        <button
                          type="button"
                          onClick={() => removeIngredient(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Item
                          </label>
                          <select
                            value={ingredient.itemId}
                            onChange={(e) =>
                              updateIngredient(index, { itemId: e.target.value })
                            }
                            required
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            <option value="">Select item</option>
                            {items.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name} {item.sku ? `(${item.sku})` : ''}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Quantity
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={ingredient.quantity || ''}
                            onChange={(e) =>
                              updateIngredient(index, {
                                quantity: parseFloat(e.target.value) || 0,
                              })
                            }
                            required
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Unit
                          </label>
                          <select
                            value={ingredient.unitId || ''}
                            onChange={(e) => {
                              const unit = availableUnits.find(
                                (u) => u.unit.id === e.target.value
                              )
                              updateIngredient(index, {
                                unitId: e.target.value,
                                unitSymbol: unit?.unit.symbol || '',
                              })
                            }}
                            required
                            disabled={!selectedItem || availableUnits.length === 0}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
                          >
                            <option value="">
                              {!selectedItem 
                                ? 'Select item first' 
                                : availableUnits.length === 0
                                ? 'No units available'
                                : 'Select unit'}
                            </option>
                            {availableUnits.map((u) => (
                              <option key={u.unit.id} value={u.unit.id}>
                                {u.unit.symbol}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={loading || ingredients.length === 0}
              className="bg-primary text-white px-6 py-2 rounded-md hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Recipe'}
            </button>
            <Link
              href="/recipes"
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

