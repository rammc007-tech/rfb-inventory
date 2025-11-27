'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { Settings, Users, Store, Download, Upload, Printer } from 'lucide-react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'shop' | 'users' | 'backup' | 'print'>('shop')
  const { data: shopSettings, mutate: mutateShop } = useSWR(
    '/api/settings',
    fetcher
  )
  const { data: users, mutate: mutateUsers } = useSWR('/api/users', fetcher)

  const [shopForm, setShopForm] = useState({
    shopName: '',
    shopAddress: '',
    shopEmail: '',
    shopPhone: '',
    currency: '₹',
    taxRate: 0,
    printTextSize: 'medium',
  })

  const [userForm, setUserForm] = useState({
    username: '',
    password: '',
    role: 'user',
  })

  useEffect(() => {
    if (shopSettings) {
      setShopForm({
        shopName: shopSettings.shopName || '',
        shopAddress: shopSettings.shopAddress || '',
        shopEmail: shopSettings.shopEmail || '',
        shopPhone: shopSettings.shopPhone || '',
        currency: shopSettings.currency || '₹',
        taxRate: shopSettings.taxRate || 0,
        printTextSize: shopSettings.printTextSize || 'medium',
      })
    }
  }, [shopSettings])

  const handleShopSave = async () => {
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopName: shopForm.shopName,
          shopAddress: shopForm.shopAddress,
          shopEmail: shopForm.shopEmail,
          shopPhone: shopForm.shopPhone,
          currency: shopForm.currency,
          taxRate: shopForm.taxRate,
          printTextSize: shopForm.printTextSize,
        }),
      })
      if (res.ok) {
        mutateShop()
        alert('Shop settings saved!')
      }
    } catch (error) {
      alert('Failed to save settings')
    }
  }

  const handleUserCreate = async () => {
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userForm),
      })
      if (res.ok) {
        mutateUsers()
        setUserForm({ username: '', password: '', role: 'user' })
        alert('User created!')
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to create user')
      }
    } catch (error) {
      alert('Failed to create user')
    }
  }

  const handleBackup = async () => {
    try {
      const res = await fetch('/api/backup')
      if (res.ok) {
        const data = await res.json()
        alert(`Backup created successfully!\nFile: ${data.filename}`)
      }
    } catch (error) {
      alert('Failed to create backup')
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-800">Settings</h2>

        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('shop')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'shop'
                ? 'border-b-2 border-primary-600 text-primary-600'
                : 'text-gray-600'
            }`}
          >
            <Store size={18} className="inline mr-2" />
            Shop Settings
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'users'
                ? 'border-b-2 border-primary-600 text-primary-600'
                : 'text-gray-600'
            }`}
          >
            <Users size={18} className="inline mr-2" />
            User Management
          </button>
          <button
            onClick={() => setActiveTab('backup')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'backup'
                ? 'border-b-2 border-primary-600 text-primary-600'
                : 'text-gray-600'
            }`}
          >
            <Download size={18} className="inline mr-2" />
            Data Backup
          </button>
          <button
            onClick={() => setActiveTab('print')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'print'
                ? 'border-b-2 border-primary-600 text-primary-600'
                : 'text-gray-600'
            }`}
          >
            <Printer size={18} className="inline mr-2" />
            Print Settings
          </button>
        </div>

        {activeTab === 'shop' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Shop Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Shop Name
                </label>
                <input
                  type="text"
                  value={shopForm.shopName}
                  onChange={(e) =>
                    setShopForm({ ...shopForm, shopName: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Shop Address
                </label>
                <textarea
                  value={shopForm.shopAddress}
                  onChange={(e) =>
                    setShopForm({ ...shopForm, shopAddress: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={shopForm.shopEmail}
                    onChange={(e) =>
                      setShopForm({ ...shopForm, shopEmail: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={shopForm.shopPhone}
                    onChange={(e) =>
                      setShopForm({ ...shopForm, shopPhone: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Currency
                  </label>
                  <input
                    type="text"
                    value={shopForm.currency}
                    onChange={(e) =>
                      setShopForm({ ...shopForm, currency: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={shopForm.taxRate}
                    onChange={(e) =>
                      setShopForm({
                        ...shopForm,
                        taxRate: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <button
                onClick={handleShopSave}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Save Settings
              </button>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Create New User</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={userForm.username}
                    onChange={(e) =>
                      setUserForm({ ...userForm, username: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={userForm.password}
                    onChange={(e) =>
                      setUserForm({ ...userForm, password: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    value={userForm.role}
                    onChange={(e) =>
                      setUserForm({ ...userForm, role: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleUserCreate}
                    className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    Create User
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Username
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users?.map((user: any) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {user.username}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            user.role === 'admin'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {user.isActive ? (
                          <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'backup' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Data Backup & Restore</h3>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800 mb-2">
                  Create a backup of all your data including:
                </p>
                <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
                  <li>Raw Materials</li>
                  <li>Purchase Records</li>
                  <li>Recipes</li>
                  <li>Production Logs</li>
                  <li>User Accounts</li>
                  <li>Shop Settings</li>
                </ul>
              </div>
              <button
                onClick={handleBackup}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Download size={18} />
                Create Backup Now
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

