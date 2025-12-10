'use client'

import { DashboardLayout } from '@/components/DashboardLayout'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
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

export default function EditPurchasePage() {
  const router = useRouter()
  const params = useParams()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [allUnits, setAllUnits] = useState<Array<{ id: string; symbol: string }>>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

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
    newSupplierName: '',
    notes: '',
  })
  const [useNewSupplier, setUseNewSupplier] = useState(false)
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([])

  useEffect(() => {
    if (params.id) {
      fetchSuppliers()
      fetchItems()
      fetchAllUnits()
      fetchPurchase()
    }
  }, [params.id])

  const fetchPurchase = async () => {
    try {
      const response = await fetch(`/api/purchases/${params.id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch purchase')
      }
      const data = await response.json()
      
      // Format date for input field
      const purchaseDate = new Date(data.date)
      const year = purchaseDate.getFullYear()
      const month = String(purchaseDate.getMonth() + 1).padStart(2, '0')
      const day = String(purchaseDate.getDate()).padStart(2, '0')
      const formattedDate = `${year}-${month}-${day}`

      setFormData({
        date: formattedDate,
        supplierId: data.supplierId,
        newSupplierName: '',
        notes: data.notes || '',
      })
      setUseNewSupplier(false)

      // Convert purchase items to form format
      const items: PurchaseItem[] = data.items.map((item: any) => ({
        itemId: item.itemId,
        itemName: item.item.name,
        quantity: item.quantity,
        unitId: item.unitId,
        unitSymbol: item.unit.symbol,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
      }))
      setPurchaseItems(items)
    } catch (error) {
      console.error('Failed to fetch purchase:', error)
      setError('Failed to load purchase details')
    } finally {
      setLoading(false)
    }
  }

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

    // Update item name when item is selected
    if (updates.itemId) {
      const selectedItem = items.find((i) => i.id === updates.itemId)
      if (selectedItem) {
        updated[index].itemName = selectedItem.name
        // Set default unit to base unit if not set
        if (!updated[index].unitId && selectedItem.baseUnit) {
          updated[index].unitId = selectedItem.baseUnit.id
          updated[index].unitSymbol = selectedItem.baseUnit.symbol
        }
      }
    }

    // Update unit symbol when unit is selected
    if (updates.unitId) {
      const selectedUnit = allUnits.find((u) => u.id === updates.unitId)
      if (selectedUnit) {
        updated[index].unitSymbol = selectedUnit.symbol
      }
    }

    // Bidirectional calculation for lineTotal and unitPrice
    const currentItem = updated[index]
    const quantity = currentItem.quantity || 0
    let unitPrice = currentItem.unitPrice || 0
    let lineTotal = currentItem.lineTotal || 0

    if (updates.lineTotal !== undefined) {
      lineTotal = updates.lineTotal
      if (quantity > 0) {
        unitPrice = lineTotal / quantity
      } else {
        unitPrice = 0
      }
    } else if (updates.unitPrice !== undefined) {
      unitPrice = updates.unitPrice
      lineTotal = quantity * unitPrice
    } else if (updates.quantity !== undefined) {
      lineTotal = quantity * unitPrice
    }

    updated[index] = {
      ...currentItem,
      quantity,
      unitPrice,
      lineTotal,
    }

    setPurchaseItems(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    // Validation
    if (!formData.date) {
      setError('Date is required')
      setSaving(false)
      return
    }

    if (!formData.supplierId && !useNewSupplier) {
      setError('Please select a supplier or enter a new supplier name')
      setSaving(false)
      return
    }

    if (purchaseItems.length === 0) {
      setError('At least one item is required')
      setSaving(false)
      return
    }

    for (let i = 0; i < purchaseItems.length; i++) {
      const item = purchaseItems[i]
      if (!item.itemId || !item.unitId || item.quantity <= 0) {
        setError(`Item ${i + 1}: Please fill all required fields`)
        setSaving(false)
        return
      }
      if (item.unitPrice <= 0 && item.lineTotal <= 0) {
        setError(`Item ${i + 1}: Please enter unit price or total amount`)
        setSaving(false)
        return
      }
    }

    try {
      let finalSupplierId = formData.supplierId

      // Create new supplier if needed
      if (useNewSupplier && formData.newSupplierName.trim()) {
        const supplierResponse = await fetch('/api/suppliers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: formData.newSupplierName.trim() }),
        })

        if (!supplierResponse.ok) {
          const errorData = await supplierResponse.json().catch(() => ({}))
          throw new Error(errorData.error || 'Failed to create supplier')
        }

        const newSupplier = await supplierResponse.json()
        finalSupplierId = newSupplier.id
      }

      // Prepare items for API
      const itemsForAPI = purchaseItems.map((item) => ({
        itemId: item.itemId,
        unitId: item.unitId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      }))

      const response = await fetch(`/api/purchases/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: formData.date,
          supplierId: finalSupplierId,
          notes: formData.notes,
          items: itemsForAPI,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update purchase')
      }

      alert('Purchase updated successfully')
      router.push('/purchases')
    } catch (error: any) {
      console.error('Failed to update purchase:', error)
      setError(error.message || 'Failed to update purchase')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center text-gray-500">Loading purchase details...</div>
      </DashboardLayout>
    )
  }

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
            <h2 className="text-3xl font-bold text-gray-900">Edit Purchase</h2>
            <p className="text-gray-600 mt-1">Update purchase record</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date *
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => {
                  const selectedDate = e.target.value
                  const today = getTodayDate()
                  
                  if (selectedDate > today) {
                    alert('Purchase date cannot be in the future. Please select today or a past date.')
                    return
                  }
                  setFormData({ ...formData, date: selectedDate })
                }}
                max={getTodayDate()}
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
                    id="existingSupplier"
                    checked={!useNewSupplier}
                    onChange={() => setUseNewSupplier(false)}
                    className="text-primary focus:ring-primary"
                  />
                  <label htmlFor="existingSupplier" className="text-sm text-gray-700">
                    Select Existing
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
                    checked={useNewSupplier}
                    onChange={() => setUseNewSupplier(true)}
                    className="text-primary focus:ring-primary"
                  />
                  <label htmlFor="newSupplier" className="text-sm text-gray-700">
                    Enter New Supplier
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
                  let availableUnits: Array<{ unit: { id: string; symbol: string } }> = []
                  
                  if (selectedItem) {
                    if (selectedItem.baseUnit) {
                      availableUnits.push({
                        unit: {
                          id: selectedItem.baseUnit.id,
                          symbol: selectedItem.baseUnit.symbol,
                        },
                      })
                    }
                    
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                          >
                            <option value="">Select item</option>
                            {items.map((i) => (
                              <option key={i.id} value={i.id}>
                                {i.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Unit
                          </label>
                          <select
                            value={item.unitId}
                            onChange={(e) =>
                              updatePurchaseItem(index, { unitId: e.target.value })
                            }
                            required
                            disabled={!item.itemId}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm disabled:bg-gray-100"
                          >
                            <option value="">
                              {item.itemId ? 'Select unit' : 'Select item first'}
                            </option>
                            {availableUnits.map((au) => (
                              <option key={au.unit.id} value={au.unit.id}>
                                {au.unit.symbol}
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
                            min="0"
                            value={item.quantity || ''}
                            onChange={(e) =>
                              updatePurchaseItem(index, {
                                quantity: parseFloat(e.target.value) || 0,
                              })
                            }
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Unit Price
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unitPrice || ''}
                            onChange={(e) =>
                              updatePurchaseItem(index, {
                                unitPrice: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                          />
                          {item.quantity > 0 && item.unitPrice > 0 && (
                            <p className="text-xs text-gray-500 mt-1">
                              Total: {formatCurrency(item.lineTotal)}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Total Amount
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.lineTotal || ''}
                            onChange={(e) =>
                              updatePurchaseItem(index, {
                                lineTotal: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                          />
                          {item.quantity > 0 && item.lineTotal > 0 && (
                            <p className="text-xs text-gray-500 mt-1">
                              Per unit: {formatCurrency(item.unitPrice)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
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

          <div className="flex items-center justify-end gap-3">
            <Link
              href="/purchases"
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Updating...' : 'Update Purchase'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}

