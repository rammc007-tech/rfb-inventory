'use client'

import { DashboardLayout } from '@/components/DashboardLayout'
import { PrintButton } from '@/components/PrintButton'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Search, Edit, Trash2, Scale } from 'lucide-react'

interface Recipe {
  id: string
  name: string
  description: string | null
  yieldQuantity: number
  yieldUnit: {
    symbol: string
  }
  ingredients: Array<{
    id: string
    quantity: number
    item: {
      name: string
    }
    unit: {
      symbol: string
    }
  }>
}

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [ingredientCountFilter, setIngredientCountFilter] = useState<string>('all')

  useEffect(() => {
    fetchRecipes()
  }, [])

  const fetchRecipes = async () => {
    try {
      const response = await fetch('/api/recipes')
      if (!response.ok) {
        throw new Error('Failed to fetch recipes')
      }
      const data = await response.json()
      // Ensure data is an array
      setRecipes(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch recipes:', error)
      setRecipes([]) // Set to empty array on error
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this recipe?')) {
      return
    }

    try {
      const response = await fetch(`/api/recipes/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        alert('Recipe deleted successfully')
        fetchRecipes()
      } else {
        const errorData = await response.json().catch(() => ({}))
        alert(`Failed to delete recipe: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error: any) {
      console.error('Failed to delete recipe:', error)
      alert(`Failed to delete recipe: ${error?.message || 'Network error'}`)
    }
  }

  const filteredRecipes = Array.isArray(recipes)
    ? recipes.filter((recipe) => {
        // Search filter
        const matchesSearch = 
          recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          recipe.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          recipe.ingredients.some((ing) =>
            ing.item.name.toLowerCase().includes(searchTerm.toLowerCase())
          )
        
        if (!matchesSearch) return false

        // Ingredient count filter
        if (ingredientCountFilter !== 'all') {
          const count = recipe.ingredients.length
          if (ingredientCountFilter === '1-3' && (count < 1 || count > 3)) return false
          if (ingredientCountFilter === '4-6' && (count < 4 || count > 6)) return false
          if (ingredientCountFilter === '7-10' && (count < 7 || count > 10)) return false
          if (ingredientCountFilter === '10+' && count <= 10) return false
        }

        return true
      })
    : []

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Recipes</h2>
            <p className="text-gray-600 mt-1">Manage production recipes</p>
          </div>
          <div className="flex items-center gap-2">
            <PrintButton
              endpoint="/api/pdf/generate"
              options={{
                title: 'Recipes List',
                subtitle: 'RISHA FOODS AND BAKERY',
                columns: [],
                data: [],
                filename: 'recipes',
                recipeDetails: filteredRecipes.map((recipe) => ({
                  recipeName: recipe.name,
                  description: recipe.description || '-',
                  yield: `${recipe.yieldQuantity} ${recipe.yieldUnit.symbol}`,
                  ingredients: recipe.ingredients.map((ing) => ({
                    itemName: ing.item.name,
                    quantity: ing.quantity.toString(),
                    unit: ing.unit.symbol,
                  })),
                })),
              }}
            />
            <Link
              href="/recipes/new"
              className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-md hover:bg-opacity-90"
            >
              <Plus className="h-5 w-5" />
              New Recipe
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
              placeholder="Search by recipe name, description, or ingredient..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          
          {/* Filter Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Ingredient Count Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ingredient Count
              </label>
              <select
                value={ingredientCountFilter}
                onChange={(e) => setIngredientCountFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Recipes</option>
                <option value="1-3">1-3 Ingredients</option>
                <option value="4-6">4-6 Ingredients</option>
                <option value="7-10">7-10 Ingredients</option>
                <option value="10+">10+ Ingredients</option>
              </select>
            </div>
          </div>
        </div>

        {/* Recipes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full p-8 text-center text-gray-500">Loading...</div>
          ) : filteredRecipes.length === 0 ? (
            <div className="col-span-full p-8 text-center text-gray-500">No recipes found</div>
          ) : (
            filteredRecipes.map((recipe) => (
              <div key={recipe.id} className="bg-white rounded-lg shadow p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{recipe.name}</h3>
                {recipe.description && (
                  <p className="text-sm text-gray-600 mb-4">{recipe.description}</p>
                )}
                <div className="mb-4">
                  <p className="text-sm text-gray-500">Yield:</p>
                  <p className="text-lg font-medium text-gray-900">
                    {recipe.yieldQuantity} {recipe.yieldUnit.symbol}
                  </p>
                </div>
                <div className="mb-4">
                  <p className="text-sm text-gray-500 mb-2">Ingredients ({recipe.ingredients.length}):</p>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-1 px-2 font-medium text-gray-600">Item</th>
                          <th className="text-left py-1 px-2 font-medium text-gray-600">Qty</th>
                          <th className="text-left py-1 px-2 font-medium text-gray-600">Unit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recipe.ingredients.map((ing) => (
                          <tr key={ing.id} className="border-b border-gray-100">
                            <td className="py-1 px-2 text-gray-700">{ing.item.name}</td>
                            <td className="py-1 px-2 text-gray-700">{ing.quantity}</td>
                            <td className="py-1 px-2 text-gray-700">{ing.unit.symbol}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/recipes/${recipe.id}/scale`}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-opacity-90"
                  >
                    <Scale className="h-4 w-4" />
                    Scale
                  </Link>
                  <Link
                    href={`/recipes/${recipe.id}/edit`}
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    <Edit className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={() => handleDelete(recipe.id)}
                    className="px-4 py-2 border border-red-300 text-red-600 rounded-md hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

