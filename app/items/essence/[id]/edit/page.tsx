'use client'

import { DashboardLayout } from '@/components/DashboardLayout'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface Unit {
  id: string
  name: string
  symbol: string
  type: string
}

interface Item {
  id: string
  name: string
  sku: string | null
  category: string | null
  baseUnitId: string
  reorderThreshold: number
  location: string | null
  itemUnits: Array<{
    unitId: string
  }>
}

export default function EditEssencePage() {
  const router = useRouter()
  const params = useParams()
  const [units, setUnits] = useState<Unit[]>([])
  const [item, setItem] = useState<Item | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: '',
    baseUnitId: '',
    reorderThreshold: '',
    location: '',
    unitIds: [] as string[],
  })

  useEffect(() => {
    if (params.id) {
      fetchUnits()
      fetchItem()
    }
  }, [params.id])

  const fetchUnits = async () => {
    try {
      const response = await fetch('/api/units')
      const data = await response.json()
      setUnits(data)
    } catch (error) {
      console.error('Failed to fetch units:', error)
    }
  }

  const fetchItem = async () => {
    try {
      const response = await fetch(`/api/items/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setItem(data)
        setFormData({
          name: data.name || '',
          sku: data.sku || '',
          category: data.category || '',
          baseUnitId: data.baseUnitId || '',
          reorderThreshold: data.reorderThreshold?.toString() || '0',
          location: data.location || '',
          unitIds: data.itemUnits?.map((iu: any) => iu.unitId) || [],
        })
      } else {
        alert('Item not found')
        router.push('/items/essence')
      }
    } catch (error) {
      console.error('Failed to fetch item:', error)
      alert('Failed to load item')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const response = await fetch(`/api/items/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          reorderThreshold: parseFloat(formData.reorderThreshold) || 0,
        }),
      })

      if (response.ok) {
        router.push('/items/essence')
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to update item')
      }
    } catch (error) {
      console.error('Failed to update item:', error)
      alert('Failed to update item')
    } finally {
      setSaving(false)
    }
  }

  const toggleUnit = (unitId: string) => {
    setFormData((prev) => ({
      ...prev,
      unitIds: prev.unitIds.includes(unitId)
        ? prev.unitIds.filter((id) => id !== unitId)
        : [...prev.unitIds, unitId],
    }))
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center text-gray-500">Loading...</div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href="/items/essence"
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Edit Essence</h2>
            <p className="text-gray-600 mt-1">Update essence details</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SKU
              </label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Base Unit *
              </label>
              <select
                value={formData.baseUnitId}
                onChange={(e) => setFormData({ ...formData, baseUnitId: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select base unit</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.symbol} ({unit.name})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reorder Threshold
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.reorderThreshold}
                onChange={(e) => setFormData({ ...formData, reorderThreshold: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Available Units
            </label>
            <div className="grid grid-cols-3 gap-2">
              {units.map((unit) => (
                <label
                  key={unit.id}
                  className="flex items-center space-x-2 p-2 border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={formData.unitIds.includes(unit.id)}
                    onChange={() => toggleUnit(unit.id)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm">
                    {unit.symbol} ({unit.name})
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={saving}
              className="bg-primary text-white px-6 py-2 rounded-md hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <Link
              href="/items/essence"
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

