'use client'

import { DashboardLayout } from '@/components/DashboardLayout'
import { useState, useEffect } from 'react'
import { Trash2, RotateCcw, X, Trash, Search } from 'lucide-react'
import { format } from 'date-fns'

interface TrashItem {
  id: string
  name: string
  entityType: string
  deletedAt: string
  [key: string]: any
}

export default function TrashPage() {
  const [trash, setTrash] = useState<{
    items: TrashItem[]
    recipes: TrashItem[]
    purchases: TrashItem[]
    productions: TrashItem[]
    suppliers: TrashItem[]
  }>({
    items: [],
    recipes: [],
    purchases: [],
    productions: [],
    suppliers: [],
  })
  const [loading, setLoading] = useState(true)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchTrash()
    
    // Refresh trash when page becomes visible (user navigates back to trash)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchTrash()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // Also refresh on focus (when user switches back to tab)
    window.addEventListener('focus', fetchTrash)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', fetchTrash)
    }
  }, [])

  const fetchTrash = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/trash', {
        cache: 'no-store',
      })
      
      if (!response.ok) {
        setTrash({ items: [], recipes: [], purchases: [], productions: [], suppliers: [] })
        return
      }
      
      const data = await response.json()
      
      // Ensure all properties exist and are arrays
      setTrash({
        items: Array.isArray(data.items) ? data.items : [],
        recipes: Array.isArray(data.recipes) ? data.recipes : [],
        purchases: Array.isArray(data.purchases) ? data.purchases : [],
        productions: Array.isArray(data.productions) ? data.productions : [],
        suppliers: Array.isArray(data.suppliers) ? data.suppliers : [],
      })
    } catch (error: any) {
      // Silently handle errors
      setTrash({ items: [], recipes: [], purchases: [], productions: [], suppliers: [] })
    } finally {
      setLoading(false)
    }
  }

  const handleSelectAll = (type: string, items: TrashItem[]) => {
    if (selectedType === type && selectedItems.size === items.length) {
      setSelectedItems(new Set())
      setSelectedType(null)
    } else {
      setSelectedItems(new Set(items.map((item) => `${type}-${item.id}`)))
      setSelectedType(type)
    }
  }

  const handleSelectItem = (type: string, id: string) => {
    const key = `${type}-${id}`
    const newSelected = new Set(selectedItems)
    if (newSelected.has(key)) {
      newSelected.delete(key)
    } else {
      newSelected.add(key)
    }
    setSelectedItems(newSelected)
    setSelectedType(type)
  }

  const handleRestore = async () => {
    if (selectedItems.size === 0) return

    const itemsByType: Record<string, string[]> = {}
    selectedItems.forEach((key) => {
      const [type, id] = key.split('-')
      if (!itemsByType[type]) itemsByType[type] = []
      itemsByType[type].push(id)
    })

    try {
      for (const [type, ids] of Object.entries(itemsByType)) {
        await fetch('/api/trash', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'restore', entityType: type, ids }),
        })
      }
      setSelectedItems(new Set())
      setSelectedType(null)
      fetchTrash()
      alert('Items restored successfully')
    } catch (error) {
      console.error('Failed to restore items:', error)
      alert('Failed to restore items')
    }
  }

  const handleDelete = async () => {
    if (selectedItems.size === 0) return

    if (!confirm('Are you sure you want to permanently delete these items? This action cannot be undone.')) {
      return
    }

    const itemsByType: Record<string, string[]> = {}
    selectedItems.forEach((key) => {
      const [type, id] = key.split('-')
      if (!itemsByType[type]) itemsByType[type] = []
      itemsByType[type].push(id)
    })

    try {
      for (const [type, ids] of Object.entries(itemsByType)) {
        await fetch('/api/trash', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', entityType: type, ids }),
        })
      }
      setSelectedItems(new Set())
      setSelectedType(null)
      fetchTrash()
      alert('Items permanently deleted')
    } catch (error) {
      console.error('Failed to delete items:', error)
      alert('Failed to delete items')
    }
  }

  const handleEmptyTrash = async () => {
    if (!confirm('Are you sure you want to empty the entire trash? This will permanently delete all items and cannot be undone.')) {
      return
    }

    try {
      await fetch('/api/trash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'empty' }),
      })
      setSelectedItems(new Set())
      setSelectedType(null)
      fetchTrash()
      alert('Trash emptied successfully')
    } catch (error) {
      console.error('Failed to empty trash:', error)
      alert('Failed to empty trash')
    }
  }

  // Filter trash items
  const filterTrashItems = (items: TrashItem[], type: string) => {
    if (!Array.isArray(items)) return []
    
    return items.filter((item) => {
      // Type filter
      if (typeFilter !== 'all' && typeFilter !== type) return false

      // Search filter
      if (searchTerm) {
        const matchesSearch = item.name?.toLowerCase().includes(searchTerm.toLowerCase())
        if (!matchesSearch) return false
      }

      // Date range filter
      if (startDate || endDate) {
        const deletedDate = new Date(item.deletedAt)
        if (startDate && deletedDate < new Date(startDate)) return false
        if (endDate && deletedDate > new Date(endDate + 'T23:59:59')) return false
      }

      return true
    })
  }

  const renderTrashSection = (title: string, type: string, items: TrashItem[]) => {
    const filtered = filterTrashItems(items, type)
    if (filtered.length === 0) return null

    const allSelected = filtered.every((item) => selectedItems.has(`${type}-${item.id}`))

    return (
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title} ({filtered.length})</h3>
          <button
            onClick={() => handleSelectAll(type, filtered)}
            className="text-sm text-primary hover:text-primary/80"
          >
            {allSelected ? 'Deselect All' : 'Select All'}
          </button>
        </div>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={() => handleSelectAll(type, items)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Deleted On
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.map((item) => {
                const key = `${type}-${item.id}`
                const isSelected = selectedItems.has(key)
                return (
                  <tr key={item.id} className={isSelected ? 'bg-gray-50' : ''}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectItem(type, item.id)}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{item.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {format(new Date(item.deletedAt), 'PPp')}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={async () => {
                            try {
                              await fetch('/api/trash', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  action: 'restore',
                                  entityType: type,
                                  ids: [item.id],
                                }),
                              })
                              fetchTrash()
                              alert('Item restored successfully')
                            } catch (error) {
                              alert('Failed to restore item')
                            }
                          }}
                          className="text-green-600 hover:text-green-800"
                          title="Restore"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                        <button
                          onClick={async () => {
                            if (!confirm('Permanently delete this item?')) return
                            try {
                              await fetch('/api/trash', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  action: 'delete',
                                  entityType: type,
                                  ids: [item.id],
                                }),
                              })
                              fetchTrash()
                              alert('Item permanently deleted')
                            } catch (error) {
                              alert('Failed to delete item')
                            }
                          }}
                          className="text-red-600 hover:text-red-800"
                          title="Delete Permanently"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // Calculate total items after filtering
  const totalItems =
    filterTrashItems(trash.items, 'item').length +
    filterTrashItems(trash.recipes, 'recipe').length +
    filterTrashItems(trash.purchases, 'purchase').length +
    filterTrashItems(trash.productions, 'production').length +
    filterTrashItems(trash.suppliers, 'supplier').length

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Trash Bin</h2>
            <p className="text-gray-600 mt-1">
              {totalItems} deleted item{totalItems !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchTrash}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
              title="Refresh trash list"
            >
              <RotateCcw className="h-4 w-4" />
              Refresh
            </button>
            {selectedItems.size > 0 && (
              <>
                <button
                  onClick={handleRestore}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  <RotateCcw className="h-4 w-4" />
                  Restore Selected ({selectedItems.size})
                </button>
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  <X className="h-4 w-4" />
                  Delete Selected ({selectedItems.size})
                </button>
              </>
            )}
            {totalItems > 0 && (
              <button
                onClick={handleEmptyTrash}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                <Trash className="h-4 w-4" />
                Empty Trash
              </button>
            )}
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white p-4 rounded-lg shadow space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search deleted items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          
          {/* Filter Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Types</option>
                <option value="item">Items</option>
                <option value="recipe">Recipes</option>
                <option value="purchase">Purchases</option>
                <option value="production">Productions</option>
                <option value="supplier">Suppliers</option>
              </select>
            </div>

            {/* Date Range - Start */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Deleted From
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Date Range - End */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Deleted To
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading trash items...</p>
          </div>
        ) : totalItems === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <Trash2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Trash is empty</p>
            <p className="text-gray-400 text-sm mt-2">
              Deleted items will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {renderTrashSection('Items', 'item', trash.items)}
            {renderTrashSection('Recipes', 'recipe', trash.recipes)}
            {renderTrashSection('Purchases', 'purchase', trash.purchases)}
            {renderTrashSection('Productions', 'production', trash.productions)}
            {renderTrashSection('Suppliers', 'supplier', trash.suppliers)}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

