'use client'

import { DashboardLayout } from '@/components/DashboardLayout'
import Link from 'next/link'
import { Users, Shield, Database, RotateCcw } from 'lucide-react'

export default function SettingsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Settings</h2>
          <p className="text-gray-600 mt-1">Manage system settings</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link
            href="/settings/users"
            className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
          >
            <Users className="h-8 w-8 text-primary mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">User Management</h3>
            <p className="text-sm text-gray-600">
              Create, edit, and manage user accounts and roles
            </p>
          </Link>

          <Link
            href="/settings/access"
            className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
          >
            <Shield className="h-8 w-8 text-primary mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Control</h3>
            <p className="text-sm text-gray-600">
              Configure module-level permissions for users
            </p>
          </Link>

          <Link
            href="/settings/backup"
            className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
          >
            <Database className="h-8 w-8 text-primary mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Backup</h3>
            <p className="text-sm text-gray-600">
              Backup and restore system data
            </p>
          </Link>

          <Link
            href="/settings/reset"
            className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
          >
            <RotateCcw className="h-8 w-8 text-primary mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Reset Options</h3>
            <p className="text-sm text-gray-600">
              Reset daily counters and system statistics
            </p>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  )
}

