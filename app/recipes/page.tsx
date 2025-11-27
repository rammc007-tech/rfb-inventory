'use client'

import { useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { Plus, X, Search, Edit } from 'lucide-react'
import useSWR from 'swr'
import { useRouter } from 'next/navigation'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface RecipeIngredient {
  rawMaterialId: string
  quantity: string
  unit: string
}

export default function RecipesPage() {
  const router = useRouter()
  const { data: materials } = useSWR('/api/raw-materials', fetcher)
  const { data: recipes, mutate } = useSWR('/api/recipes', fetcher)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    outputQty: '',
    outputUnit: 'kg',
  })
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([
    { rawMaterialId: '', quantity: '', unit: 'kg' },
  ])
  const [searchTerm, setSearchTerm] = useState('')
  const [editingRecipe, setEditingRecipe] = useState<any>(null)

  const addIngredient = () => {
    setIngredients([
      ...ingredients,
      { rawMaterialId: '', quantity: '', unit: 'kg' },
    ])
  }

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index))
  }

  const updateIngredient = (
    index: number,
    field: keyof RecipeIngredient,
    value: string
  ) => {
    const updated = [...ingredients]
    updated[index] = { ...updated[index], [field]: value }
    setIngredients(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const recipeIngredients = ingredients
        .filter((ing) => ing.rawMaterialId && ing.quantity)
        .map((ing) => ({
          rawMaterialId: ing.rawMaterialId,
          quantity: parseFloat(ing.quantity),
          unit: ing.unit,
        }))

      if (recipeIngredients.length === 0) {
        alert('Please add at least one ingredient')
        return
      }

      const res = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          outputQty: parseFloat(formData.outputQty),
          outputUnit: formData.outputUnit,
          ingredients: recipeIngredients,
        }),
      })

      if (res.ok) {
        mutate()
        setFormData({ name: '', outputQty: '', outputUnit: 'kg' })
        setIngredients([{ rawMaterialId: '', quantity: '', unit: 'kg' }])
        setShowForm(false)
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to create recipe')
      }
    } catch (error) {
      alert('Failed to create recipe')
    }
  }

  const handleEditRecipe = (recipe: any) => {
    setEditingRecipe({
      id: recipe.id,
      name: recipe.name,
      outputQty: recipe.outputQty,
      outputUnit: recipe.outputUnit,
      ingredients: recipe.ingredients.map((ing: any) => ({
        id: ing.id,
        rawMaterialId: ing.rawMaterialId,
        quantity: ing.quantity.toString(),
        unit: ing.unit,
      })),
    })
    setFormData({
      name: recipe.name,
      outputQty: recipe.outputQty.toString(),
      outputUnit: recipe.outputUnit,
    })
    setIngredients(
      recipe.ingredients.map((ing: any) => ({
        rawMaterialId: ing.rawMaterialId,
        quantity: ing.quantity.toString(),
        unit: ing.unit,
      }))
    )
    setShowForm(true)
  }

  const handleUpdateRecipe = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingRecipe) return

    try {
      const recipeIngredients = ingredients
        .filter((ing) => ing.rawMaterialId && ing.quantity)
        .map((ing) => ({
          rawMaterialId: ing.rawMaterialId,
          quantity: parseFloat(ing.quantity),
          unit: ing.unit,
        }))

      if (recipeIngredients.length === 0) {
        alert('Please add at least one ingredient')
        return
      }

      const res = await fetch(`/api/recipes/${editingRecipe.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          outputQty: parseFloat(formData.outputQty),
          outputUnit: formData.outputUnit,
          ingredients: recipeIngredients,
        }),
      })

      if (res.ok) {
        mutate()
        setFormData({ name: '', outputQty: '', outputUnit: 'kg' })
        setIngredients([{ rawMaterialId: '', quantity: '', unit: 'kg' }])
        setShowForm(false)
        setEditingRecipe(null)
        alert('Recipe updated successfully!')
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to update recipe')
      }
    } catch (error) {
      alert('Failed to update recipe')
    }
  }

  const filteredRecipes = recipes?.filter((recipe: any) =>
    recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    recipe.ingredients.some((ing: any) =>
      ing.rawMaterialName.toLowerCase().includes(searchTerm.toLowerCase())
    )
  ) || []

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">Recipes</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Plus size={20} />
            New Recipe
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search recipes by name or ingredient..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {showForm && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">
              {editingRecipe ? 'Edit Recipe' : 'Create Recipe'}
            </h3>
            <form onSubmit={editingRecipe ? handleUpdateRecipe : handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Recipe Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g., Puff, Cake"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Output Quantity
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.outputQty}
                    onChange={(e) =>
                      setFormData({ ...formData, outputQty: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Output Unit
                  </label>
                  <select
                    value={formData.outputUnit}
                    onChange={(e) =>
                      setFormData({ ...formData, outputUnit: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="liter">liter</option>
                    <option value="ml">ml</option>
                    <option value="pieces">pieces</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ingredients
                </label>
                {ingredients.map((ing, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border border-gray-200 rounded-lg mb-2"
                  >
                    <div>
                      <select
                        required
                        value={ing.rawMaterialId}
                        onChange={(e) =>
                          updateIngredient(index, 'rawMaterialId', e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="">Select Material</option>
                        {materials?.map((mat: any) => (
                          <option key={mat.id} value={mat.id}>
                            {mat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={ing.quantity}
                        onChange={(e) =>
                          updateIngredient(index, 'quantity', e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        placeholder="Quantity"
                      />
                    </div>
                    <div>
                      <select
                        required
                        value={ing.unit}
                        onChange={(e) =>
                          updateIngredient(index, 'unit', e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="kg">kg</option>
                        <option value="g">g</option>
                        <option value="liter">liter</option>
                        <option value="ml">ml</option>
                        <option value="pieces">pieces</option>
                      </select>
                    </div>
                    <div className="flex items-center">
                      {ingredients.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeIngredient(index)}
                          className="w-full px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                        >
                          <X size={20} className="mx-auto" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addIngredient}
                  className="mt-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Add Ingredient
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  {editingRecipe ? 'Update Recipe' : 'Create Recipe'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setFormData({ name: '', outputQty: '', outputUnit: 'kg' })
                    setIngredients([
                      { rawMaterialId: '', quantity: '', unit: 'kg' },
                    ])
                    setEditingRecipe(null)
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Recipe Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Output
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ingredients
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRecipes.map((recipe: any) => (
                <tr key={recipe.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {recipe.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {recipe.outputQty} {recipe.outputUnit}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <ul className="list-disc list-inside">
                      {recipe.ingredients.map((ing: any, idx: number) => (
                        <li key={idx}>
                          {ing.rawMaterialName}: {ing.quantity} {ing.unit}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleEditRecipe(recipe)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Edit Recipe"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => router.push(`/production?recipe=${recipe.id}`)}
                        className="text-primary-600 hover:text-primary-800"
                      >
                        Produce
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  )
}

