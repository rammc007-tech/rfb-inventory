'use client'

import { useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { Plus, X, Printer, Filter, Edit, Trash2, Search, Calendar } from 'lucide-react'
import useSWR from 'swr'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths } from 'date-fns'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface PurchaseItem {
  materialId: string
  quantity: string
  unit: string
  unitPrice: string
  totalCost: string // For bulk price entry
  gasCylinderQty: string // Separate column for gas cylinder quantity
}

interface EditingPurchase {
  id: string
  rawMaterialId: string
  quantity: number
  unit: string
  unitPrice: number
  totalCost: number
  purchaseDate: string
  gasCylinderQty?: number
}

export default function PurchasesPage() {
  const { data: materials } = useSWR('/api/raw-materials', fetcher)
  const { data: purchases, mutate } = useSWR('/api/purchases', fetcher)
  const [showForm, setShowForm] = useState(false)
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([
    { materialId: '', quantity: '', unit: 'kg', unitPrice: '', totalCost: '', gasCylinderQty: '' },
  ])
  const [filterType, setFilterType] = useState<'all' | 'today' | 'week' | 'month'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [editingPurchase, setEditingPurchase] = useState<EditingPurchase | null>(null)

  const addPurchaseItem = () => {
    setPurchaseItems([
      ...purchaseItems,
      { materialId: '', quantity: '', unit: 'kg', unitPrice: '', totalCost: '', gasCylinderQty: '' },
    ])
  }

  const isCylinder = (materialId: string) => {
    const material = materials?.find((m: any) => m.id === materialId)
    return material?.name.toLowerCase().includes('cylinder')
  }

  // Auto calculate unit price from bulk price
  const calculateUnitPrice = (quantity: string, totalCost: string) => {
    if (quantity && totalCost) {
      const qty = parseFloat(quantity)
      const cost = parseFloat(totalCost)
      if (qty > 0) {
        return (cost / qty).toFixed(2)
      }
    }
    return ''
  }

  // Auto calculate total cost from unit price
  const calculateTotalCost = (quantity: string, unitPrice: string) => {
    if (quantity && unitPrice) {
      const qty = parseFloat(quantity)
      const price = parseFloat(unitPrice)
      return (qty * price).toFixed(2)
    }
    return ''
  }

  const removePurchaseItem = (index: number) => {
    setPurchaseItems(purchaseItems.filter((_, i) => i !== index))
  }

  const updatePurchaseItem = (
    index: number,
    field: keyof PurchaseItem,
    value: string
  ) => {
    const updated = [...purchaseItems]
    updated[index] = { ...updated[index], [field]: value }
    
    // Auto calculate when bulk price is entered
    if (field === 'totalCost' && value) {
      const calculatedUnitPrice = calculateUnitPrice(
        updated[index].quantity,
        value
      )
      if (calculatedUnitPrice) {
        updated[index].unitPrice = calculatedUnitPrice
      }
    }
    
    // Auto calculate when unit price is entered
    if (field === 'unitPrice' && value) {
      const calculatedTotal = calculateTotalCost(
        updated[index].quantity,
        value
      )
      if (calculatedTotal) {
        updated[index].totalCost = calculatedTotal
      }
    }
    
    // Auto calculate when quantity changes
    if (field === 'quantity' && value) {
      if (updated[index].totalCost) {
        const calculatedUnitPrice = calculateUnitPrice(
          value,
          updated[index].totalCost
        )
        if (calculatedUnitPrice) {
          updated[index].unitPrice = calculatedUnitPrice
        }
      } else if (updated[index].unitPrice) {
        const calculatedTotal = calculateTotalCost(
          value,
          updated[index].unitPrice
        )
        if (calculatedTotal) {
          updated[index].totalCost = calculatedTotal
        }
      }
    }
    
    setPurchaseItems(updated)
  }

  const handleEditPurchase = async (purchase: any) => {
    setEditingPurchase({
      id: purchase.id,
      rawMaterialId: purchase.rawMaterialId,
      quantity: purchase.quantity,
      unit: purchase.unit,
      unitPrice: purchase.unitPrice,
      totalCost: purchase.totalCost,
      purchaseDate: new Date(purchase.purchaseDate).toISOString().split('T')[0],
      gasCylinderQty: purchase.gasCylinderQty,
    })
  }

  const handleUpdatePurchase = async () => {
    if (!editingPurchase) return

    try {
      const res = await fetch(`/api/purchases/${editingPurchase.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingPurchase),
      })

      if (res.ok) {
        mutate()
        setEditingPurchase(null)
        alert('Purchase updated successfully!')
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to update purchase')
      }
    } catch (error) {
      alert('Failed to update purchase')
    }
  }

  const handleDeletePurchase = async (id: string) => {
    if (!confirm('Are you sure you want to delete this purchase?')) return

    try {
      const res = await fetch(`/api/purchases/${id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        mutate()
        alert('Purchase deleted successfully!')
      } else {
        alert('Failed to delete purchase')
      }
    } catch (error) {
      alert('Failed to delete purchase')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const purchases = purchaseItems
        .filter((item) => item.materialId && item.quantity && (item.unitPrice || item.totalCost))
        .map((item) => {
          let unitPrice = parseFloat(item.unitPrice || '0')
          let totalCost = parseFloat(item.totalCost || '0')
          const quantity = parseFloat(item.quantity)
          const gasCylinderQty = item.gasCylinderQty ? parseFloat(item.gasCylinderQty) : undefined
          
          // If total cost is provided, calculate unit price
          if (totalCost && quantity > 0 && !unitPrice) {
            unitPrice = totalCost / quantity
          }
          // If unit price is provided, calculate total cost
          else if (unitPrice && quantity > 0 && !totalCost) {
            totalCost = unitPrice * quantity
          }
          
          return {
            materialId: item.materialId,
            quantity: quantity,
            unit: item.unit,
            unitPrice: unitPrice,
            gasCylinderQty: gasCylinderQty,
          }
        })

      if (purchases.length === 0) {
        alert('Please add at least one purchase item')
        return
      }

      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchases }),
      })

      if (res.ok) {
        mutate()
        setPurchaseItems([{ materialId: '', quantity: '', unit: 'kg', unitPrice: '', totalCost: '', gasCylinderQty: '' }])
        setShowForm(false)
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to create purchase')
      }
    } catch (error) {
      alert('Failed to create purchase')
    }
  }

  const filteredPurchases = purchases?.filter((p: any) => {
    // Search filter
    const matchesSearch = p.rawMaterialName.toLowerCase().includes(searchTerm.toLowerCase())
    if (!matchesSearch) return false

    // Date filter
    const purchaseDate = new Date(p.purchaseDate)
    const now = new Date()
    
    if (filterType === 'today') {
      return purchaseDate.toDateString() === now.toDateString()
    }
    
    if (filterType === 'week') {
      const weekStart = startOfWeek(now)
      return purchaseDate >= weekStart
    }
    
    if (filterType === 'month') {
      const monthStart = startOfMonth(now)
      return purchaseDate >= monthStart
    }

    // Selected date filter
    if (selectedDate) {
      const selected = new Date(selectedDate)
      return purchaseDate.toDateString() === selected.toDateString()
    }
    
    return true
  }) || []

  const totalCost = filteredPurchases.reduce((sum: number, p: any) => sum + p.totalCost, 0)

  const handlePrint = () => {
    window.print()
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 print:space-y-0">
        <div className="flex justify-between items-center no-print">
          <h2 className="text-2xl font-bold text-gray-800">Purchase Entry</h2>
          <div className="flex gap-2">
            <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-1">
              <Filter size={16} />
              <select
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value as any)
                  setSelectedDate('')
                }}
                className="border-0 focus:ring-0 text-sm"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>
            <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-1">
              <Calendar size={16} />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value)
                  setFilterType('all')
                }}
                className="border-0 focus:ring-0 text-sm"
              />
            </div>
            {filteredPurchases.length > 0 && (
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                <Printer size={18} />
                Print
              </button>
            )}
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              <Plus size={20} />
              New Purchase
            </button>
          </div>
        </div>

        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 no-print">
            <h3 className="text-lg font-semibold mb-4">Add Purchase Entry</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              {purchaseItems.map((item, index) => (
                <div
                  key={index}
                  className={`grid ${isCylinder(item.materialId) ? 'md:grid-cols-6' : 'md:grid-cols-5'} gap-4 p-4 border border-gray-200 rounded-lg`}
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Material
                    </label>
                    <select
                      required
                      value={item.materialId}
                      onChange={(e) =>
                        updatePurchaseItem(index, 'materialId', e.target.value)
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={item.quantity}
                      onChange={(e) =>
                        updatePurchaseItem(index, 'quantity', e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unit
                    </label>
                    <select
                      required
                      value={item.unit}
                      onChange={(e) =>
                        updatePurchaseItem(index, 'unit', e.target.value)
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
                      Bulk Price (₹) - Total
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={item.totalCost}
                      onChange={(e) =>
                        updatePurchaseItem(index, 'totalCost', e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="e.g., 2100"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Enter total price for bulk purchase
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price/Unit (₹) - Auto
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={item.unitPrice}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                      placeholder="Auto calculated"
                    />
                    <p className="text-xs text-green-600 mt-1">
                      {item.unitPrice ? `₹${parseFloat(item.unitPrice).toFixed(2)} per ${item.unit}` : 'Auto calculated'}
                    </p>
                  </div>
                  {isCylinder(item.materialId) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Gas Cylinder Qty (kg)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.gasCylinderQty}
                        onChange={(e) =>
                          updatePurchaseItem(index, 'gasCylinderQty', e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        placeholder="e.g., 19"
                      />
                    </div>
                  )}
                  <div className="flex items-end">
                    {purchaseItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePurchaseItem(index)}
                        className="w-full px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                      >
                        <X size={20} className="mx-auto" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={addPurchaseItem}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Add More Items
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Save Purchase
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                  setPurchaseItems([
                    { materialId: '', quantity: '', unit: 'kg', unitPrice: '', totalCost: '', gasCylinderQty: '' },
                  ])
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {editingPurchase && (
          <div className="bg-white rounded-lg shadow-lg border-2 border-blue-500 p-6 no-print">
            <h3 className="text-lg font-semibold mb-4">Edit Purchase</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editingPurchase.quantity}
                  onChange={(e) =>
                    setEditingPurchase({
                      ...editingPurchase,
                      quantity: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit
                </label>
                <select
                  value={editingPurchase.unit}
                  onChange={(e) =>
                    setEditingPurchase({
                      ...editingPurchase,
                      unit: e.target.value,
                    })
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
                  Total Cost (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editingPurchase.totalCost}
                  onChange={(e) => {
                    const total = parseFloat(e.target.value) || 0
                    const unitPrice = editingPurchase.quantity > 0
                      ? total / editingPurchase.quantity
                      : 0
                    setEditingPurchase({
                      ...editingPurchase,
                      totalCost: total,
                      unitPrice: unitPrice,
                    })
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit Price (₹) - Auto
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editingPurchase.unitPrice.toFixed(2)}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
                <p className="text-xs text-green-600 mt-1">
                  ₹{editingPurchase.unitPrice.toFixed(2)} per {editingPurchase.unit}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Purchase Date
                </label>
                <input
                  type="date"
                  value={editingPurchase.purchaseDate}
                  onChange={(e) =>
                    setEditingPurchase({
                      ...editingPurchase,
                      purchaseDate: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              {editingPurchase.rawMaterialId && materials?.find((m: any) => m.id === editingPurchase.rawMaterialId)?.name.toLowerCase().includes('cylinder') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gas Cylinder Qty (kg)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingPurchase.gasCylinderQty || ''}
                    onChange={(e) =>
                      setEditingPurchase({
                        ...editingPurchase,
                        gasCylinderQty: parseFloat(e.target.value) || undefined,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g., 19"
                  />
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleUpdatePurchase}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Update Purchase
              </button>
              <button
                onClick={() => setEditingPurchase(null)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-4 no-print">
          <div className="flex gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search purchases by material name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>

        {(filterType !== 'all' || selectedDate) && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 no-print">
            <p className="text-sm text-blue-800">
              Showing purchases for{' '}
              <strong>
                {selectedDate
                  ? format(new Date(selectedDate), 'MMM dd, yyyy')
                  : filterType === 'today'
                  ? 'today'
                  : filterType === 'week'
                  ? 'this week'
                  : filterType === 'month'
                  ? 'this month'
                  : 'all time'}
              </strong>
              . Total: ₹{totalCost.toFixed(2)}
            </p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden print:shadow-none">
          <div className="hidden print:block text-center py-3 print:py-2 print:mb-2">
            <h3 className="text-2xl font-bold print:text-xl" style={{ color: '#dc2626' }}>
              RISHA FOODS AND BAKERY
            </h3>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Material
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unit Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Cost
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Remaining
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gas Cyl Qty
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider no-print">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPurchases.map((purchase: any) => (
                <tr key={purchase.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(purchase.purchaseDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {purchase.rawMaterialName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {purchase.quantity} {purchase.unit}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ₹{purchase.unitPrice}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ₹{purchase.totalCost.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {purchase.remainingQty.toFixed(2)} {purchase.unit}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {purchase.gasCylinderQty ? `${purchase.gasCylinderQty} kg` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm no-print">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditPurchase(purchase)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Edit"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeletePurchase(purchase.id)}
                        className="text-red-600 hover:text-red-800"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredPurchases.length > 0 && (
                <tr className="bg-gray-50 font-semibold">
                  <td colSpan={4} className="px-6 py-4 text-right">
                    Total:
                  </td>
                  <td className="px-6 py-4 text-sm">₹{totalCost.toFixed(2)}</td>
                  <td></td>
                  <td></td>
                  <td></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  )
}
