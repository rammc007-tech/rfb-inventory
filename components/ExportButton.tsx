'use client'

import { useState } from 'react'
import { Download, FileSpreadsheet, FileText, FileJson, ChevronDown } from 'lucide-react'
import { downloadAsCSV, downloadAsExcel, downloadAsJSON, formatDataForExport, cleanColumnNames } from '@/lib/export-utils'

interface ExportButtonProps {
  data: any[]
  filename: string
  label?: string
  variant?: 'button' | 'icon'
  cleanData?: boolean
}

export default function ExportButton({ 
  data, 
  filename, 
  label = 'Export',
  variant = 'button',
  cleanData = true
}: ExportButtonProps) {
  const [showMenu, setShowMenu] = useState(false)

  const handleExport = (format: 'csv' | 'excel' | 'json') => {
    setShowMenu(false)

    if (!data || data.length === 0) {
      alert('No data to export')
      return
    }

    // Process data
    let exportData = [...data]
    
    if (cleanData) {
      exportData = formatDataForExport(exportData)
      exportData = cleanColumnNames(exportData)
    }

    // Add metadata
    const timestamp = new Date().toISOString().split('T')[0]
    const filenameWithDate = `${filename}_${timestamp}`

    // Download based on format
    switch (format) {
      case 'csv':
        downloadAsCSV(exportData, filenameWithDate)
        break
      case 'excel':
        downloadAsExcel(exportData, filenameWithDate)
        break
      case 'json':
        downloadAsJSON(exportData, filenameWithDate)
        break
    }
  }

  if (variant === 'icon') {
    return (
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          title="Export data"
        >
          <Download className="w-5 h-5" />
        </button>

        {showMenu && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setShowMenu(false)}
            />

            {/* Menu */}
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
              <button
                onClick={() => handleExport('excel')}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4 text-green-600" />
                Export as Excel
              </button>
              <button
                onClick={() => handleExport('csv')}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              >
                <FileText className="w-4 h-4 text-blue-600" />
                Export as CSV
              </button>
              <button
                onClick={() => handleExport('json')}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              >
                <FileJson className="w-4 h-4 text-purple-600" />
                Export as JSON
              </button>
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
      >
        <Download className="w-4 h-4" />
        {label}
        <ChevronDown className="w-4 h-4" />
      </button>

      {showMenu && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setShowMenu(false)}
          />

          {/* Menu */}
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
            <button
              onClick={() => handleExport('excel')}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4 text-green-600" />
              Excel (.xls)
            </button>
            <button
              onClick={() => handleExport('csv')}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
            >
              <FileText className="w-4 h-4 text-blue-600" />
              CSV (.csv)
            </button>
            <button
              onClick={() => handleExport('json')}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
            >
              <FileJson className="w-4 h-4 text-purple-600" />
              JSON (.json)
            </button>
          </div>
        </>
      )}
    </div>
  )
}

