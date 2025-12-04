// Export utilities for downloading data as Excel/CSV

export function downloadAsCSV(data: any[], filename: string) {
  if (!data || data.length === 0) {
    alert('No data to export')
    return
  }

  // Get headers from first object
  const headers = Object.keys(data[0])
  
  // Create CSV content
  const csvContent = [
    headers.join(','), // Header row
    ...data.map(row => 
      headers.map(header => {
        const value = row[header]
        // Handle values with commas, quotes, newlines
        if (value === null || value === undefined) return ''
        const stringValue = String(value)
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`
        }
        return stringValue
      }).join(',')
    )
  ].join('\n')

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function downloadAsExcel(data: any[], filename: string) {
  if (!data || data.length === 0) {
    alert('No data to export')
    return
  }

  // Get headers from first object
  const headers = Object.keys(data[0])
  
  // Create HTML table
  const htmlTable = `
    <table>
      <thead>
        <tr>
          ${headers.map(h => `<th>${h}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${data.map(row => `
          <tr>
            ${headers.map(h => `<td>${row[h] ?? ''}</td>`).join('')}
          </tr>
        `).join('')}
      </tbody>
    </table>
  `

  // Create blob with Excel MIME type
  const blob = new Blob([htmlTable], { 
    type: 'application/vnd.ms-excel;charset=utf-8;' 
  })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}.xls`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function downloadAsJSON(data: any[], filename: string) {
  if (!data || data.length === 0) {
    alert('No data to export')
    return
  }

  const jsonContent = JSON.stringify(data, null, 2)
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}.json`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// Format data for export (clean up dates, numbers, etc.)
export function formatDataForExport(data: any[]): any[] {
  return data.map(item => {
    const formatted: any = {}
    
    for (const [key, value] of Object.entries(item)) {
      // Skip internal fields
      if (key === 'id' || key === 'userId' || key === 'createdAt' || key === 'updatedAt') {
        continue
      }
      
      // Format dates
      if (value instanceof Date) {
        formatted[key] = value.toLocaleDateString()
      }
      // Format numbers
      else if (typeof value === 'number') {
        formatted[key] = value
      }
      // Format booleans
      else if (typeof value === 'boolean') {
        formatted[key] = value ? 'Yes' : 'No'
      }
      // Handle null/undefined
      else if (value === null || value === undefined) {
        formatted[key] = ''
      }
      // Everything else
      else {
        formatted[key] = value
      }
    }
    
    return formatted
  })
}

// Clean column names for better readability
export function cleanColumnNames(data: any[]): any[] {
  return data.map(item => {
    const cleaned: any = {}
    
    for (const [key, value] of Object.entries(item)) {
      // Convert camelCase to Title Case
      const cleanKey = key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim()
      
      cleaned[cleanKey] = value
    }
    
    return cleaned
  })
}

