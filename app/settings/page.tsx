'use client'

import { useState, useEffect, useCallback } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { Settings, Users, Store, Download, Upload, Printer, Key, FolderOpen, Eye, EyeOff, Shield, Lock, X } from 'lucide-react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'shop' | 'users' | 'backup' | 'print' | 'access'>('shop')
  const [backupLocation, setBackupLocation] = useState('')
  const [requireBackupConfirmation, setRequireBackupConfirmation] = useState(true)
  const [forgetPasswordForm, setForgetPasswordForm] = useState({
    username: '',
    newPassword: '',
    confirmPassword: '',
  })
  
  
  const [changePasswordForm, setChangePasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  
  // Password visibility states
  const [showUserPassword, setShowUserPassword] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showForgetPassword, setShowForgetPassword] = useState(false)
  const [showForgetConfirmPassword, setShowForgetConfirmPassword] = useState(false)
  const [showChangeUserPassword, setShowChangeUserPassword] = useState(false)
  const [showChangeUserConfirmPassword, setShowChangeUserConfirmPassword] = useState(false)
  const { data: shopSettings, mutate: mutateShop } = useSWR(
    '/api/settings',
    fetcher
  )
  const { data: usersData, mutate: mutateUsers } = useSWR('/api/users', fetcher, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    refreshInterval: 0,
    dedupingInterval: 0,
  })
  
  // Use local state to ensure UI updates immediately
  const [users, setUsers] = useState<any[]>([])
  
  useEffect(() => {
    if (usersData) {
      // Handle both array and object responses
      let usersArray: any[] = []
      
      if (Array.isArray(usersData)) {
        usersArray = usersData
      } else if (usersData && typeof usersData === 'object' && usersData.users) {
        usersArray = Array.isArray(usersData.users) ? usersData.users : []
      } else if (usersData && typeof usersData === 'object') {
        // Single user object
        usersArray = [usersData]
      }
      
      // Filter out invalid users and ensure all have required fields
      const validUsers = usersArray
        .filter((u: any) => u && u.id && u.username && u.username.trim())
        .map((u: any) => ({
          id: u.id || '',
          username: u.username || (u.data?.username || ''),
          role: u.role || u.data?.role || 'user',
          isActive: u.isActive !== undefined ? u.isActive : (u.data?.isActive !== undefined ? u.data.isActive : true),
          createdAt: u.createdAt || u.data?.createdAt || new Date().toISOString(),
          updatedAt: u.updatedAt || u.data?.updatedAt || new Date().toISOString(),
        }))
      
      console.log('Users state updated from API:', validUsers.length)
      console.log('User usernames:', validUsers.map((u: any) => u.username))
      setUsers(validUsers)
    } else {
      setUsers([])
    }
  }, [usersData])
  const { data: permissionsData, mutate: mutatePermissions } = useSWR(
    '/api/settings/permissions',
    fetcher
  )
  
  const { data: accessControlData, mutate: mutateAccessControl } = useSWR(
    '/api/settings/access-control',
    fetcher
  )

  const [shopForm, setShopForm] = useState({
    shopName: '',
    shopAddress: '',
    shopEmail: '',
    shopPhone: '',
    currency: '₹',
    taxRate: 0,
    printTextSize: 'medium',
    logoUrl: '',
  })
  const [logoPreview, setLogoPreview] = useState<string>('')

  const [userForm, setUserForm] = useState({
    username: '',
    password: '',
    role: 'user' as 'user' | 'supervisor' | 'admin',
  })
  
  const [multiUserMode, setMultiUserMode] = useState(false)
  const [multiUsers, setMultiUsers] = useState<Array<{username: string, password: string, role: 'user' | 'supervisor' | 'admin'}>>([
    { username: '', password: '', role: 'user' }
  ])
  
  // Permission settings
  const [permissions, setPermissions] = useState({
    recipeDelete: 'supervisor' as 'user' | 'supervisor' | 'admin',
    productionDelete: 'supervisor' as 'user' | 'supervisor' | 'admin',
  })
  
  // Access Control permissions
  const [accessControl, setAccessControl] = useState<any>({})
  
  useEffect(() => {
    if (permissionsData) {
      setPermissions({
        recipeDelete: permissionsData.recipeDelete || 'supervisor',
        productionDelete: permissionsData.productionDelete || 'supervisor',
      })
    }
  }, [permissionsData])
  
  useEffect(() => {
    if (accessControlData) {
      setAccessControl(accessControlData)
    }
  }, [accessControlData])
  
  const handleAccessControlChange = (permissionKey: string, role: 'user' | 'supervisor' | 'admin', value: boolean) => {
    setAccessControl((prev: any) => ({
      ...prev,
      [permissionKey]: {
        ...prev[permissionKey],
        [role]: value
      }
    }))
  }
  
  const handleSaveAccessControl = async () => {
    try {
      const res = await fetch('/api/settings/access-control', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessControl }),
      })
      
      if (res.ok) {
        mutateAccessControl()
        alert('Access control permissions saved successfully!')
      } else {
        alert('Failed to save access control permissions')
      }
    } catch (error) {
      console.error('Error saving access control:', error)
      alert('Failed to save access control permissions')
    }
  }

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
        logoUrl: shopSettings.logoUrl || '',
      })
      setLogoPreview(shopSettings.logoUrl || '')
    }
  }, [shopSettings])

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Check file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert('Logo file size should be less than 2MB')
        return
      }
      
      // Check file type
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file')
        return
      }
      
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64String = reader.result as string
        setLogoPreview(base64String)
        setShopForm({ ...shopForm, logoUrl: base64String })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveLogo = () => {
    setLogoPreview('')
    setShopForm({ ...shopForm, logoUrl: '' })
  }

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
          logoUrl: shopForm.logoUrl,
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
    if (!userForm.username || !userForm.password) {
      alert('Please fill username and password')
      return
    }
    
    if (userForm.password.length < 6) {
      alert('Password must be at least 6 characters long')
      return
    }
    
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: userForm.username.trim(),
          password: userForm.password,
          role: userForm.role || 'user',
        }),
      })
      
      const data = await res.json()
      console.log('User creation response:', data)
      
      if (res.ok || res.status === 201) {
        // Clear form
        setUserForm({ username: '', password: '', role: 'user' })
        setShowUserPassword(false)
        
        // Immediately add to local state
        const createdUser = {
          id: data.id || '',
          username: data.username || userForm.username.trim(),
          role: data.role || userForm.role,
          isActive: data.isActive !== undefined ? data.isActive : true,
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
        }
        
        console.log('Created user data:', createdUser)
        
        // Update local state immediately
        setUsers(prev => {
          // Check if user already exists to avoid duplicates
          const exists = prev.find(u => u.id === createdUser.id || u.username === createdUser.username)
          if (exists) {
            console.log('User already exists in state, updating...')
            return prev.map(u => u.id === createdUser.id || u.username === createdUser.username ? createdUser : u)
          }
          const updated = [createdUser, ...prev]
          console.log('Local users state updated:', updated.length)
          console.log('User usernames in state:', updated.map((u: any) => u.username))
          return updated
        })
        
        // Trigger SWR revalidation after a short delay to ensure API has saved
        setTimeout(() => {
          mutateUsers()
        }, 300)
        
        alert('User created successfully!')
      } else {
        alert(data.error || 'Failed to create user')
      }
    } catch (error) {
      console.error('Error creating user:', error)
      alert('Failed to create user. Please try again.')
    }
  }

  const handleAddMultiUserRow = () => {
    setMultiUsers([...multiUsers, { username: '', password: '', role: 'user' }])
  }

  const handleRemoveMultiUserRow = (index: number) => {
    if (multiUsers.length > 1) {
      setMultiUsers(multiUsers.filter((_, i) => i !== index))
    }
  }

  const handleMultiUserChange = (index: number, field: string, value: any) => {
    const updated = [...multiUsers]
    updated[index] = { ...updated[index], [field]: value }
    setMultiUsers(updated)
  }

  const handleMultiUserCreate = async () => {
    // Validate all users
    const validUsers = multiUsers.filter(u => u.username.trim() && u.password.length >= 6)
    
    if (validUsers.length === 0) {
      alert('Please add at least one valid user (username and password min 6 characters)')
      return
    }

    if (validUsers.length !== multiUsers.length) {
      alert(`Only ${validUsers.length} out of ${multiUsers.length} users are valid. Invalid users will be skipped.`)
    }

    try {
      // Create all users
      const createPromises = validUsers.map(user => 
        fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: user.username.trim(),
            password: user.password,
            role: user.role || 'user',
          }),
        }).then(res => res.json())
      )

      const results = await Promise.all(createPromises)
      const successful = results.filter(r => r.id && r.username)
      const failed = results.filter(r => !r.id || !r.username)

      // Immediately add to local state
      const newUsers = successful.map((data: any) => ({
        id: data.id || '',
        username: data.username || '',
        role: data.role || 'user',
        isActive: data.isActive !== undefined ? data.isActive : true,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
      }))
      
      console.log('Bulk created users:', newUsers.map((u: any) => u.username))
      
      // Update local state immediately
      setUsers(prev => {
        // Filter out duplicates
        const existingIds = new Set(prev.map(u => u.id))
        const existingUsernames = new Set(prev.map(u => u.username))
        const uniqueNewUsers = newUsers.filter(u => 
          !existingIds.has(u.id) && !existingUsernames.has(u.username)
        )
        const updated = [...uniqueNewUsers, ...prev]
        console.log('Local users state updated after bulk:', updated.length)
        return updated
      })
      
      // Trigger SWR revalidation after a short delay
      setTimeout(() => {
        mutateUsers()
      }, 300)

      // Reset form
      setMultiUsers([{ username: '', password: '', role: 'user' }])
      setMultiUserMode(false)

      if (failed.length > 0) {
        alert(`Created ${successful.length} users. ${failed.length} failed.`)
      } else {
        alert(`Successfully created ${successful.length} user(s)!`)
      }
    } catch (error) {
      console.error('Error creating users:', error)
      alert('Failed to create users. Please try again.')
    }
  }

  const handleUserDelete = async (userId: string, username: string) => {
    if (!confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
      return
    }

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        mutateUsers()
        alert('User deleted successfully!')
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to delete user')
      }
    } catch (error) {
      alert('Failed to delete user')
    }
  }

  const [changeUserPasswordForm, setChangeUserPasswordForm] = useState({
    userId: '',
    username: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false)

  const handleChangeUserPassword = async () => {
    if (!changeUserPasswordForm.newPassword || !changeUserPasswordForm.confirmPassword) {
      alert('Please fill all required fields')
      return
    }

    if (changeUserPasswordForm.newPassword !== changeUserPasswordForm.confirmPassword) {
      alert('Passwords do not match')
      return
    }

    if (changeUserPasswordForm.newPassword.length < 6) {
      alert('Password must be at least 6 characters long')
      return
    }

    try {
      const res = await fetch(`/api/users/${changeUserPasswordForm.userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: changeUserPasswordForm.newPassword,
        }),
      })

      if (res.ok) {
        mutateUsers()
        setShowChangePasswordModal(false)
        setChangeUserPasswordForm({ userId: '', username: '', newPassword: '', confirmPassword: '' })
        alert('User password changed successfully!')
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to change password')
      }
    } catch (error) {
      alert('Failed to change password')
    }
  }

  const openChangePasswordModal = (userId: string, username: string) => {
    setChangeUserPasswordForm({
      userId,
      username,
      newPassword: '',
      confirmPassword: '',
    })
    setShowChangePasswordModal(true)
  }

  const handleBackup = async () => {
    if (requireBackupConfirmation) {
      if (!confirm('Are you sure you want to create a backup?')) {
        return
      }
    }

    try {
      const res = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: backupLocation || undefined,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        alert(`Backup created successfully!\nFile: ${data.filename}\n${backupLocation ? `Location: ${backupLocation}` : 'Saved to default location'}`)
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to create backup')
      }
    } catch (error) {
      alert('Failed to create backup')
    }
  }

  const handleForgetPassword = async () => {
    if (!forgetPasswordForm.username || !forgetPasswordForm.username.trim()) {
      alert('Please enter username')
      return
    }

    if (!forgetPasswordForm.newPassword || !forgetPasswordForm.confirmPassword) {
      alert('Please fill all password fields')
      return
    }

    if (forgetPasswordForm.newPassword.length < 6) {
      alert('Password must be at least 6 characters long')
      return
    }

    if (forgetPasswordForm.newPassword !== forgetPasswordForm.confirmPassword) {
      alert('Passwords do not match')
      return
    }

    try {
      const res = await fetch('/api/users/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: forgetPasswordForm.username.trim(),
          newPassword: forgetPasswordForm.newPassword,
        }),
      })

      if (res.ok) {
        alert('Password reset successfully!')
        setForgetPasswordForm({ username: '', newPassword: '', confirmPassword: '' })
        setShowForgetPassword(false)
        setShowForgetConfirmPassword(false)
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to reset password')
      }
    } catch (error) {
      alert('Failed to reset password')
    }
  }

  const handleChangePassword = async () => {
    if (!changePasswordForm.currentPassword || !changePasswordForm.newPassword || !changePasswordForm.confirmPassword) {
      alert('Please fill all required fields')
      return
    }

    if (changePasswordForm.newPassword !== changePasswordForm.confirmPassword) {
      alert('New passwords do not match')
      return
    }

    if (changePasswordForm.newPassword.length < 6) {
      alert('New password must be at least 6 characters long')
      return
    }

    try {
      // Get current user from localStorage
      const userStr = localStorage.getItem('rfb_user')
      const user = userStr ? JSON.parse(userStr) : null
      
      if (!user || !user.username) {
        alert('Please login first')
        return
      }

      const res = await fetch('/api/users/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: user.username,
          currentPassword: changePasswordForm.currentPassword,
          newPassword: changePasswordForm.newPassword,
        }),
      })

      if (res.ok) {
        alert('Password changed successfully!')
        setChangePasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to change password')
      }
    } catch (error) {
      alert('Failed to change password')
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
          <button
            onClick={() => setActiveTab('access')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'access'
                ? 'border-b-2 border-primary-600 text-primary-600'
                : 'text-gray-600'
            }`}
          >
            <Shield size={18} className="inline mr-2" />
            Access Control
          </button>
        </div>

        {activeTab === 'shop' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Shop Information</h3>
            <div className="space-y-4">
              {/* Logo Upload Section */}
              <div className="border-b border-gray-200 pb-4 mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Shop Logo
                </label>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    {logoPreview ? (
                      <div className="relative">
                        <img
                          src={logoPreview}
                          alt="Shop Logo Preview"
                          className="w-32 h-32 object-contain border border-gray-300 rounded-lg"
                        />
                        <button
                          onClick={handleRemoveLogo}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                          title="Remove Logo"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                        <div className="text-center">
                          <Upload size={24} className="mx-auto text-gray-400 mb-2" />
                          <p className="text-xs text-gray-500">No Logo</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                      id="logo-upload"
                    />
                    <label
                      htmlFor="logo-upload"
                      className="inline-block px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 cursor-pointer mb-2"
                    >
                      <Upload size={18} className="inline mr-2" />
                      {logoPreview ? 'Change Logo' : 'Upload Logo'}
                    </label>
                    <p className="text-xs text-gray-500 mt-2">
                      Recommended: Square image, max 2MB (PNG, JPG, SVG)
                    </p>
                    {logoPreview && (
                      <button
                        onClick={handleRemoveLogo}
                        className="mt-2 text-sm text-red-600 hover:text-red-800"
                      >
                        Remove Logo
                      </button>
                    )}
                  </div>
                </div>
              </div>
              
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
                  placeholder="Enter shop name"
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
                  placeholder="Enter shop address"
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
            {/* Permission Settings */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Delete Permissions</h3>
              <div className="space-y-4">
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800 mb-3">
                    Set minimum user level required to delete recipes and production logs.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Recipe Delete Permission
                      </label>
                      <select
                        value={permissions.recipeDelete}
                        onChange={(e) => setPermissions({ ...permissions, recipeDelete: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="user">User (All users can delete)</option>
                        <option value="supervisor">Supervisor (Supervisor & Admin only)</option>
                        <option value="admin">Admin (Admin only)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Production Delete Permission
                      </label>
                      <select
                        value={permissions.productionDelete}
                        onChange={(e) => setPermissions({ ...permissions, productionDelete: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="user">User (All users can delete)</option>
                        <option value="supervisor">Supervisor (Supervisor & Admin only)</option>
                        <option value="admin">Admin (Admin only)</option>
                      </select>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/settings/permissions', {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(permissions),
                        })
                        if (res.ok) {
                          mutatePermissions()
                          alert('Permissions saved successfully!')
                        } else {
                          alert('Failed to save permissions')
                        }
                      } catch (error) {
                        alert('Failed to save permissions')
                      }
                    }}
                    className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    Save Permissions
                  </button>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Create New User</h3>
                <button
                  onClick={() => {
                    setMultiUserMode(!multiUserMode)
                    if (!multiUserMode) {
                      setMultiUsers([{ username: '', password: '', role: 'user' }])
                    }
                  }}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  {multiUserMode ? 'Single User Mode' : 'Multi User Mode'}
                </button>
              </div>
              
              {!multiUserMode ? (
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
                  <div className="relative">
                  <input
                      type={showUserPassword ? 'text' : 'password'}
                    value={userForm.password}
                    onChange={(e) =>
                      setUserForm({ ...userForm, password: e.target.value })
                    }
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="Enter password (min 6 characters)"
                    />
                    <button
                      type="button"
                      onClick={() => setShowUserPassword(!showUserPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showUserPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    value={userForm.role}
                    onChange={(e) =>
                      setUserForm({ ...userForm, role: e.target.value as 'user' | 'supervisor' | 'admin' })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="user">User</option>
                    <option value="supervisor">Supervisor</option>
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
              ) : (
              <div className="space-y-4">
                <div className="text-sm text-gray-600 mb-4">
                  Add multiple users at once. Each user needs a unique username and password (min 6 characters).
                </div>
                {multiUsers.map((user, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 border border-gray-200 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Username
                      </label>
                      <input
                        type="text"
                        value={user.username}
                        onChange={(e) => handleMultiUserChange(index, 'username', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        placeholder="Enter username"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Password
                      </label>
                      <input
                        type="password"
                        value={user.password}
                        onChange={(e) => handleMultiUserChange(index, 'password', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        placeholder="Min 6 characters"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Role
                      </label>
                      <select
                        value={user.role}
                        onChange={(e) => handleMultiUserChange(index, 'role', e.target.value as 'user' | 'supervisor' | 'admin')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="user">User</option>
                        <option value="supervisor">Supervisor</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div className="flex items-end gap-2">
                      <button
                        onClick={() => handleAddMultiUserRow()}
                        className="px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm"
                        title="Add Row"
                      >
                        + Add
                      </button>
                      {multiUsers.length > 1 && (
                        <button
                          onClick={() => handleRemoveMultiUserRow(index)}
                          className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm"
                          title="Remove Row"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                <div className="flex justify-end">
                  <button
                    onClick={handleMultiUserCreate}
                    className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    Create {multiUsers.filter(u => u.username.trim() && u.password.length >= 6).length} User(s)
                  </button>
                </div>
              </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              {!users || (Array.isArray(users) && users.length === 0) ? (
                <div className="p-4 text-center text-gray-500">No users found</div>
              ) : (
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users && Array.isArray(users) && users.length > 0 ? (
                    users.map((user: any) => (
                      user && user.id && user.username ? (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {user.username || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            user.role === 'admin'
                              ? 'bg-purple-100 text-purple-800'
                                  : user.role === 'supervisor'
                                  ? 'bg-orange-100 text-orange-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                              {user.role || 'user'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {user.isActive !== false ? (
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
                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => openChangePasswordModal(user.id, user.username || '')}
                                className="text-blue-600 hover:text-blue-800 font-medium"
                                title="Change Password"
                              >
                                Change Password
                              </button>
                              <button
                                onClick={() => handleUserDelete(user.id, user.username || '')}
                                className="text-red-600 hover:text-red-800 font-medium"
                                title="Delete User"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : null
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                        No users found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              )}
            </div>

            {/* Change User Password Modal */}
            {showChangePasswordModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                  <h3 className="text-lg font-semibold mb-4">
                    Change Password for {changeUserPasswordForm.username}
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        New Password *
                      </label>
                      <div className="relative">
                        <input
                          type={showChangeUserPassword ? 'text' : 'password'}
                          value={changeUserPasswordForm.newPassword}
                          onChange={(e) => setChangeUserPasswordForm({ ...changeUserPasswordForm, newPassword: e.target.value })}
                          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                          placeholder="Enter new password (min 6 characters)"
                        />
                        <button
                          type="button"
                          onClick={() => setShowChangeUserPassword(!showChangeUserPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showChangeUserPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Confirm New Password *
                      </label>
                      <div className="relative">
                        <input
                          type={showChangeUserConfirmPassword ? 'text' : 'password'}
                          value={changeUserPasswordForm.confirmPassword}
                          onChange={(e) => setChangeUserPasswordForm({ ...changeUserPasswordForm, confirmPassword: e.target.value })}
                          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                          placeholder="Confirm new password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowChangeUserConfirmPassword(!showChangeUserConfirmPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showChangeUserConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={handleChangeUserPassword}
                        className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                      >
                        Change Password
                      </button>
                      <button
                        onClick={() => {
                          setShowChangePasswordModal(false)
                          setChangeUserPasswordForm({ userId: '', username: '', newPassword: '', confirmPassword: '' })
                        }}
                        className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Backup Location (Optional)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={backupLocation}
                      onChange={(e) => setBackupLocation(e.target.value)}
                      placeholder="e.g., /Users/ramelumalai/backups"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                    <button
                      onClick={() => {
                        const location = prompt('Enter backup location path:')
                        if (location) setBackupLocation(location)
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 flex items-center gap-2"
                    >
                      <FolderOpen size={18} />
                      Browse
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Leave empty to save to default location
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="requireConfirmation"
                    checked={requireBackupConfirmation}
                    onChange={(e) => setRequireBackupConfirmation(e.target.checked)}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <label htmlFor="requireConfirmation" className="text-sm text-gray-700">
                    Require confirmation before creating backup
                  </label>
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
          </div>
        )}

        {activeTab === 'access' && (
          <div className="space-y-6">
            {/* Access Control Matrix */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    User Access Control
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Control what each user role can access and modify
                  </p>
                </div>
              </div>

              {/* Role Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    <h4 className="font-semibold text-blue-900">User</h4>
                  </div>
                  <p className="text-sm text-blue-700">
                    Basic access for regular users. Can view and create data.
                  </p>
                </div>
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-5 h-5 text-yellow-600" />
                    <h4 className="font-semibold text-yellow-900">Supervisor</h4>
                  </div>
                  <p className="text-sm text-yellow-700">
                    Enhanced access. Can edit and delete most data.
                  </p>
                </div>
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Lock className="w-5 h-5 text-red-600" />
                    <h4 className="font-semibold text-red-900">Admin</h4>
                  </div>
                  <p className="text-sm text-red-700">
                    Full access. Can manage all settings and users.
                  </p>
                </div>
              </div>

              {/* Access Control Table - Interactive */}
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Admin Control:</strong> Toggle permissions for each role. Changes will be saved when you click &quot;Save Permissions&quot; button.
                </p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Feature / Module
                      </th>
                      <th className="border border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-700">
                        User
                      </th>
                      <th className="border border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-700">
                        Supervisor
                      </th>
                      <th className="border border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-700">
                        Admin
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Dashboard */}
                    <tr className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-3 text-sm font-medium text-gray-800">
                        Dashboard - View
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={accessControl.dashboard_view?.user ?? true}
                          onChange={(e) => handleAccessControlChange('dashboard_view', 'user', e.target.checked)}
                          className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                        />
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={accessControl.dashboard_view?.supervisor ?? true}
                          onChange={(e) => handleAccessControlChange('dashboard_view', 'supervisor', e.target.checked)}
                          className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                        />
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={accessControl.dashboard_view?.admin ?? true}
                          onChange={(e) => handleAccessControlChange('dashboard_view', 'admin', e.target.checked)}
                          className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                          disabled
                        />
                      </td>
                    </tr>

                    {/* Raw Materials */}
                    <tr className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-3 text-sm font-medium text-gray-800">
                        Raw Materials - View
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={accessControl.raw_materials_view?.user ?? true}
                          onChange={(e) => handleAccessControlChange('raw_materials_view', 'user', e.target.checked)}
                          className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                        />
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={accessControl.raw_materials_view?.supervisor ?? true}
                          onChange={(e) => handleAccessControlChange('raw_materials_view', 'supervisor', e.target.checked)}
                          className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                        />
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={accessControl.raw_materials_view?.admin ?? true}
                          onChange={(e) => handleAccessControlChange('raw_materials_view', 'admin', e.target.checked)}
                          className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                          disabled
                        />
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-3 text-sm text-gray-600 pl-8">
                        - Add / Edit
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={accessControl.raw_materials_add_edit?.user ?? true}
                          onChange={(e) => handleAccessControlChange('raw_materials_add_edit', 'user', e.target.checked)}
                          className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                        />
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={accessControl.raw_materials_add_edit?.supervisor ?? true}
                          onChange={(e) => handleAccessControlChange('raw_materials_add_edit', 'supervisor', e.target.checked)}
                          className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                        />
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={accessControl.raw_materials_add_edit?.admin ?? true}
                          onChange={(e) => handleAccessControlChange('raw_materials_add_edit', 'admin', e.target.checked)}
                          className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                          disabled
                        />
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-3 text-sm text-gray-600 pl-8">
                        - Delete
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={accessControl.raw_materials_delete?.user ?? false}
                          onChange={(e) => handleAccessControlChange('raw_materials_delete', 'user', e.target.checked)}
                          className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                        />
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={accessControl.raw_materials_delete?.supervisor ?? true}
                          onChange={(e) => handleAccessControlChange('raw_materials_delete', 'supervisor', e.target.checked)}
                          className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                        />
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={accessControl.raw_materials_delete?.admin ?? true}
                          onChange={(e) => handleAccessControlChange('raw_materials_delete', 'admin', e.target.checked)}
                          className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                          disabled
                        />
                      </td>
                    </tr>

                    {/* Purchases */}
                    <tr className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-3 text-sm font-medium text-gray-800">
                        Purchases - View
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={accessControl.purchases_view?.user ?? true}
                          onChange={(e) => handleAccessControlChange('purchases_view', 'user', e.target.checked)}
                          className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                        />
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={accessControl.purchases_view?.supervisor ?? true}
                          onChange={(e) => handleAccessControlChange('purchases_view', 'supervisor', e.target.checked)}
                          className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                        />
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={accessControl.purchases_view?.admin ?? true}
                          onChange={(e) => handleAccessControlChange('purchases_view', 'admin', e.target.checked)}
                          className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                          disabled
                        />
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-3 text-sm text-gray-600 pl-8">
                        - Add / Edit
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={accessControl.purchases_add_edit?.user ?? true}
                          onChange={(e) => handleAccessControlChange('purchases_add_edit', 'user', e.target.checked)}
                          className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                        />
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={accessControl.purchases_add_edit?.supervisor ?? true}
                          onChange={(e) => handleAccessControlChange('purchases_add_edit', 'supervisor', e.target.checked)}
                          className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                        />
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={accessControl.purchases_add_edit?.admin ?? true}
                          onChange={(e) => handleAccessControlChange('purchases_add_edit', 'admin', e.target.checked)}
                          className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                          disabled
                        />
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-3 text-sm text-gray-600 pl-8">
                        - Delete
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={accessControl.purchases_delete?.user ?? false}
                          onChange={(e) => handleAccessControlChange('purchases_delete', 'user', e.target.checked)}
                          className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                        />
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={accessControl.purchases_delete?.supervisor ?? true}
                          onChange={(e) => handleAccessControlChange('purchases_delete', 'supervisor', e.target.checked)}
                          className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                        />
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={accessControl.purchases_delete?.admin ?? true}
                          onChange={(e) => handleAccessControlChange('purchases_delete', 'admin', e.target.checked)}
                          className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                          disabled
                        />
                      </td>
                    </tr>

                    {/* Recipes */}
                    <tr className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-3 text-sm font-medium text-gray-800">
                        Recipes - View
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <span className="text-green-600 font-semibold">✓</span>
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <span className="text-green-600 font-semibold">✓</span>
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <span className="text-green-600 font-semibold">✓</span>
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-3 text-sm text-gray-600 pl-8">
                        - Add / Edit
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <span className="text-green-600 font-semibold">✓</span>
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <span className="text-green-600 font-semibold">✓</span>
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <span className="text-green-600 font-semibold">✓</span>
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50 bg-yellow-50">
                      <td className="border border-gray-300 px-4 py-3 text-sm text-gray-600 pl-8">
                        - Delete (Configurable)
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <span className={`font-semibold ${permissions.recipeDelete === 'user' ? 'text-green-600' : 'text-red-600'}`}>
                          {permissions.recipeDelete === 'user' ? '✓' : '✗'}
                        </span>
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <span className={`font-semibold ${permissions.recipeDelete !== 'admin' ? 'text-green-600' : 'text-red-600'}`}>
                          {permissions.recipeDelete !== 'admin' ? '✓' : '✗'}
                        </span>
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <span className="text-green-600 font-semibold">✓</span>
                      </td>
                    </tr>

                    {/* Production */}
                    <tr className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-3 text-sm font-medium text-gray-800">
                        Production - View
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <span className="text-green-600 font-semibold">✓</span>
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <span className="text-green-600 font-semibold">✓</span>
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <span className="text-green-600 font-semibold">✓</span>
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-3 text-sm text-gray-600 pl-8">
                        - Add / Edit
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <span className="text-green-600 font-semibold">✓</span>
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <span className="text-green-600 font-semibold">✓</span>
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <span className="text-green-600 font-semibold">✓</span>
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50 bg-yellow-50">
                      <td className="border border-gray-300 px-4 py-3 text-sm text-gray-600 pl-8">
                        - Delete (Configurable)
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <span className={`font-semibold ${permissions.productionDelete === 'user' ? 'text-green-600' : 'text-red-600'}`}>
                          {permissions.productionDelete === 'user' ? '✓' : '✗'}
                        </span>
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <span className={`font-semibold ${permissions.productionDelete !== 'admin' ? 'text-green-600' : 'text-red-600'}`}>
                          {permissions.productionDelete !== 'admin' ? '✓' : '✗'}
                        </span>
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <span className="text-green-600 font-semibold">✓</span>
                      </td>
                    </tr>

                    {/* Cost Calculator */}
                    <tr className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-3 text-sm font-medium text-gray-800">
                        Cost Calculator - View
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <span className="text-green-600 font-semibold">✓</span>
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <span className="text-green-600 font-semibold">✓</span>
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <span className="text-green-600 font-semibold">✓</span>
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-3 text-sm text-gray-600 pl-8">
                        - Calculate & Produce
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <span className="text-green-600 font-semibold">✓</span>
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <span className="text-green-600 font-semibold">✓</span>
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <span className="text-green-600 font-semibold">✓</span>
                      </td>
                    </tr>

                    {/* Reports */}
                    <tr className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-3 text-sm font-medium text-gray-800">
                        Reports - View
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <span className="text-green-600 font-semibold">✓</span>
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <span className="text-green-600 font-semibold">✓</span>
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <span className="text-green-600 font-semibold">✓</span>
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-3 text-sm text-gray-600 pl-8">
                        - Reset Counters
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <span className="text-red-600 font-semibold">✗</span>
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <span className="text-green-600 font-semibold">✓</span>
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <span className="text-green-600 font-semibold">✓</span>
                      </td>
                    </tr>

                    {/* Settings */}
                    <tr className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-3 text-sm font-medium text-gray-800">
                        Settings - View
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <span className="text-green-600 font-semibold">✓</span>
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <span className="text-green-600 font-semibold">✓</span>
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <span className="text-green-600 font-semibold">✓</span>
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-3 text-sm text-gray-600 pl-8">
                        - Shop Settings
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <span className="text-red-600 font-semibold">✗</span>
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <span className="text-green-600 font-semibold">✓</span>
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <span className="text-green-600 font-semibold">✓</span>
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-3 text-sm text-gray-600 pl-8">
                        - User Management
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <span className="text-red-600 font-semibold">✗</span>
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <span className="text-red-600 font-semibold">✗</span>
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <span className="text-green-600 font-semibold">✓</span>
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-3 text-sm text-gray-600 pl-8">
                        - Access Control
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <span className="text-red-600 font-semibold">✗</span>
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <span className="text-red-600 font-semibold">✗</span>
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <span className="text-green-600 font-semibold">✓</span>
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-3 text-sm text-gray-600 pl-8">
                        - Backup & Restore
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <span className="text-red-600 font-semibold">✗</span>
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <span className="text-green-600 font-semibold">✓</span>
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <span className="text-green-600 font-semibold">✓</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleSaveAccessControl}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium flex items-center gap-2"
                >
                  <Shield className="w-5 h-5" />
                  Save Permissions
                </button>
              </div>
              
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Admin always has full access. Check/uncheck boxes to control User and Supervisor permissions. Click &quot;Save Permissions&quot; to apply changes.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

