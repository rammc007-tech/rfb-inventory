'use client'

import { useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { Star, Package, Search, Filter, Plus, ShoppingCart } from 'lucide-react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function EssentialItemsPage() {
  const { data: materials, mutate } = useSWR('/api/raw-materials', fetcher)
  const { data: purchases } = useSWR('/api/purchases', fetcher)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ name: '', unit: 'kg' })
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'low-stock' | 'out-of-stock' | 'in-stock'>('all')
  const [showPurchaseForm, setShowPurchaseForm] = useState(false)
  const [selectedMaterial, setSelectedMaterial] = useState<string>('')
  const [purchaseData, setPurchaseData] = useState({
    quantity: '',
    unit: 'kg',
    unitPrice: '',
    totalCost: '',
    gasCylinderQty: '',
  })

  const essentialMaterials = materials?.filter((m: any) => m.isEssential) || []

  const filteredMaterials = essentialMaterials.filter((material: any) => {
    // Search filter
    const matchesSearch = material.name.toLowerCase().includes(searchTerm.toLowerCase())
    if (!matchesSearch) return false

    // Stock filter
    if (filterType === 'low-stock') {
      return material.currentStock < 10 && material.currentStock > 0
    } else if (filterType === 'out-of-stock') {
      return material.currentStock === 0 || material.currentStock < 0.01
    } else if (filterType === 'in-stock') {
      return material.currentStock >= 10
    }
    
    return true // 'all'
  })

  // Get recent purchases for essential items
  const recentPurchases = purchases?.filter((p: any) => {
    return essentialMaterials.some((m: any) => m.id === p.rawMaterialId)
  }) || []

  const handleMarkEssential = async (materialId: string, isEssential: boolean) => {
    try {
      const res = await fetch(`/api/raw-materials/${materialId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEssential }),
      })
      if (res.ok) {
        mutate()
      }
    } catch (error) {
      alert('Failed to update material')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/raw-materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, isEssential: true }),
      })
      if (res.ok) {
        mutate()
        setFormData({ name: '', unit: 'kg' })
        setShowForm(false)
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to create essential item')
      }
    } catch (error) {
      alert('Failed to create essential item')
    }
  }

  const handlePurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMaterial) {
      alert('Please select a material')
      return
    }

    try {
      let unitPrice = parseFloat(purchaseData.unitPrice || '0')
      let totalCost = parseFloat(purchaseData.totalCost || '0')
      const quantity = parseFloat(purchaseData.quantity)
      
      // Calculate unit price if total cost is provided
      if (totalCost && quantity > 0 && !unitPrice) {
        unitPrice = totalCost / quantity
      } else if (unitPrice && quantity > 0 && !totalCost) {
        totalCost = unitPrice * quantity
      }

      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchases: [{
            materialId: selectedMaterial,
            quantity: quantity,
            unit: purchaseData.unit,
            unitPrice: unitPrice,
            gasCylinderQty: purchaseData.gasCylinderQty ? parseFloat(purchaseData.gasCylinderQty) : undefined,
          }],
        }),
      })

      if (res.ok) {
        mutate()
        setShowPurchaseForm(false)
        setPurchaseData({ quantity: '', unit: 'kg', unitPrice: '', totalCost: '', gasCylinderQty: '' })
        setSelectedMaterial('')
        alert('Purchase added successfully!')
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to add purchase')
      }
    } catch (error) {
      alert('Failed to add purchase')
    }
  }

  const isCylinder = (materialId: string) => {
    const material = materials?.find((m: any) => m.id === materialId)
    return material?.name.toLowerCase().includes('cylinder')
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Star className="w-8 h-8 text-yellow-500" />
            <h2 className="text-2xl font-bold text-gray-800">Essential Items</h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowPurchaseForm(!showPurchaseForm)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <ShoppingCart size={20} />
              Purchase Essential Item
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              <Package size={20} />
              Add Essential Item
            </button>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search essential items by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-1">
              <Filter size={16} />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="border-0 focus:ring-0 text-sm"
              >
                <option value="all">All Items</option>
                <option value="low-stock">Low Stock (&lt; 10)</option>
                <option value="out-of-stock">Out of Stock</option>
                <option value="in-stock">In Stock (≥ 10)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Purchase Form */}
        {showPurchaseForm && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Purchase Essential Item</h3>
            <form onSubmit={handlePurchaseSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Essential Item *
                  </label>
                  <select
                    required
                    value={selectedMaterial}
                    onChange={(e) => {
                      setSelectedMaterial(e.target.value)
                      const material = materials?.find((m: any) => m.id === e.target.value)
                      if (material) {
                        setPurchaseData({ ...purchaseData, unit: material.unit })
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select Material</option>
                    {essentialMaterials.map((mat: any) => (
                      <option key={mat.id} value={mat.id}>
                        {mat.name} (Current: {mat.currentStock.toFixed(2)} {mat.unit})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={purchaseData.quantity}
                    onChange={(e) => setPurchaseData({ ...purchaseData, quantity: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit *
                  </label>
                  <select
                    required
                    value={purchaseData.unit}
                    onChange={(e) => setPurchaseData({ ...purchaseData, unit: e.target.value })}
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
                    Bulk Price (₹) - Total
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={purchaseData.totalCost}
                    onChange={(e) => {
                      const total = e.target.value
                      const qty = parseFloat(purchaseData.quantity)
                      const unitPrice = qty > 0 && total ? parseFloat(total) / qty : 0
                      setPurchaseData({
                        ...purchaseData,
                        totalCost: total,
                        unitPrice: unitPrice.toString(),
                      })
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g., 2100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price/Unit (₹) - Auto
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={purchaseData.unitPrice}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    placeholder="Auto calculated"
                  />
                </div>
                {selectedMaterial && isCylinder(selectedMaterial) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Gas Cylinder Qty (kg)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={purchaseData.gasCylinderQty}
                      onChange={(e) =>
                        setPurchaseData({ ...purchaseData, gasCylinderQty: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="e.g., 19"
                    />
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Add Purchase
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPurchaseForm(false)
                    setPurchaseData({ quantity: '', unit: 'kg', unitPrice: '', totalCost: '', gasCylinderQty: '' })
                    setSelectedMaterial('')
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Add Item Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Add Essential Item</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Item Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g., Essential Oil, Salt"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) =>
                      setFormData({ ...formData, unit: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="kg">Kilogram (kg)</option>
                    <option value="g">Gram (g)</option>
                    <option value="liter">Liter</option>
                    <option value="ml">Milliliter (ml)</option>
                    <option value="pieces">Pieces</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Create Essential Item
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setFormData({ name: '', unit: 'kg' })
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Essential Items List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredMaterials.map((material: any) => (
                <tr key={material.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      {material.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {material.unit}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {material.currentStock.toFixed(2)} {material.stockUnit}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {material.currentStock === 0 || material.currentStock < 0.01 ? (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                        Out of Stock
                      </span>
                    ) : material.currentStock < 10 ? (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                        Low Stock
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        In Stock
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => {
                        setSelectedMaterial(material.id)
                        const materialObj = materials?.find((m: any) => m.id === material.id)
                        if (materialObj) {
                          setPurchaseData({
                            ...purchaseData,
                            unit: materialObj.unit,
                          })
                        }
                        setShowPurchaseForm(true)
                      }}
                      className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                    >
                      Purchase
                    </button>
                  </td>
                </tr>
              ))}
              {filteredMaterials.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">
                    {searchTerm || filterType !== 'all'
                      ? 'No essential items found matching your search/filter'
                      : 'No essential items marked yet'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Recent Purchases */}
        {recentPurchases.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Essential Item Purchases</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Item
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Unit Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Total Cost
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentPurchases.slice(0, 5).map((purchase: any) => (
                    <tr key={purchase.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {purchase.rawMaterialName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {purchase.quantity} {purchase.unit}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ₹{purchase.unitPrice.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ₹{purchase.totalCost.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(purchase.purchaseDate).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Essential items are critical items that need to be always in stock. 
            Use the search and filter options to quickly find items that need restocking. 
            You can purchase essential items directly from this page.
          </p>
        </div>
      </div>
    </DashboardLayout>
  )
}
