'use client'

import { useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { Plus, X, Search, Edit, Trash2, Calculator, Printer, Eye, CheckSquare, Square } from 'lucide-react'
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
  const { data: materialsData } = useSWR('/api/raw-materials', fastFetcher, fastSWRConfig)
  const materials = Array.isArray(materialsData) ? materialsData : []
  const { data: recipes, mutate } = useSWR('/api/recipes', fastFetcher, fastSWRConfig)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    outputQty: '',
    outputUnit: 'pieces',
    unitWeight: '', // Unit weight in grams per piece
  })
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([
    { rawMaterialId: '', quantity: '', unit: 'kg' },
  ])
  const [searchTerm, setSearchTerm] = useState('')
  const [editingRecipe, setEditingRecipe] = useState<any>(null)
  const [calculatingRecipe, setCalculatingRecipe] = useState<string | null>(null)
  const [desiredOutput, setDesiredOutput] = useState<Record<string, string>>({})
  const [selectedRecipes, setSelectedRecipes] = useState<Set<string>>(new Set())
  const [previewRecipe, setPreviewRecipe] = useState<any>(null)
  
  // Calculate ingredients for desired output quantity
  const calculateIngredientsForOutput = (recipe: any, desiredQty: number) => {
    if (!recipe || !recipe.outputQty || desiredQty < 0) return []
    
    const ratio = desiredQty / recipe.outputQty
    const calculatedIngredients = recipe.ingredients.map((ing: any) => ({
      ...ing,
      calculatedQuantity: (ing.quantity * ratio).toFixed(3),
      originalQuantity: ing.quantity,
      ratio: ratio.toFixed(2),
    }))
    
    return calculatedIngredients
  }

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
        setFormData({ name: '', outputQty: '', outputUnit: 'pieces', unitWeight: '' })
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
      unitWeight: recipe.unitWeight,
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
      unitWeight: recipe.unitWeight?.toString() || '',
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
          unitWeight: formData.unitWeight ? parseFloat(formData.unitWeight) : null,
          ingredients: recipeIngredients,
        }),
      })

      if (res.ok) {
        mutate()
        setFormData({ name: '', outputQty: '', outputUnit: 'pieces', unitWeight: '' })
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

  const handleDeleteRecipe = async (id: string) => {
    if (!confirm('Are you sure you want to delete this recipe? This action cannot be undone.')) {
      return
    }

    try {
      // Get user level from localStorage
      const userStr = localStorage.getItem('rfb_user')
      const user = userStr ? JSON.parse(userStr) : null
      const userLevel = user?.role || 'user'
      
      const res = await fetch(`/api/recipes/${id}`, {
        method: 'DELETE',
        headers: {
          'x-user-level': userLevel,
        },
      })
      if (res.ok) {
        mutate()
        alert('Recipe deleted successfully!')
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to delete recipe')
      }
    } catch (error) {
      alert('Failed to delete recipe')
    }
  }

  // Ensure recipes is always an array and filter safely
  const recipesList = Array.isArray(recipes) ? recipes : []
  
  const filteredRecipes = recipesList.filter((recipe: any) => {
    // Safety check: ensure recipe exists and has required properties
    if (!recipe || typeof recipe !== 'object' || !recipe.name) {
      return false
    }
    
    const recipeName = String(recipe.name || '').toLowerCase()
    const searchLower = searchTerm.toLowerCase()
    const matchesName = recipeName.includes(searchLower)
    
    // Check ingredients if they exist
    const matchesIngredient = recipe.ingredients && Array.isArray(recipe.ingredients)
      ? recipe.ingredients.some((ing: any) => {
          const ingName = String(ing?.rawMaterialName || '').toLowerCase()
          return ingName.includes(searchLower)
        })
      : false
    
    return matchesName || matchesIngredient
  })

  const handlePrint = () => {
    window.print()
  }

  const toggleRecipeSelection = (recipeId: string) => {
    const newSelected = new Set(selectedRecipes)
    if (newSelected.has(recipeId)) {
      newSelected.delete(recipeId)
    } else {
      newSelected.add(recipeId)
    }
    setSelectedRecipes(newSelected)
  }

  const selectAllRecipes = () => {
    if (selectedRecipes.size === filteredRecipes.length) {
      setSelectedRecipes(new Set())
    } else {
      setSelectedRecipes(new Set(filteredRecipes.map((r: any) => r.id)))
    }
  }

  const handlePrintSelected = () => {
    if (selectedRecipes.size === 0) {
      alert('Please select at least one recipe to print')
      return
    }
    // Hide non-selected recipes for printing
    window.print()
  }

  const handlePreviewRecipe = (recipe: any) => {
    setPreviewRecipe(recipe)
  }

  const handleProduceWithDesiredQty = async (recipe: any, desiredQty: number, calculatedIngredients: any[]) => {
    if (!recipe || desiredQty <= 0 || calculatedIngredients.length === 0) {
      alert('Please enter a valid desired output quantity')
      return
    }

    try {
      // Calculate batches based on desired quantity
      const batches = desiredQty / recipe.outputQty

      // Create production log with calculated ingredients
      const res = await fetch('/api/production', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipeId: recipe.id,
          batches: batches,
          desiredOutputQty: desiredQty,
          desiredOutputUnit: recipe.outputUnit,
          calculatedIngredients: calculatedIngredients.map(ing => ({
            rawMaterialId: ing.rawMaterialId,
            quantity: parseFloat(ing.calculatedQuantity),
            unit: ing.unit,
          })),
        }),
      })

      if (res.ok) {
        alert(`Successfully produced ${desiredQty} ${recipe.outputUnit} of ${recipe.name}!`)
        // Clear desired output for this recipe
        setDesiredOutput({
          ...desiredOutput,
          [recipe.id]: '',
        })
        // Navigate to production page
        router.push('/production')
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to create production log')
      }
    } catch (error) {
      console.error('Error producing recipe:', error)
      alert('Failed to create production log')
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 print:space-y-0">
        <div className="flex justify-between items-center no-print">
          <h2 className="text-2xl font-bold text-gray-800">Recipes</h2>
          <div className="flex gap-2">
            {selectedRecipes.size > 0 && (
              <button
                onClick={handlePrintSelected}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Printer size={18} />
                Print Selected ({selectedRecipes.size})
              </button>
            )}
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              <Printer size={18} />
              Print All
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              <Plus size={20} />
              New Recipe
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 no-print">
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
          <div className="no-print">
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
                    min="0"
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit Weight (g per piece)
                    <span className="text-xs text-gray-500 ml-1">(Optional)</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.unitWeight}
                    onChange={(e) =>
                      setFormData({ ...formData, unitWeight: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g., 50 for 50g per piece"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Weight of one piece in grams (for pieces unit)
                  </p>
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
                    setFormData({ name: '', outputQty: '', outputUnit: 'pieces', unitWeight: '' })
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
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden print:shadow-none">
          <div className="hidden print:block text-center py-3 print:py-2 print:mb-2">
            <p className="text-sm text-gray-600 print:text-xs">Recipes List</p>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 print:bg-white">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider no-print">
                  <button
                    onClick={selectAllRecipes}
                    className="flex items-center gap-2 hover:text-primary-600"
                    title="Select All"
                  >
                    {selectedRecipes.size === filteredRecipes.length && filteredRecipes.length > 0 ? (
                      <CheckSquare size={18} className="text-primary-600" />
                    ) : (
                      <Square size={18} className="text-gray-400" />
                    )}
                    Select
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Recipe Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Output
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ingredients
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider no-print">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRecipes.map((recipe: any) => {
                const isCalculating = calculatingRecipe === recipe.id
                const desiredQty = parseFloat(desiredOutput[recipe.id] || '0')
                const calculatedIngredients = desiredQty > 0 
                  ? calculateIngredientsForOutput(recipe, desiredQty)
                  : []
                
                const isSelected = selectedRecipes.has(recipe.id)
                const shouldHide = selectedRecipes.size > 0 && !isSelected
                
                return (
                  <>
                    <tr key={recipe.id} className={shouldHide ? 'hidden print:hidden' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm no-print">
                        <button
                          onClick={() => toggleRecipeSelection(recipe.id)}
                          className="flex items-center gap-2"
                        >
                          {isSelected ? (
                            <CheckSquare size={18} className="text-primary-600" />
                          ) : (
                            <Square size={18} className="text-gray-400" />
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {recipe.name || 'Unnamed Recipe'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {recipe.outputQty || 0} {recipe.outputUnit || 'pieces'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <ul className="list-disc list-inside">
                          {(recipe.ingredients || []).map((ing: any, idx: number) => (
                            <li key={idx}>
                              {ing.rawMaterialName || 'Unknown'}: {ing.quantity || 0} {ing.unit || ''}
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm no-print">
                        <div className="flex gap-3">
                          <button
                            onClick={() => handlePreviewRecipe(recipe)}
                            className="text-green-600 hover:text-green-800"
                            title="Preview Recipe"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => setCalculatingRecipe(isCalculating ? null : recipe.id)}
                            className="text-purple-600 hover:text-purple-800"
                            title="Calculate Ingredients"
                          >
                            <Calculator size={16} />
                          </button>
                          <button
                            onClick={() => handleEditRecipe(recipe)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Edit Recipe"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteRecipe(recipe.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Delete Recipe"
                          >
                            <Trash2 size={16} />
                          </button>
                          <button
                            onClick={() => router.push(`/production?recipe=${recipe.id}`)}
                            className="text-primary-600 hover:text-primary-800 text-xs px-2 py-1 border border-primary-600 rounded"
                            title="Produce Recipe"
                          >
                            Produce
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isCalculating && (
                      <tr key={`${recipe.id}-calc`}>
                        <td colSpan={4} className="px-6 py-4 bg-purple-50">
                          <div className="space-y-3">
                            <div className="flex items-center gap-3">
                              <label className="text-sm font-medium text-gray-700">
                                Desired Output Quantity:
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={desiredOutput[recipe.id] || ''}
                                onChange={(e) => {
                                  setDesiredOutput({
                                    ...desiredOutput,
                                    [recipe.id]: e.target.value,
                                  })
                                }}
                                placeholder={`e.g., 10 (currently: ${recipe.outputQty || 0} ${recipe.outputUnit || 'pieces'})`}
                                className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 w-40"
                              />
                              <span className="text-sm text-gray-600">
                                {recipe.outputUnit || 'pieces'}
                              </span>
                            </div>
                            {desiredQty > 0 && calculatedIngredients.length > 0 && (
                              <div className="bg-white rounded-lg p-4 border border-purple-200">
                                <h4 className="text-sm font-semibold text-gray-800 mb-2">
                                  Required Ingredients for {desiredQty} {recipe.outputUnit}:
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {calculatedIngredients.map((ing: any, idx: number) => (
                                    <div key={idx} className="flex items-center justify-between text-sm">
                                      <span className="text-gray-700">
                                        {ing.rawMaterialName || 'Unknown'}:
                                      </span>
                                      <span className="font-semibold text-purple-700">
                                        {parseFloat(ing.calculatedQuantity).toFixed(3)} {ing.unit}
                                        <span className="text-xs text-gray-500 ml-1">
                                          (base: {ing.originalQuantity} {ing.unit})
                                        </span>
                                      </span>
                                    </div>
                                  ))}
                                </div>
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                  <p className="text-xs text-gray-600">
                                    Ratio: {calculatedIngredients[0]?.ratio}x (மூலத்தின் {calculatedIngredients[0]?.ratio} மடங்கு)
                                  </p>
                                </div>
                              </div>
                            )}
                            {desiredQty <= 0 && (
                              <p className="text-sm text-gray-500 italic">
                                Enter desired output quantity above to calculate required ingredients
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Recipe Preview Modal */}
        {previewRecipe && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800">Recipe Preview: {previewRecipe.name}</h3>
                <button
                  onClick={() => setPreviewRecipe(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Recipe Details</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p><span className="font-medium">Name:</span> {previewRecipe.name}</p>
                    <p><span className="font-medium">Output:</span> {previewRecipe.outputQty} {previewRecipe.outputUnit}</p>
                    {previewRecipe.unitWeight && (
                      <p><span className="font-medium">Unit Weight:</span> {previewRecipe.unitWeight}g per piece</p>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Base Ingredients (for {previewRecipe.outputQty} {previewRecipe.outputUnit})</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <ul className="space-y-2">
                      {(previewRecipe.ingredients || []).map((ing: any, idx: number) => (
                        <li key={idx} className="flex justify-between">
                          <span>{ing.rawMaterialName || 'Unknown'}</span>
                          <span className="font-medium">{ing.quantity} {ing.unit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="flex gap-2 pt-4 border-t">
                  <button
                    onClick={() => {
                      setPreviewRecipe(null)
                      handleEditRecipe(previewRecipe)
                    }}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Edit Recipe
                  </button>
                  <button
                    onClick={() => {
                      setPreviewRecipe(null)
                      toggleRecipeSelection(previewRecipe.id)
                    }}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    {selectedRecipes.has(previewRecipe.id) ? 'Deselect' : 'Select for Print'}
                  </button>
                  <button
                    onClick={() => setPreviewRecipe(null)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

