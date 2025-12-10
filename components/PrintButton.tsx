'use client'

import { Printer, Eye, Download, ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

interface PrintButtonProps {
  endpoint: string
  options: {
    title: string
    subtitle?: string
    columns: Array<{ header: string; dataKey: string; width?: number }>
    data: any[]
    filename?: string
    showDate?: boolean
  }
  className?: string
}

export function PrintButton({ endpoint, options, className }: PrintButtonProps) {
  const [loading, setLoading] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMenu])

  const generatePDF = async (): Promise<Blob | null> => {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          options: {
            ...options,
            filename: options.filename || 'document',
          }
        }),
      })

      if (response.ok) {
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/pdf')) {
          const blob = await response.blob()
          return blob
        } else {
          const errorData = await response.json().catch(() => ({}))
          alert(`Failed to generate PDF: ${errorData.error || errorData.details || 'Unknown error'}`)
          return null
        }
      } else {
        try {
          const errorData = await response.json()
          alert(`Failed to generate PDF: ${errorData.error || errorData.details || 'Server error'}`)
        } catch {
          alert(`Failed to generate PDF: HTTP ${response.status}`)
        }
        return null
      }
    } catch (error: any) {
      console.error('Error generating PDF:', error)
      alert(`Failed to generate PDF: ${error?.message || 'Network error'}`)
      return null
    }
  }

  const handleDownload = async () => {
    setLoading(true)
    setShowMenu(false)
    try {
      const blob = await generatePDF()
      if (blob) {
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${options.filename || 'document'}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } finally {
      setLoading(false)
    }
  }

  const handlePreview = async () => {
    setLoading(true)
    setShowMenu(false)
    try {
      const blob = await generatePDF()
      if (blob) {
        const url = window.URL.createObjectURL(blob)
        // Open in new window for preview
        const printWindow = window.open(url, '_blank')
        if (printWindow) {
          printWindow.focus()
          // Clean up URL after a delay
          setTimeout(() => {
            // Don't revoke immediately, let user view it
          }, 100)
        } else {
          alert('Please allow popups to preview the PDF')
          window.URL.revokeObjectURL(url)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDirectPrint = async () => {
    setLoading(true)
    setShowMenu(false)
    try {
      const blob = await generatePDF()
      if (blob) {
        const url = window.URL.createObjectURL(blob)
        const printWindow = window.open(url, '_blank')
        if (printWindow) {
          printWindow.onload = () => {
            // Wait a bit for PDF to load, then trigger print
            setTimeout(() => {
              printWindow.print()
              // Clean up after printing dialog closes
              setTimeout(() => {
                window.URL.revokeObjectURL(url)
                printWindow.close()
              }, 1000)
            }, 500)
          }
        } else {
          alert('Please allow popups to print the PDF')
          window.URL.revokeObjectURL(url)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative inline-block" ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={loading}
        className={className || 'flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed bg-white'}
      >
        <Printer className="h-5 w-5" />
        {loading ? 'Generating...' : 'Print'}
        <ChevronDown className="h-4 w-4" />
      </button>
      
      {showMenu && (
        <div className="absolute right-0 mt-1 w-56 bg-white rounded-md shadow-lg border border-gray-200 z-50">
          <button
            onClick={handleDownload}
            disabled={loading}
            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            <Download className="h-4 w-4 text-gray-600" />
            <span>Download PDF</span>
          </button>
          <button
            onClick={handlePreview}
            disabled={loading}
            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm border-t border-gray-200"
          >
            <Eye className="h-4 w-4 text-gray-600" />
            <span>Preview PDF</span>
          </button>
          <button
            onClick={handleDirectPrint}
            disabled={loading}
            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm border-t border-gray-200"
          >
            <Printer className="h-4 w-4 text-gray-600" />
            <span>Print Directly</span>
          </button>
        </div>
      )}
    </div>
  )
}
