'use client'

import { useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { Plus, X, Printer, Filter, Edit, Trash2, Search, Calendar, BarChart3, ChevronDown, ChevronUp, Maximize2, Minimize2 } from 'lucide-react'
import useSWR from 'swr'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths } from 'date-fns'
import { fastFetcher, fastSWRConfig } from '@/lib/fast-fetcher'

// Interactive Purchase Chart Component
function PurchaseChartComponent({ items, materials }: { items: any[], materials: any }) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [viewMode, setViewMode] = useState<'cost' | 'quantity' | 'count'>('cost')
  const [maxItems, setMaxItems] = useState(10)

  // Ensure materials is always an array
  const materialsArray = Array.isArray(materials) ? materials : []

  const sortedItems = [...items].sort((a, b) => {
    if (viewMode === 'cost') return b.totalCost - a.totalCost
    if (viewMode === 'quantity') return b.totalQty - a.totalQty
    return b.count - a.count
  }).slice(0, maxItems)

  const maxValue = sortedItems[0] ? 
    (viewMode === 'cost' ? sortedItems[0].totalCost : 
     viewMode === 'quantity' ? sortedItems[0].totalQty : 
     sortedItems[0].count) : 1

  if (!isExpanded) {
    return (
      <div className="bg-white rounded-lg shadow p-4 no-print">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary-600" />
            <h3 className="text-lg font-semibold text-gray-800">Purchase Analytics</h3>
            <span className="text-sm text-gray-500">({items.length} items)</span>
          </div>
          <button
            onClick={() => setIsExpanded(true)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronDown size={20} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 no-print">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-primary-600" />
          <h3 className="text-lg font-semibold text-gray-800">Purchase Analytics</h3>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as any)}
            className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
          >
            <option value="cost">By Cost</option>
            <option value="quantity">By Quantity</option>
            <option value="count">By Count</option>
          </select>
          <select
            value={maxItems}
            onChange={(e) => setMaxItems(Number(e.target.value))}
            className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
          >
            <option value={5}>Top 5</option>
            <option value={10}>Top 10</option>
            <option value={20}>Top 20</option>
            <option value={items.length}>All</option>
          </select>
          <button
            onClick={() => setIsExpanded(false)}
            className="p-2 hover:bg-gray-100 rounded-lg"
            title="Collapse"
          >
            <ChevronUp size={20} />
          </button>
        </div>
      </div>
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {sortedItems.map((item, idx) => {
          const value = viewMode === 'cost' ? item.totalCost : viewMode === 'quantity' ? item.totalQty : item.count
          const percentage = (value / maxValue) * 100
          const displayValue = viewMode === 'cost' ? `₹${value.toFixed(2)}` : 
                              viewMode === 'quantity' ? `${value.toFixed(2)} ${Array.isArray(materialsArray) ? (materialsArray.find((m: any) => m.name === item.name)?.unit || '') : ''}` :
                              `${value} purchase${value > 1 ? 's' : ''}`
          return (
            <div key={idx} className="space-y-1 p-2 hover:bg-gray-50 rounded-lg transition-colors">
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium text-gray-700">{item.name}</span>
                <span className="text-gray-600 font-semibold">{displayValue}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-6 relative">
                <div
                  className={`h-6 rounded-full transition-all ${
                    viewMode === 'cost' ? 'bg-primary-600' :
                    viewMode === 'quantity' ? 'bg-blue-600' :
                    'bg-green-600'
                  }`}
                  style={{ width: `${percentage}%` }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-gray-700">
                  {percentage.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Qty: {item.totalQty.toFixed(2)} {Array.isArray(materialsArray) ? (materialsArray.find((m: any) => m.name === item.name)?.unit || '') : ''}</span>
                <span>Purchases: {item.count}</span>
                {viewMode === 'cost' && <span>Cost: ₹{item.totalCost.toFixed(2)}</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

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
  const { data: materialsData } = useSWR('/api/raw-materials', fastFetcher, fastSWRConfig)
  const { data: purchases, mutate } = useSWR('/api/purchases', fastFetcher, fastSWRConfig)
  
  // Ensure materials is always an array
  const materials = Array.isArray(materialsData) ? materialsData : []
  
  // Enrich purchases with material names
  const enrichedPurchases = Array.isArray(purchases) 
    ? purchases.map((p: any) => {
        const material = materials.find((m: any) => m.id === p.rawMaterialId)
        return {
          ...p,
          rawMaterialName: material?.name || p.rawMaterialName || 'Unknown Material',
        }
      })
    : []
  const [showForm, setShowForm] = useState(false)
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([
    { materialId: '', quantity: '', unit: 'kg', unitPrice: '', totalCost: '', gasCylinderQty: '' },
  ])
  const [filterType, setFilterType] = useState<'all' | 'today' | 'week' | 'month'>('all')
  const [materialTypeFilter, setMaterialTypeFilter] = useState<'all' | 'raw_material' | 'essential'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [editingPurchase, setEditingPurchase] = useState<EditingPurchase | null>(null)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())

  const addPurchaseItem = () => {
    setPurchaseItems([
      ...purchaseItems,
      { materialId: '', quantity: '', unit: 'kg', unitPrice: '', totalCost: '', gasCylinderQty: '' },
    ])
  }

  const isCylinder = (materialId: string) => {
    if (!Array.isArray(materials)) return false
    const material = materials.find((m: any) => m.id === materialId)
    return material?.name?.toLowerCase().includes('cylinder')
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
      // Optimistic update - remove immediately
      const updatedPurchases = purchases?.filter((p: any) => p.id !== id)
      await mutate(updatedPurchases, false)
      
      const res = await fetch(`/api/purchases/${id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        // Notify deleted items page
        window.dispatchEvent(new CustomEvent('purchase-deleted', { detail: { id } }))
        
        // Final revalidate
        await mutate()
        
        console.log('✅ Purchase deleted and synced')
      } else {
        // Revert on error
        await mutate()
        alert('Failed to delete purchase')
      }
    } catch (error) {
      // Revert on error
      await mutate()
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

  // Ensure purchases is always an array
  const purchasesList = Array.isArray(purchases) ? purchases : []

  const filteredPurchases = purchasesList.filter((p: any) => {
    // Safety check: ensure purchase has required fields
    if (!p || !p.id || !p.rawMaterialName) {
      return false
    }

    // Material type filter (Raw Material vs Essential)
    if (materialTypeFilter !== 'all') {
      const material = Array.isArray(materials) ? materials.find((m: any) => m.id === p.rawMaterialId) : null
      if (materialTypeFilter === 'essential') {
        if (!material || !material.isEssential) return false
      } else if (materialTypeFilter === 'raw_material') {
        if (!material || material.isEssential) return false
      }
    }

    // Search filter
    const materialName = String(p.rawMaterialName || '').toLowerCase()
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch = materialName.includes(searchLower)
    if (!matchesSearch) return false

    // Date filter
    if (!p.purchaseDate) return true // Include if no date (shouldn't happen, but safety)
    
    const purchaseDate = new Date(p.purchaseDate)
    if (isNaN(purchaseDate.getTime())) return true // Invalid date, include it
    
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
  })

  const totalCost = filteredPurchases.reduce((sum: number, p: any) => sum + p.totalCost, 0)

  const handlePrint = () => {
    window.print()
  }

  // Calculate most purchased items
  const purchaseStats: Record<string, { name: string; totalQty: number; totalCost: number; count: number }> = {}
  purchasesList.forEach((p: any) => {
    if (!p.rawMaterialName) return
    if (!purchaseStats[p.rawMaterialId]) {
      purchaseStats[p.rawMaterialId] = {
        name: p.rawMaterialName,
        totalQty: 0,
        totalCost: 0,
        count: 0,
      }
    }
    purchaseStats[p.rawMaterialId].totalQty += parseFloat(p.quantity) || 0
    purchaseStats[p.rawMaterialId].totalCost += parseFloat(p.totalCost) || 0
    purchaseStats[p.rawMaterialId].count += 1
  })

  const topPurchasedItems = Object.values(purchaseStats)
    .sort((a, b) => b.totalCost - a.totalCost)
    .slice(0, 10)

  return (
    <DashboardLayout>
      <div className="space-y-6 print:space-y-0">
        <div className="flex justify-between items-center no-print">
          <h2 className="text-2xl font-bold text-gray-800">Purchase Entry</h2>
          <div className="flex gap-2 flex-wrap">
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
            <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-1 bg-white">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Material Type:</label>
              <select
                value={materialTypeFilter}
                onChange={(e) => setMaterialTypeFilter(e.target.value as 'all' | 'raw_material' | 'essential')}
                className="border-0 focus:ring-0 text-sm"
              >
                <option value="all">All Materials</option>
                <option value="raw_material">Raw Materials</option>
                <option value="essential">Essential Items</option>
              </select>
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
                    {item.materialId && (() => {
                      const material = Array.isArray(materials) ? materials.find((m: any) => m.id === item.materialId) : null
                      const currentStock = material?.currentStock || 0
                      const lowStockLimit = 10 // Default low stock limit
                      const isLowStock = currentStock < lowStockLimit
                      return (
                        <div className={`mt-2 p-2 rounded-lg text-xs ${isLowStock ? 'bg-orange-50 border border-orange-200' : 'bg-green-50 border border-green-200'}`}>
                          <p className={`font-semibold ${isLowStock ? 'text-orange-800' : 'text-green-800'}`}>
                            Current Stock: {currentStock.toFixed(2)} {material?.unit || ''}
                          </p>
                          <p className="text-gray-600 mt-1">
                            Low Stock Alert Limit: {lowStockLimit} {material?.unit || ''}
                          </p>
                          {isLowStock && (
                            <p className="text-orange-700 font-semibold mt-1">
                              ⚠️ Low Stock - Please restock!
                            </p>
                          )}
                        </div>
                      )
                    })()}
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
              {editingPurchase.rawMaterialId && Array.isArray(materials) && materials.find((m: any) => m.id === editingPurchase.rawMaterialId)?.name?.toLowerCase().includes('cylinder') && (
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

        {/* Purchase Chart - Interactive */}
        {topPurchasedItems.length > 0 && Array.isArray(materials) && (
          <PurchaseChartComponent items={topPurchasedItems} materials={materials} />
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
                <th className="px-4 py-3 text-left no-print">
                  <input
                    type="checkbox"
                    checked={filteredPurchases.length > 0 && selectedItems.size === filteredPurchases.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                </th>
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" suppressHydrationWarning>
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
