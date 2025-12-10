'use client'

import { DashboardLayout } from '@/components/DashboardLayout'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface Supplier {
  id: string
  name: string
}

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

interface PurchaseItem {
  itemId: string
  itemName: string
  quantity: number
  unitId: string
  unitSymbol: string
  unitPrice: number
  lineTotal: number
}

export default function NewPurchasePage() {
  const router = useRouter()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [allUnits, setAllUnits] = useState<Array<{ id: string; symbol: string }>>([])
  const [loading, setLoading] = useState(false)
  // Get today's date in local timezone (YYYY-MM-DD format)
  const getTodayDate = () => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const [formData, setFormData] = useState({
    date: getTodayDate(),
    supplierId: '',
    newSupplierName: '', // For entering new shop name
    notes: '',
  })
  const [useNewSupplier, setUseNewSupplier] = useState(false)
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([])

  useEffect(() => {
    fetchSuppliers()
    fetchItems()
    fetchAllUnits()
  }, [])

  const fetchSuppliers = async () => {
    try {
      const response = await fetch('/api/suppliers')
      const data = await response.json()
      setSuppliers(data)
    } catch (error) {
      console.error('Failed to fetch suppliers:', error)
    }
  }

  const fetchItems = async () => {
    try {
      const response = await fetch('/api/items')
      const data = await response.json()
      console.log('Fetched items:', data)
      setItems(data)
    } catch (error) {
      console.error('Failed to fetch items:', error)
    }
  }

  const fetchAllUnits = async () => {
    try {
      const response = await fetch('/api/units')
      const data = await response.json()
      setAllUnits(Array.isArray(data) ? data.map((u: any) => ({ id: u.id, symbol: u.symbol })) : [])
    } catch (error) {
      console.error('Failed to fetch all units:', error)
    }
  }

  const addPurchaseItem = () => {
    setPurchaseItems([
      ...purchaseItems,
      {
        itemId: '',
        itemName: '',
        quantity: 0,
        unitId: '',
        unitSymbol: '',
        unitPrice: 0,
        lineTotal: 0,
      },
    ])
  }

  const removePurchaseItem = (index: number) => {
    setPurchaseItems(purchaseItems.filter((_, i) => i !== index))
  }

  const updatePurchaseItem = (index: number, updates: Partial<PurchaseItem>) => {
    const updated = [...purchaseItems]
    updated[index] = { ...updated[index], ...updates }
    
    // Update item name when item changes
    if (updates.itemId) {
      const item = items.find((i) => i.id === updates.itemId)
      if (item && item.baseUnit) {
        updated[index].itemName = item.name
        // Always set to base unit when item changes
        updated[index].unitId = item.baseUnit.id
        updated[index].unitSymbol = item.baseUnit.symbol
      }
    }

    // Bidirectional calculation:
    // If lineTotal (Total Amount) is updated, calculate unitPrice
    if (updates.lineTotal !== undefined) {
      const qty = updated[index].quantity
      if (qty > 0) {
        updated[index].unitPrice = updated[index].lineTotal / qty
      }
    }
    // If unitPrice is updated, calculate lineTotal
    else if (updates.unitPrice !== undefined) {
      updated[index].lineTotal = updated[index].quantity * updated[index].unitPrice
    }
    // If quantity is updated, recalculate lineTotal from unitPrice
    else if (updates.quantity !== undefined) {
      updated[index].lineTotal = updated[index].quantity * updated[index].unitPrice
    }

    setPurchaseItems(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate date - must be a valid date and not in the future
      if (!formData.date) {
        alert('Please select a date')
        setLoading(false)
        return
      }

      const selectedDate = new Date(formData.date)
      const today = new Date()
      today.setHours(23, 59, 59, 999) // End of today

      if (isNaN(selectedDate.getTime())) {
        alert('Invalid date selected')
        setLoading(false)
        return
      }

      if (selectedDate > today) {
        alert('Purchase date cannot be in the future. Please select today or a past date.')
        setLoading(false)
        return
      }

      // Validate supplier
      if (!useNewSupplier && !formData.supplierId) {
        alert('Please select a supplier or enter a shop name')
        setLoading(false)
        return
      }

      if (useNewSupplier && !formData.newSupplierName.trim()) {
        alert('Please enter a shop/supplier name')
        setLoading(false)
        return
      }

      // Validate items
      if (purchaseItems.length === 0) {
        alert('Please add at least one item')
        setLoading(false)
        return
      }

      // Validate each item
      for (let i = 0; i < purchaseItems.length; i++) {
        const item = purchaseItems[i]
        if (!item.itemId) {
          alert(`Please select an item for Item ${i + 1}`)
          setLoading(false)
          return
        }
        if (!item.unitId) {
          alert(`Please select a unit for Item ${i + 1}`)
          setLoading(false)
          return
        }
        if (!item.quantity || item.quantity <= 0) {
          alert(`Please enter a valid quantity for Item ${i + 1}`)
          setLoading(false)
          return
        }
        // Either unitPrice OR lineTotal must be entered
        if ((!item.unitPrice || item.unitPrice <= 0) && (!item.lineTotal || item.lineTotal <= 0)) {
          alert(`Please enter either unit price or total amount for Item ${i + 1}`)
          setLoading(false)
          return
        }
        // Ensure both are calculated if one is missing
        if (item.quantity > 0) {
          if (item.unitPrice > 0 && (!item.lineTotal || item.lineTotal <= 0)) {
            // Calculate lineTotal from unitPrice
            purchaseItems[i].lineTotal = item.quantity * item.unitPrice
          } else if (item.lineTotal > 0 && (!item.unitPrice || item.unitPrice <= 0)) {
            // Calculate unitPrice from lineTotal
            purchaseItems[i].unitPrice = item.lineTotal / item.quantity
          }
        }
      }

      // If new supplier name is entered, create supplier first
      let finalSupplierId = formData.supplierId
      
      if (useNewSupplier && formData.newSupplierName.trim()) {
        const supplierResponse = await fetch('/api/suppliers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.newSupplierName.trim(),
          }),
        })
        
        if (!supplierResponse.ok) {
          const errorData = await supplierResponse.json().catch(() => ({}))
          alert(errorData.error || 'Failed to create supplier')
          setLoading(false)
          return
        }
        
        const newSupplier = await supplierResponse.json()
        finalSupplierId = newSupplier.id
      }

      // Format date properly (YYYY-MM-DD) to avoid timezone issues
      const dateStr = formData.date // Already in YYYY-MM-DD format from input type="date"
      const [year, month, day] = dateStr.split('-').map(Number)
      const purchaseDate = new Date(year, month - 1, day) // Create date in local timezone
      purchaseDate.setHours(12, 0, 0, 0) // Set to noon to avoid timezone issues

      const response = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: purchaseDate.toISOString().split('T')[0], // Send as YYYY-MM-DD
          supplierId: finalSupplierId,
          notes: formData.notes,
          items: purchaseItems.map((item) => ({
            itemId: item.itemId,
            quantity: item.quantity,
            unitId: item.unitId,
            unitPrice: item.unitPrice,
          })),
        }),
      })

      if (response.ok) {
        router.push('/purchases')
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to create purchase')
      }
    } catch (error: any) {
      console.error('Failed to create purchase:', error)
      alert(`Failed to create purchase: ${error?.message || 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const totalAmount = purchaseItems.reduce((sum, item) => sum + item.lineTotal, 0)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href="/purchases"
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h2 className="text-3xl font-bold text-gray-900">New Purchase</h2>
            <p className="text-gray-600 mt-1">Record a new purchase</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date *
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => {
                  const selectedDate = e.target.value
                  const today = getTodayDate() // Use local timezone date
                  
                  // Validate date
                  if (selectedDate > today) {
                    alert('Purchase date cannot be in the future. Please select today or a past date.')
                    return
                  }
                  
                  setFormData({ ...formData, date: selectedDate })
                }}
                max={getTodayDate()} // Prevent future dates - use local timezone
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Supplier *
              </label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="selectSupplier"
                    name="supplierType"
                    checked={!useNewSupplier}
                    onChange={() => {
                      setUseNewSupplier(false)
                      setFormData({ ...formData, supplierId: '', newSupplierName: '' })
                    }}
                    className="text-primary focus:ring-primary"
                  />
                  <label htmlFor="selectSupplier" className="text-sm text-gray-700">
                    Select from list
                  </label>
                </div>
                {!useNewSupplier && (
                  <select
                    value={formData.supplierId}
                    onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                    required={!useNewSupplier}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select supplier</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                )}
                
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="newSupplier"
                    name="supplierType"
                    checked={useNewSupplier}
                    onChange={() => {
                      setUseNewSupplier(true)
                      setFormData({ ...formData, supplierId: '', newSupplierName: '' })
                    }}
                    className="text-primary focus:ring-primary"
                  />
                  <label htmlFor="newSupplier" className="text-sm text-gray-700">
                    Enter shop name
                  </label>
                </div>
                {useNewSupplier && (
                  <input
                    type="text"
                    value={formData.newSupplierName}
                    onChange={(e) => setFormData({ ...formData, newSupplierName: e.target.value })}
                    placeholder="Enter shop/supplier name"
                    required={useNewSupplier}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                )}
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-4 mb-4">
              <button
                type="button"
                onClick={addPurchaseItem}
                className="flex items-center gap-2 text-sm bg-primary text-white px-4 py-2 rounded-md hover:bg-opacity-90"
              >
                <Plus className="h-4 w-4" />
                Add Item
              </button>
              <label className="block text-sm font-medium text-gray-700">
                Items *
              </label>
            </div>

            {purchaseItems.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No items added. Click &quot;Add Item&quot; to start.
              </p>
            ) : (
              <div className="space-y-4">
                {purchaseItems.map((item, index) => {
                  const selectedItem = items.find((i) => i.id === item.itemId)
                  // Calculate available units - show ALL units from system for flexibility
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
                    const itemUnits = (selectedItem.itemUnits || []).filter((iu) => iu && iu.unit)
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
                    
                    console.log('Available units for item:', selectedItem.name, 'total units:', availableUnits.length)
                  }

                  return (
                    <div
                      key={index}
                      className="border border-gray-200 rounded-md p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-900">Item {index + 1}</h4>
                        <button
                          type="button"
                          onClick={() => removePurchaseItem(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Item
                          </label>
                          <select
                            value={item.itemId}
                            onChange={(e) =>
                              updatePurchaseItem(index, { itemId: e.target.value })
                            }
                            required
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            <option value="">Select item</option>
                            {items.map((i) => (
                              <option key={i.id} value={i.id}>
                                {i.name} {i.sku ? `(${i.sku})` : ''}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Quantity
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={item.quantity || ''}
                              onChange={(e) =>
                                updatePurchaseItem(index, {
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
                              value={item.unitId}
                              onChange={(e) => {
                                const unit = availableUnits.find(
                                  (u) => u.unit.id === e.target.value
                                )
                                updatePurchaseItem(index, {
                                  unitId: e.target.value,
                                  unitSymbol: unit?.unit.symbol || '',
                                })
                              }}
                              required
                              disabled={!selectedItem}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
                            >
                              <option value="">
                                {selectedItem ? 'Select unit' : 'Select item first'}
                              </option>
                              {availableUnits.length > 0 ? (
                                availableUnits.map((u) => (
                                  <option key={u.unit.id} value={u.unit.id}>
                                    {u.unit.symbol}
                                  </option>
                                ))
                              ) : (
                                selectedItem && (
                                  <option value="" disabled>
                                    No units available
                                  </option>
                                )
                              )}
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Unit Price
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.unitPrice || ''}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value) || 0
                              updatePurchaseItem(index, {
                                unitPrice: value,
                              })
                            }}
                            placeholder="Enter unit price"
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            {item.quantity > 0 && item.unitPrice > 0
                              ? `Total: ${formatCurrency(item.lineTotal)}`
                              : 'Enter unit price'}
                          </p>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Total Amount
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.lineTotal || ''}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value) || 0
                              updatePurchaseItem(index, {
                                lineTotal: value,
                              })
                            }}
                            placeholder="Enter total amount"
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            {item.quantity > 0 && item.lineTotal > 0
                              ? `Per unit: ${formatCurrency(item.unitPrice)}`
                              : 'Enter total amount'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div>
              <p className="text-sm text-gray-600">Total Amount</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(totalAmount)}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={loading || purchaseItems.length === 0}
              className="bg-primary text-white px-6 py-2 rounded-md hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Purchase'}
            </button>
            <Link
              href="/purchases"
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

