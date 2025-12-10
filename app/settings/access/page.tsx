'use client'

import { DashboardLayout } from '@/components/DashboardLayout'
import { useEffect, useState } from 'react'
import { Save, X } from 'lucide-react'

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface AccessControl {
  id: string
  userId: string
  canViewDashboard: boolean
  canManageItems: boolean
  canManagePurchase: boolean
  canManageRecipe: boolean
  canManageProduction: boolean
  canViewReports: boolean
  canManageUsers: boolean
  canManageSettings: boolean
}

export default function AccessControlPage() {
  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [accessControl, setAccessControl] = useState<AccessControl | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    if (selectedUser) {
      fetchAccessControl(selectedUser.id)
    }
  }, [selectedUser])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users')
      if (!response.ok) {
        throw new Error('Failed to fetch users')
      }
      const data = await response.json()
      setUsers(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch users:', error)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  const fetchAccessControl = async (userId: string) => {
    try {
      const response = await fetch(`/api/access-control/${userId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch access control')
      }
      const data = await response.json()
      setAccessControl(data)
    } catch (error) {
      console.error('Failed to fetch access control:', error)
      // Initialize with default permissions if not found
      setAccessControl({
        id: '',
        userId,
        canViewDashboard: true,
        canManageItems: false,
        canManagePurchase: false,
        canManageRecipe: false,
        canManageProduction: false,
        canViewReports: false,
        canManageUsers: false,
        canManageSettings: false,
      })
    }
  }

  const handleSave = async () => {
    if (!selectedUser || !accessControl) return

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/access-control/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accessControl),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save access control')
      }

      setSuccess('Access control updated successfully')
      setAccessControl(data)
    } catch (error: any) {
      setError(error.message || 'Failed to save access control')
    } finally {
      setSaving(false)
    }
  }

  const updatePermission = (key: keyof AccessControl, value: boolean) => {
    if (!accessControl) return
    setAccessControl({ ...accessControl, [key]: value })
  }

  const permissions = [
    { key: 'canViewDashboard' as const, label: 'View Dashboard', description: 'Access to dashboard overview' },
    { key: 'canManageItems' as const, label: 'Manage Items', description: 'Create, edit, delete raw materials and essence' },
    { key: 'canManagePurchase' as const, label: 'Manage Purchase', description: 'Create and view purchase records' },
    { key: 'canManageRecipe' as const, label: 'Manage Recipe', description: 'Create, edit, delete recipes' },
    { key: 'canManageProduction' as const, label: 'Manage Production', description: 'Create and manage production records' },
    { key: 'canViewReports' as const, label: 'View Reports', description: 'Access to production cost and stock reports' },
    { key: 'canManageUsers' as const, label: 'Manage Users', description: 'Create, edit, delete users (Admin only)' },
    { key: 'canManageSettings' as const, label: 'Manage Settings', description: 'Access to settings and backup (Admin only)' },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Access Control</h2>
          <p className="text-gray-600 mt-1">Configure module-level permissions for users</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* User Selection */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Select User</h3>
            {loading ? (
              <div className="text-center text-gray-500 py-4">Loading users...</div>
            ) : users.length === 0 ? (
              <div className="text-center text-gray-500 py-4">No users found</div>
            ) : (
              <div className="space-y-2">
                {users.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => {
                      setSelectedUser(user)
                      setError('')
                      setSuccess('')
                    }}
                    className={`w-full text-left px-4 py-3 rounded-md border transition-colors ${
                      selectedUser?.id === user.id
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium">{user.name}</div>
                    <div className={`text-sm ${selectedUser?.id === user.id ? 'text-white/80' : 'text-gray-500'}`}>
                      {user.email} • {user.role}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Permissions */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
            {!selectedUser ? (
              <div className="text-center text-gray-500 py-12">
                Select a user to configure permissions
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Permissions for {selectedUser.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {selectedUser.email} • {selectedUser.role}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedUser(null)
                      setAccessControl(null)
                      setError('')
                      setSuccess('')
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {accessControl && (
                  <div className="space-y-4">
                    {permissions.map((permission) => {
                      // Disable certain permissions for non-admin roles
                      const isDisabled =
                        (permission.key === 'canManageUsers' || permission.key === 'canManageSettings') &&
                        selectedUser.role !== 'ADMIN'

                      return (
                        <div
                          key={permission.key}
                          className="flex items-start justify-between p-4 border border-gray-200 rounded-md"
                        >
                          <div className="flex-1">
                            <label
                              htmlFor={permission.key}
                              className="font-medium text-gray-900 cursor-pointer"
                            >
                              {permission.label}
                            </label>
                            <p className="text-sm text-gray-600 mt-1">{permission.description}</p>
                            {isDisabled && (
                              <p className="text-xs text-yellow-600 mt-1">
                                Only available for Admin users
                              </p>
                            )}
                          </div>
                          <div className="ml-4">
                            <input
                              type="checkbox"
                              id={permission.key}
                              checked={accessControl[permission.key]}
                              onChange={(e) => updatePermission(permission.key, e.target.checked)}
                              disabled={isDisabled}
                              className="h-5 w-5 text-primary focus:ring-primary rounded border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                          </div>
                        </div>
                      )
                    })}

                    <div className="mt-6 flex items-center justify-end gap-3">
                      <button
                        onClick={() => {
                          setSelectedUser(null)
                          setAccessControl(null)
                          setError('')
                          setSuccess('')
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Save className="h-4 w-4" />
                        {saving ? 'Saving...' : 'Save Permissions'}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
