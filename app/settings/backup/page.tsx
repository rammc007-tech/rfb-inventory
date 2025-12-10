'use client'

import { DashboardLayout } from '@/components/DashboardLayout'
import { Download, Upload } from 'lucide-react'
import { useState } from 'react'

export default function BackupPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleDownloadBackup = async () => {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/backup/download')
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to download backup')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `rfb-backup-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setSuccess('Backup downloaded successfully')
    } catch (error: any) {
      setError(error.message || 'Failed to download backup')
    } finally {
      setLoading(false)
    }
  }

  const handleUploadBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setError('')
    setSuccess('')

    // Validate file type
    if (!file.name.endsWith('.json')) {
      setError('Please upload a JSON file')
      setLoading(false)
      return
    }

    try {
      const fileContent = await file.text()
      const backupData = JSON.parse(fileContent)

      // Validate backup structure
      if (!backupData || typeof backupData !== 'object') {
        throw new Error('Invalid backup file format')
      }

      const response = await fetch('/api/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backupData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to restore backup')
      }

      setSuccess('Backup restored successfully. Please refresh the page.')
      
      // Reset file input
      e.target.value = ''
    } catch (error: any) {
      setError(error.message || 'Failed to restore backup')
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Backup & Restore</h2>
          <p className="text-gray-600 mt-1">Backup and restore system data</p>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Backup</h3>
            <p className="text-sm text-gray-600 mb-4">
              Download a backup of all system data in JSON format. This includes all items, recipes, purchases, productions, suppliers, and users.
            </p>
            <button
              onClick={handleDownloadBackup}
              disabled={loading}
              className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-md hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-5 w-5" />
              {loading ? 'Downloading...' : 'Download Backup'}
            </button>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Restore Backup</h3>
            <p className="text-sm text-gray-600 mb-4">
              Upload a backup file to restore system data. <strong className="text-red-600">Warning: This will replace all existing data!</strong>
            </p>
            <label className="flex items-center gap-2 border border-gray-300 px-4 py-2 rounded-md hover:bg-gray-50 cursor-pointer">
              <Upload className="h-5 w-5" />
              <span>{loading ? 'Uploading...' : 'Upload Backup'}</span>
              <input
                type="file"
                accept=".json"
                onChange={handleUploadBackup}
                disabled={loading}
                className="hidden"
              />
            </label>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-semibold text-yellow-900 mb-2">Important Notes:</h4>
          <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
            <li>Backups include all data: items, recipes, purchases, productions, suppliers, and users</li>
            <li>Restoring a backup will replace all existing data</li>
            <li>Always create a backup before restoring</li>
            <li>Backup files are in JSON format</li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  )
}
