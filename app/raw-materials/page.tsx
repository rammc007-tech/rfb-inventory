'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { Plus, Package, Search, Filter, Star, Edit, Trash2, Printer } from 'lucide-react'
import useSWR from 'swr'
import { getUserRole } from '@/lib/access-control'
import { fastFetcher, fastSWRConfig } from '@/lib/fast-fetcher'

export default function RawMaterialsPage() {
  const { data: materials, error, isLoading, mutate } = useSWR('/api/raw-materials', fastFetcher, fastSWRConfig)
  
  // Listen for restore events from deleted items page
  useEffect(() => {
    const handleDataRestored = () => {
      console.log('Data restored event received, refreshing...')
      mutate()
    }
    
    window.addEventListener('data-restored', handleDataRestored)
    return () => window.removeEventListener('data-restored', handleDataRestored)
  }, [mutate])
  const { data: accessControl } = useSWR('/api/settings/access-control', fastFetcher, fastSWRConfig)
  const [userRole, setUserRole] = useState<'user' | 'supervisor' | 'admin' | null>(null)
  const [canDelete, setCanDelete] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ name: '', unit: 'kg' })
  const [searchTerm, setSearchTerm] = useState('')
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'in-stock'>('all')
  const [editingMaterial, setEditingMaterial] = useState<any>(null)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())

  useEffect(() => {
    const role = getUserRole()
    setUserRole(role)
  }, [])

  useEffect(() => {
    if (userRole && accessControl) {
      const permission = accessControl.raw_materials_delete?.[userRole] ?? (userRole === 'admin')
      setCanDelete(permission)
    }
  }, [userRole, accessControl])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingMaterial) {
        // Update existing material
        const res = await fetch(`/api/raw-materials/${editingMaterial.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        if (res.ok) {
          const updated = await res.json()
          mutate()
          setFormData({ name: '', unit: 'kg' })
          setShowForm(false)
          setEditingMaterial(null)
          alert('Material updated successfully!')
        } else {
          const errorData = await res.json()
          console.error('Update error:', errorData)
          alert(errorData.error || 'Failed to update material')
        }
      } else {
        // Create new material
        const res = await fetch('/api/raw-materials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        
        if (res.ok || res.status === 201) {
          const newMaterial = await res.json()
          console.log('Material created:', newMaterial)
          mutate()
          setFormData({ name: '', unit: 'kg' })
          setShowForm(false)
          alert('Material created successfully!')
        } else {
          const errorData = await res.json()
          console.error('Create error:', errorData)
          alert(errorData.error || `Failed to create material (Status: ${res.status})`)
        }
      }
    } catch (error) {
      alert('Failed to save material')
    }
  }

  const handleEditMaterial = (material: any) => {
    setEditingMaterial(material)
    setFormData({
      name: material.name || '',
      unit: material.unit || 'kg',
    })
    setShowForm(true)
  }

  const handleDeleteMaterial = async (id: string) => {
    if (!canDelete) {
      alert('You do not have permission to delete materials.')
      return
    }

    if (!confirm('Are you sure you want to delete this material? This action cannot be undone.')) {
      return
    }

    try {
      // Optimistic update - remove immediately
      const updatedMaterials = materials?.filter((m: any) => m.id !== id)
      await mutate(updatedMaterials, false)
      
      const res = await fetch(`/api/raw-materials/${id}`, {
        method: 'DELETE',
        headers: {
          'x-user-role': userRole || 'user',
        },
      })
      if (res.ok) {
        // Notify deleted items page
        window.dispatchEvent(new CustomEvent('raw-material-deleted', { detail: { id } }))
        
        // Final revalidate
        await mutate()
        
        console.log('✅ Raw material deleted and synced')
      } else {
        // Revert on error
        await mutate()
        const error = await res.json()
        alert(error.error || 'Failed to delete material')
      }
    } catch (error) {
      // Revert on error
      await mutate()
      alert('Failed to delete material')
    }
  }

  // Ensure materials is always an array
  // Ensure materials is always an array
  const materialsList = Array.isArray(materials) ? materials : []
  
  // Select All handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(filteredMaterials.map((m: any) => m.id))
      setSelectedItems(allIds)
    } else {
      setSelectedItems(new Set())
    }
  }
  
  const handleSelectItem = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedItems)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedItems(newSelected)
  }
  
  // Add retry logic for failed requests
  useEffect(() => {
    if (error && !isLoading) {
      const timer = setTimeout(() => {
        mutate()
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [error, isLoading, mutate])
  
  const filteredMaterials = materialsList.filter((material: any) => {
    // Safety check: ensure material exists and has required properties
    if (!material || typeof material !== 'object' || !material.name) {
      return false
    }
    
    const materialName = String(material.name || '').toLowerCase()
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch = materialName.includes(searchLower)
    
    const matchesStock = 
      stockFilter === 'all' ||
      (stockFilter === 'low' && (material.currentStock ?? 0) < 10) ||
      (stockFilter === 'in-stock' && (material.currentStock ?? 0) >= 10)
    
    return matchesSearch && matchesStock
  })

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">Raw Materials</h2>
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 no-print"
            >
              <Printer size={18} />
              Print
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 no-print"
            >
              <Plus size={20} />
              Add Material
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search materials by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-1">
              <Filter size={16} />
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value as any)}
                className="border-0 focus:ring-0 text-sm"
              >
                <option value="all">All Stock</option>
                <option value="low">Low Stock</option>
                <option value="in-stock">In Stock</option>
              </select>
            </div>
          </div>
        </div>

        {showForm && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">
              {editingMaterial ? 'Edit Raw Material' : 'Add New Raw Material'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Material Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., Maida, Oil, Sugar"
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
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setFormData({ name: '', unit: 'kg' })
                    setEditingMaterial(null)
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {isLoading && (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            Loading materials...
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
            Error loading materials: {error.message || 'Unknown error'}
          </div>
        )}

        {!isLoading && !error && (
          <div className="bg-white rounded-lg shadow overflow-hidden print:shadow-none">
            <div className="hidden print:block text-center py-3 print:py-2 print:mb-2 border-b print:border-gray-300">
              <p className="text-sm text-gray-600 print:text-xs">Raw Materials Report</p>
              <p className="text-xs text-gray-500 print:mt-1">
                Date: {new Date().toLocaleDateString()}
              </p>
            </div>
            <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left no-print">
                  <input
                    type="checkbox"
                    checked={filteredMaterials.length > 0 && selectedItems.size === filteredMaterials.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                </th>
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
                    Essential
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
              {filteredMaterials.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    {materialsList.length === 0 ? 'No raw materials found. Add your first material!' : 'No materials match your filters.'}
                  </td>
                </tr>
              ) : (
              filteredMaterials.map((material: any) => (
                material && material.name ? (
                  <tr key={material.id || Math.random()} className={selectedItems.has(material.id) ? 'bg-blue-50' : ''}>
                    <td className="px-4 py-4 whitespace-nowrap no-print">
                      <input
                        type="checkbox"
                        checked={selectedItems.has(material.id)}
                        onChange={(e) => handleSelectItem(material.id, e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {material.name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {material.unit || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {(material.currentStock ?? 0).toFixed(2)} {material.stockUnit || material.unit || ''}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {(material.currentStock ?? 0) < 10 ? (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                            Low Stock
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            In Stock
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={async () => {
                            try {
                              const res = await fetch(`/api/raw-materials/${material.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ isEssential: !material.isEssential }),
                              })
                              if (res.ok) {
                                mutate()
                              }
                            } catch (error) {
                              alert('Failed to update')
                            }
                          }}
                          className={`p-2 rounded-lg ${
                            material.isEssential
                              ? 'bg-yellow-100 text-yellow-600'
                              : 'bg-gray-100 text-gray-400'
                          } hover:bg-yellow-200`}
                          title={material.isEssential ? 'Remove from essential' : 'Mark as essential'}
                        >
                          <Star
                            size={20}
                            className={material.isEssential ? 'fill-yellow-500' : ''}
                          />
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditMaterial(material)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Edit Material"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteMaterial(material.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Delete Material"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : null
                ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

