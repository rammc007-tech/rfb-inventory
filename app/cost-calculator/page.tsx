'use client'

import { useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { Calculator, Printer, Factory } from 'lucide-react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function CostCalculatorPage() {
  const { data: recipes } = useSWR('/api/recipes', fetcher)
  const [selectedRecipeId, setSelectedRecipeId] = useState('')
  const [batches, setBatches] = useState(1)
  const [desiredOutputQty, setDesiredOutputQty] = useState('')
  const [useDesiredQty, setUseDesiredQty] = useState(false)
  const [utilityCost, setUtilityCost] = useState('')
  const [staffSalary, setStaffSalary] = useState('')
  const [loading, setLoading] = useState(false)
  const [costCalculation, setCostCalculation] = useState<any>(null)

  const calculateCost = async () => {
    if (!selectedRecipeId) {
      alert('Please select a recipe')
      return
    }

    if (useDesiredQty) {
      if (!desiredOutputQty || parseFloat(desiredOutputQty) < 0) {
        alert('Please enter a valid desired output quantity (0 or greater)')
        return
      }
    } else {
      if (batches < 1) {
        alert('Please enter number of batches (1 or greater)')
        return
      }
    }

    setLoading(true)
    try {
      const selectedRecipe = recipes?.find((r: any) => r.id === selectedRecipeId)
      let calculatedBatches = batches
      let outputQty = selectedRecipe?.outputQty * batches

      if (useDesiredQty && selectedRecipe && desiredOutputQty) {
        const desiredQty = parseFloat(desiredOutputQty)
        calculatedBatches = desiredQty / selectedRecipe.outputQty
        outputQty = desiredQty
      }

      const res = await fetch('/api/production/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          recipeId: selectedRecipeId, 
          batches: calculatedBatches,
          desiredOutputQty: useDesiredQty ? parseFloat(desiredOutputQty) : null,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        
        // Add utility and staff costs
        const utility = parseFloat(utilityCost) || 0
        const staff = parseFloat(staffSalary) || 0
        const additionalCosts = utility + staff
        
        const totalWithAdditional = data.totalCost + additionalCosts
        
        setCostCalculation({
          ...data,
          utilityCost: utility,
          staffSalary: staff,
          additionalCosts: additionalCosts,
          totalWithAdditional: totalWithAdditional,
          outputQty: outputQty,
          outputUnit: selectedRecipe?.outputUnit || 'pieces',
          useDesiredQty: useDesiredQty,
          desiredOutputQty: useDesiredQty ? parseFloat(desiredOutputQty) : null,
          calculatedBatches: calculatedBatches,
          batches: batches,
        })
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

  const selectedRecipe = recipes?.find((r: any) => r.id === selectedRecipeId)
  const costPerUnit = costCalculation && selectedRecipe
    ? costCalculation.totalWithAdditional / (costCalculation.outputQty || (selectedRecipe.outputQty * batches) || 1)
    : 0

  const handlePrint = () => {
    window.print()
  }

  const handleProduce = async () => {
    if (!selectedRecipeId || !costCalculation) {
      alert('Please calculate cost first')
      return
    }

    if (!costCalculation.canProduce) {
      alert('Cannot produce: Insufficient stock')
      return
    }

    const selectedRecipe = recipes?.find((r: any) => r.id === selectedRecipeId)
    if (!selectedRecipe) {
      alert('Recipe not found')
      return
    }

    const confirmMessage = costCalculation.useDesiredQty
      ? `Produce ${costCalculation.desiredOutputQty} ${costCalculation.outputUnit} of ${selectedRecipe.name}? This will deduct stock from inventory.`
      : `Produce ${costCalculation.batches} batch(es) of ${selectedRecipe.name}? This will deduct stock from inventory.`

    if (!confirm(confirmMessage)) {
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/production', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipeId: selectedRecipeId,
          batches: costCalculation.useDesiredQty 
            ? costCalculation.calculatedBatches 
            : costCalculation.batches,
          baseRecipeCost: costCalculation.totalCost,
          utilityCost: costCalculation.utilityCost || 0,
          staffSalary: costCalculation.staffSalary || 0,
          desiredOutputQty: costCalculation.useDesiredQty ? costCalculation.desiredOutputQty : null,
          desiredOutputUnit: costCalculation.useDesiredQty ? costCalculation.outputUnit : null,
        }),
      })

      if (res.ok) {
        alert(`Production logged successfully for ${selectedRecipe.name}!`)
        // Reset form
        setCostCalculation(null)
        setDesiredOutputQty('')
        setUseDesiredQty(false)
        setBatches(1)
        setUtilityCost('')
        setStaffSalary('')
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

  return (
    <DashboardLayout>
      <div className="space-y-6 print:space-y-0">
        <div className="flex items-center justify-between no-print">
        <div className="flex items-center gap-3">
          <Calculator className="w-8 h-8 text-primary-600" />
          <h2 className="text-2xl font-bold text-gray-800">Production Cost Calculator</h2>
          </div>
          {costCalculation && (
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              <Printer size={18} />
              Print
            </button>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6 print:shadow-none">
          <div className="hidden print:block text-center py-3 print:py-2 print:mb-2">
            <p className="text-sm text-gray-600 print:text-xs">Production Cost Calculator</p>
          </div>
          <h3 className="text-lg font-semibold mb-4 no-print">Calculate Production Cost</h3>
          <div className="space-y-4 no-print">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Recipe
              </label>
              <select
                value={selectedRecipeId}
                onChange={(e) => {
                  setSelectedRecipeId(e.target.value)
                  setCostCalculation(null)
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
                <h4 className="font-semibold text-gray-800 mb-2">
                  Recipe: {selectedRecipe.name}
                </h4>
                <p className="text-sm text-gray-600">
                  Output: {selectedRecipe.outputQty} {selectedRecipe.outputUnit} per batch
                </p>
                <div className="mt-2">
                  <p className="text-sm font-medium text-gray-700">Ingredients:</p>
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

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="useDesiredQty"
                  checked={useDesiredQty}
                  onChange={(e) => {
                    setUseDesiredQty(e.target.checked)
                    setCostCalculation(null)
                    if (!e.target.checked) {
                      setDesiredOutputQty('')
                    }
                  }}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <label htmlFor="useDesiredQty" className="text-sm font-medium text-gray-700">
                  Use Desired Output Quantity (Optional)
                </label>
              </div>

              {useDesiredQty ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Desired Output Quantity
                    <span className="text-xs text-gray-500 ml-1">(Any quantity - e.g., 0.5kg, 0.3kg, 1.2kg)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={desiredOutputQty}
                      onChange={(e) => {
                        setDesiredOutputQty(e.target.value)
                        setCostCalculation(null)
                      }}
                      placeholder={`e.g., 0, 0.5, 1.2, 10`}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-600">
                      {selectedRecipe?.outputUnit || 'pieces'}
                    </span>
                  </div>
                  {selectedRecipe && (
                    <p className="text-xs text-gray-500 mt-1">
                      Standard: {selectedRecipe.outputQty} {selectedRecipe.outputUnit} per batch. 
                      You can enter any quantity (e.g., 0, 0.5, {selectedRecipe.outputQty * 0.3}, {selectedRecipe.outputQty * 1.2}) and the cost will be calculated proportionally.
                    </p>
                  )}
                </div>
              ) : (
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
                  {selectedRecipe && (
                    <p className="text-xs text-gray-500 mt-1">
                      Standard output: {selectedRecipe.outputQty} {selectedRecipe.outputUnit} per batch
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Utility Costs (Optional)</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Electric Unit Cost (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={utilityCost}
                  onChange={(e) => {
                    setUtilityCost(e.target.value)
                    setCostCalculation(null)
                  }}
                  placeholder="e.g., 50"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gas Cost (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={staffSalary}
                  onChange={(e) => {
                    setStaffSalary(e.target.value)
                    setCostCalculation(null)
                  }}
                  placeholder="e.g., 200"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Other Utility Cost (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g., 100"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={calculateCost}
              disabled={loading || !selectedRecipeId}
              className="w-full px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold"
            >
              {loading ? 'Calculating...' : 'Calculate Cost'}
            </button>
          </div>
        </div>

        {costCalculation && (
          <div className="bg-white rounded-lg shadow-lg border-2 border-green-500 p-6 print:shadow-none print:border print:border-gray-300">
            <div className="mb-4 pb-4 border-b">
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                <span className="no-print">💰 </span>Production Cost Breakdown
              </h3>
              <p className="text-sm text-gray-600 no-print">
                Complete cost calculation including utilities and staff
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
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600">Recipe:</p>
                      <p className="text-lg font-semibold text-gray-800">
                        {selectedRecipe?.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">
                        {costCalculation.useDesiredQty ? 'Output Quantity:' : 'Batches:'}
                      </p>
                      <p className="text-lg font-semibold text-gray-800">
                        {costCalculation.useDesiredQty 
                          ? `${costCalculation.desiredOutputQty} ${costCalculation.outputUnit}`
                          : costCalculation.batches}
                      </p>
                    </div>
                    {costCalculation.useDesiredQty && (
                      <div>
                        <p className="text-sm text-gray-600">Calculated Batches:</p>
                        <p className="text-lg font-semibold text-gray-800">
                          {costCalculation.calculatedBatches?.toFixed(3) || '0'}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-3">Cost Breakdown:</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Raw Materials Cost:</span>
                        <span className="font-semibold">
                          ₹{costCalculation.totalCost.toFixed(2)}
                        </span>
                      </div>
                      {costCalculation.utilityCost > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Utility Cost:</span>
                          <span className="font-semibold">
                            ₹{costCalculation.utilityCost.toFixed(2)}
                          </span>
                        </div>
                      )}
                      {costCalculation.staffSalary > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Staff Salary:</span>
                          <span className="font-semibold">
                            ₹{costCalculation.staffSalary.toFixed(2)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between pt-2 border-t border-green-300">
                        <span className="text-lg font-bold text-gray-800">Total Cost:</span>
                        <span className="text-lg font-bold text-green-600">
                          ₹{costCalculation.totalWithAdditional.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between pt-2">
                        <span className="text-sm text-gray-600">
                          Cost per {costCalculation.outputUnit || selectedRecipe?.outputUnit}:
                        </span>
                        <span className="text-sm font-semibold text-green-600">
                          ₹{costPerUnit.toFixed(2)}
                        </span>
                      </div>
                      {costCalculation.useDesiredQty && (
                        <div className="flex justify-between pt-2 border-t border-green-300">
                          <span className="text-sm font-medium text-gray-700">
                            Total Output Quantity:
                          </span>
                          <span className="text-sm font-semibold text-blue-600">
                            {costCalculation.desiredOutputQty} {costCalculation.outputUnit}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-2">
                      Raw Material Breakdown (FIFO):
                    </h4>
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Material
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Quantity
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Cost
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {costCalculation.breakdown.map((item: any, idx: number) => (
                          <tr key={idx}>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {item.materialName}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-500">
                              {item.quantity} {item.unit}
                            </td>
                            <td className="px-4 py-2 text-sm font-medium text-gray-900">
                              ₹{item.cost.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-100">
                        <tr>
                          <td
                            colSpan={2}
                            className="px-4 py-2 text-sm font-semibold text-gray-900"
                          >
                            Raw Materials Total
                          </td>
                          <td className="px-4 py-2 text-sm font-semibold text-gray-900">
                            ₹{costCalculation.totalCost.toFixed(2)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-200 no-print">
                    <button
                      onClick={handleProduce}
                      disabled={loading || !costCalculation.canProduce}
                      className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-2"
                    >
                      <Factory size={20} />
                      {loading ? 'Producing...' : 'Produce & Add to Production'}
                    </button>
                    {!costCalculation.canProduce && (
                      <p className="text-xs text-red-600 mt-2 text-center">
                        Cannot produce: Insufficient stock available
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

