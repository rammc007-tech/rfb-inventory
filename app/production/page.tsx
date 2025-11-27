'use client'

import { useState, useEffect, Suspense } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { Factory, Plus, X } from 'lucide-react'
import useSWR from 'swr'
import { useSearchParams } from 'next/navigation'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

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
  const { data: recipes } = useSWR('/api/recipes', fetcher)
  const { data: materials } = useSWR('/api/raw-materials', fetcher)
  const { data: productions, mutate } = useSWR('/api/production', fetcher)

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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3 no-print">
          <Factory className="w-8 h-8 text-primary-600" />
          <h2 className="text-2xl font-bold text-gray-800">Daily Production</h2>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="space-y-4">
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

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Recent Production Logs
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Recipe/Variant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Batches
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Cost
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cost/Unit
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {productions?.slice(0, 10).map((prod: any) => (
                  <tr key={prod.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(prod.productionDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {prod.variantName ? `${prod.recipeName} - ${prod.variantName}` : prod.recipeName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {prod.batches}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ₹{prod.totalCost.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ₹{prod.costPerUnit.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
