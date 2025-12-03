'use client'

import { useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { Trash2, RotateCcw, X, Search, Filter } from 'lucide-react'
import useSWR from 'swr'
import { format } from 'date-fns'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function DeletedItemsPage() {
  const { data: deletedItems, mutate } = useSWR('/api/deleted-items', fetcher, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    refreshInterval: 2000, // Refresh every 2 seconds
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')

  const categories = ['all', 'raw_material', 'essential_item', 'recipe', 'packing_material', 'purchase', 'packing_purchase', 'production_log']

  const filteredItems = Array.isArray(deletedItems)
    ? deletedItems.filter((item: any) => {
        const matchesCategory = filterCategory === 'all' || item.category === filterCategory
        const matchesSearch = !searchTerm || 
                             item.originalData?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             item.originalData?.rawMaterialName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             item.originalData?.recipeName?.toLowerCase().includes(searchTerm.toLowerCase())
        return matchesCategory && matchesSearch
      })
    : []

  // Debug log
  if (typeof window !== 'undefined') {
    console.log('Deleted items from API:', deletedItems)
    console.log('Filtered items:', filteredItems)
  }

  const handleRestore = async (id: string) => {
    if (!confirm('Are you sure you want to restore this item?')) return

    try {
      const res = await fetch('/api/deleted-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deletedItemId: id }),
      })

      if (res.ok) {
        mutate()
        alert('Item restored successfully!')
      } else {
        alert('Failed to restore item')
      }
    } catch (error) {
      alert('Failed to restore item')
    }
  }

  const handlePermanentDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this item? This action cannot be undone.')) return

    try {
      const res = await fetch(`/api/deleted-items?id=${id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        mutate()
        alert('Item permanently deleted')
      } else {
        alert('Failed to delete item')
      }
    } catch (error) {
      alert('Failed to delete item')
    }
  }

  const handleEmptyBin = async () => {
    if (!confirm('Are you sure you want to permanently delete ALL items in the bin? This action cannot be undone.')) return

    try {
      const res = await fetch('/api/deleted-items?emptyAll=true', {
        method: 'DELETE',
      })

      if (res.ok) {
        mutate()
        alert('Bin emptied successfully')
      } else {
        alert('Failed to empty bin')
      }
    } catch (error) {
      alert('Failed to empty bin')
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Trash2 className="w-8 h-8 text-red-600" />
            <h2 className="text-2xl font-bold text-gray-800">Deleted Items</h2>
            <span className="text-sm text-gray-500">
              ({Array.isArray(deletedItems) ? deletedItems.length : 0} items)
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => mutate()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              title="Refresh"
            >
              <RotateCcw size={18} />
              Refresh
            </button>
            {filteredItems.length > 0 && (
              <button
                onClick={handleEmptyBin}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                <X size={18} />
                Empty Bin
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Category
              </label>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => {
                  let displayName = cat
                  if (cat === 'all') displayName = 'All'
                  else if (cat === 'raw_material') displayName = 'Raw Material'
                  else if (cat === 'essential_item') displayName = 'Essential Item'
                  else if (cat === 'recipe') displayName = 'Recipe'
                  else if (cat === 'packing_material') displayName = 'Packing Material'
                  else if (cat === 'purchase') displayName = 'Purchase'
                  else if (cat === 'packing_purchase') displayName = 'Packing Purchase'
                  else if (cat === 'production_log') displayName = 'Production Log'
                  
                  return (
                    <button
                      key={cat}
                      onClick={() => setFilterCategory(cat)}
                      className={`px-3 py-1 rounded-lg text-sm ${
                        filterCategory === cat
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {displayName}
                    </button>
                  )
                })}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search deleted items..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Deleted Items List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Item Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Deleted At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredItems.map((item: any) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.originalData?.name || 
                     item.originalData?.rawMaterialName || 
                     item.originalData?.recipeName || 
                     (item.category === 'production_log' ? `Production Log (${item.originalData?.batches || 0} batches)` : 'Unknown')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.category.replace('_', ' ')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(item.deletedAt), 'MMM dd, yyyy HH:mm')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRestore(item.id)}
                        className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                        title="Restore"
                      >
                        <RotateCcw size={14} />
                        Restore
                      </button>
                      <button
                        onClick={() => handlePermanentDelete(item.id)}
                        className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                        title="Permanently Delete"
                      >
                        <X size={14} />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500">
                    No deleted items found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  )
}

