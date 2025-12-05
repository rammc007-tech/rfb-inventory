'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { Plus, Package, Search, Filter, Star, Edit, Trash2, Printer } from 'lucide-react'
import useSWR from 'swr'
import { getUserRole } from '@/lib/access-control'
import { fastFetcher, fastSWRConfig } from '@/lib/fast-fetcher'

export default function RawMaterialsClient() {
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
          mutate()
          setShowForm(false)
          setFormData({ name: '', unit: 'kg' })
          setEditingMaterial(null)
          alert('Material updated successfully!')
        }
      } else {
        // Create new material
        const res = await fetch('/api/raw-materials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        if (res.ok) {
          mutate()
          setShowForm(false)
          setFormData({ name: '', unit: 'kg' })
          alert('Material added successfully!')
        }
      }
    } catch (error) {
      alert('Failed to save material')
    }
  }

  const handleEdit = (material: any) => {
    setEditingMaterial(material)
    setFormData({ name: material.name, unit: material.unit })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!canDelete) {
      alert('You do not have permission to delete raw materials')
      return
    }
    
    if (!confirm('Are you sure you want to delete this material?')) return

    try {
      const res = await fetch(`/api/raw-materials/${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        mutate()
        alert('Material deleted successfully!')
      }
    } catch (error) {
      alert('Failed to delete material')
    }
  }

  const toggleEssential = async (material: any) => {
    try {
      const res = await fetch(`/api/raw-materials/${material.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...material,
          isEssential: !material.isEssential,
        }),
      })
      
      if (res.ok) {
        // Dispatch event for essential items page
        if (!material.isEssential) {
          window.dispatchEvent(new CustomEvent('essential-added', { 
            detail: { id: material.id } 
          }))
        } else {
          window.dispatchEvent(new CustomEvent('essential-removed', { 
            detail: { id: material.id } 
          }))
        }
        
        mutate()
        alert(`Material ${!material.isEssential ? 'marked as' : 'removed from'} essential!`)
      }
    } catch (error) {
      alert('Failed to update material')
    }
  }

  // Ensure materials is always an array
  const materialsList = Array.isArray(materials) ? materials : []
  
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
          <h1 className="text-3xl font-bold text-gray-800">Raw Materials</h1>
          <div className="flex gap-2 no-print">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              <Printer size={20} />
              Print
            </button>
            <button
              onClick={() => {
                setEditingMaterial(null)
                setFormData({ name: '', unit: 'kg' })
                setShowForm(!showForm)
              }}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              <Plus size={20} />
              Add Material
            </button>
          </div>
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 no-print">
            <h3 className="text-lg font-semibold mb-4">
              {editingMaterial ? 'Edit Material' : 'Add New Material'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Material Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit
                </label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
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
                  {editingMaterial ? 'Update' : 'Add'} Material
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setEditingMaterial(null)
                    setFormData({ name: '', unit: 'kg' })
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Search and Filter */}
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

        {/* Loading state */}
        {isLoading && (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            Loading materials...
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="bg-white rounded-lg shadow p-8 text-center text-red-500">
            Failed to load materials. Please refresh the page.
          </div>
        )}

        {/* Materials list */}
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
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      {materialsList.length === 0 ? 'No raw materials found. Add your first material!' : 'No materials match your filters.'}
                    </td>
                  </tr>
                ) : (
                filteredMaterials.map((material: any) => (
                  material && material.name ? (
                    <tr key={material.id || Math.random()}>
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
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          (material.currentStock ?? 0) < 10
                            ? 'bg-red-100 text-red-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {(material.currentStock ?? 0) < 10 ? 'Low Stock' : 'In Stock'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm no-print">
                        <button
                          onClick={() => toggleEssential(material)}
                          className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                            material.isEssential
                              ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {material.isEssential ? (
                            <>
                              <Star size={12} className="fill-current" />
                              Remove from essential
                            </>
                          ) : (
                            <>
                              <Star size={12} />
                              Mark as essential
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium no-print">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(material)}
                            className="text-primary-600 hover:text-primary-900"
                            title="Edit Material"
                          >
                            <Edit size={18} />
                          </button>
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(material.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete Material"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
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

