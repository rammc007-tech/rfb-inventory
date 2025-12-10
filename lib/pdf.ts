// PDF generation using pdfkit
// Server-side only - use require to avoid Next.js bundling issues

export interface PDFTableColumn {
  header: string
  dataKey: string
  width?: number
}

export interface PDFOptions {
  title: string
  subtitle?: string
  columns: PDFTableColumn[]
  data: any[]
  filename?: string
  showDate?: boolean
  detailedBreakdown?: Array<{
    recipeName: string
    date: string
    quantity: string
    ingredients: Array<{
      itemName: string
      quantity: string
      unitCost: string
      total: string
    }>
    laborCost: string
    overheadCost: string
    totalCost: string
    costPerUnit: string
  }>
  summary?: {
    totalProductions?: number
    totalQuantity?: string
    totalCost?: string
  }
  dailyTotals?: Array<{
    date: string
    total: string
  }>
  monthlyTotals?: Array<{
    month: string
    total: string
  }>
  grandTotal?: string
  recipeDetails?: Array<{
    recipeName: string
    description: string
    yield: string
    ingredients: Array<{
      itemName: string
      quantity: string
      unit: string
    }>
  }>
}

export async function generatePDF(options: PDFOptions): Promise<Buffer> {
  // Helper function to replace ₹ with Rs. for PDFKit compatibility
  // PDFKit's default Helvetica font doesn't support ₹ Unicode character
  const replaceRupeeSymbol = (text: string): string => {
    if (typeof text !== 'string') return String(text)
    return text.replace(/₹/g, 'Rs.')
  }
      // Use require for server-side only
      // eslint-disable-next-line
      const PDFDocument = require('pdfkit')
  
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        margin: 50, 
        size: 'A4',
        autoFirstPage: true
      })
      const buffers: Buffer[] = []
      
      doc.on('data', (chunk: Buffer) => {
        buffers.push(chunk)
      })
      
      doc.on('end', () => {
        resolve(Buffer.concat(buffers))
      })
      
      doc.on('error', (err: Error) => {
        console.error('PDF stream error:', err)
        reject(err)
      })
      
      try {
        // Add RFB Header
        doc.fillColor('#D64545')
        doc.rect(0, 0, 595, 85)
        doc.fill()
        
        doc.fillColor('#FFFFFF')
        doc.fontSize(20)
        doc.font('Helvetica-Bold')
        doc.text('RFB', 50, 20)
        doc.fontSize(12)
        doc.font('Helvetica')
        doc.text('RISHA FOODS AND BAKERY', 50, 45)
        
        // Reset colors
        doc.fillColor('#000000')
        doc.strokeColor('#000000')
        
        let yPosition = 100
        
        // Title
        doc.fontSize(16)
        doc.font('Helvetica-Bold')
        doc.text(options.title || 'Report', 50, yPosition)
        yPosition += 20
        
        // Subtitle
        if (options.subtitle) {
          doc.fontSize(12)
          doc.font('Helvetica')
          doc.text(options.subtitle, 50, yPosition, { width: 495, lineGap: 2 })
          yPosition += 20
        }
        
        // Date
        if (options.showDate !== false) {
          const date = new Date().toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
          doc.fontSize(10)
          doc.font('Helvetica')
          doc.text(`Generated on: ${date}`, 50, yPosition)
          yPosition += 20
        }
        
        // If recipe details are provided, use detailed recipe format
        if (options.recipeDetails && options.recipeDetails.length > 0) {
          // Recipe Details Format
          options.recipeDetails.forEach((recipe, recipeIndex) => {
            // Check if we need a new page
            if (yPosition > 700) {
              doc.addPage()
              yPosition = 50
            }
            
            // Recipe Header
            doc.fontSize(14)
            doc.font('Helvetica-Bold')
            doc.text(recipe.recipeName, 50, yPosition)
            yPosition += 20
            
            // Description
            if (recipe.description && recipe.description !== '-') {
              doc.fontSize(10)
              doc.font('Helvetica')
              doc.text(`Description: ${recipe.description}`, 50, yPosition, { width: 495 })
              yPosition += 20
            }
            
            // Yield
            doc.fontSize(10)
            doc.font('Helvetica')
            doc.text(`Yield: ${recipe.yield}`, 50, yPosition)
            yPosition += 20
            
            // Ingredients Header
            doc.fontSize(11)
            doc.font('Helvetica-Bold')
            doc.text('Ingredients:', 50, yPosition)
            yPosition += 20
            
            // Ingredients Table
            const ingTableTop = yPosition
            const ingCellHeight = 20
            const ingTableWidth = 495
            const ingColWidths = [300, 100, 95] // ITEM, QUANTITY, UNIT
            
            // Table Header
            doc.fillColor('#D64545')
            doc.rect(50, ingTableTop, ingTableWidth, ingCellHeight)
            doc.fill()
            doc.strokeColor('#D64545')
            doc.rect(50, ingTableTop, ingTableWidth, ingCellHeight)
            doc.stroke()
            
            doc.fillColor('#FFFFFF')
            doc.fontSize(9)
            doc.font('Helvetica-Bold')
            let ingX = 55
            doc.text('ITEM', ingX, ingTableTop + 6)
            ingX += ingColWidths[0]
            doc.text('QUANTITY', ingX, ingTableTop + 6)
            ingX += ingColWidths[1]
            doc.text('UNIT', ingX, ingTableTop + 6)
            
            // Ingredients Rows
            doc.fillColor('#000000')
            doc.strokeColor('#000000')
            doc.fontSize(8)
            doc.font('Helvetica')
            let ingY = ingTableTop + ingCellHeight
            
            recipe.ingredients.forEach((ing, ingIdx) => {
              if (ingY + ingCellHeight > 750) {
                doc.addPage()
                ingY = 50
                // Redraw header on new page
                let newPageIngX = 50
                doc.fillColor('#D64545')
                doc.rect(newPageIngX, ingY - ingCellHeight, ingTableWidth, ingCellHeight).fill()
                doc.strokeColor('#D64545')
                doc.rect(newPageIngX, ingY - ingCellHeight, ingTableWidth, ingCellHeight).stroke()
                doc.fillColor('#FFFFFF')
                doc.fontSize(9)
                doc.font('Helvetica-Bold')
                doc.text('ITEM', newPageIngX + 5, ingY - ingCellHeight + 6)
                newPageIngX += ingColWidths[0]
                doc.text('QUANTITY', newPageIngX, ingY - ingCellHeight + 6)
                newPageIngX += ingColWidths[1]
                doc.text('UNIT', newPageIngX, ingY - ingCellHeight + 6)
                doc.fillColor('#000000')
                doc.strokeColor('#000000')
                doc.font('Helvetica')
              }
              
              // Alternate row color
              if (ingIdx % 2 === 0) {
                doc.fillColor('#F7E7D9')
                doc.rect(50, ingY, ingTableWidth, ingCellHeight)
                doc.fill()
                doc.fillColor('#000000')
              }
              
              ingX = 55
              doc.rect(50, ingY, ingTableWidth, ingCellHeight)
              doc.stroke()
              
              doc.text(ing.itemName.substring(0, 35), ingX, ingY + 6, { width: ingColWidths[0] - 10 })
              ingX += ingColWidths[0]
              doc.text(ing.quantity, ingX, ingY + 6, { width: ingColWidths[1] - 10 })
              ingX += ingColWidths[1]
              doc.text(ing.unit, ingX, ingY + 6, { width: ingColWidths[2] - 10 })
              
              ingY += ingCellHeight
            })
            
            yPosition = ingY + 25
            
            // Add separator line between recipes
            if (recipeIndex < options.recipeDetails.length - 1) {
              doc.strokeColor('#CCCCCC')
              doc.moveTo(50, yPosition)
              doc.lineTo(545, yPosition)
              doc.stroke()
              doc.strokeColor('#000000')
              yPosition += 20
            }
          })
          
          doc.end()
          return
        }
        
        // If detailed breakdown is provided, use it instead of simple table
        if (options.detailedBreakdown && options.detailedBreakdown.length > 0) {
          // Summary Section
          if (options.summary) {
            yPosition += 10
            doc.fontSize(14)
            doc.font('Helvetica-Bold')
            doc.text('Summary', 50, yPosition)
            yPosition += 20
            
            doc.fontSize(10)
            doc.font('Helvetica')
            const summaryY = yPosition
            doc.text(`Total Productions: ${options.summary.totalProductions}`, 50, summaryY)
            doc.text(`Total Quantity: ${options.summary.totalQuantity}`, 200, summaryY)
            // Replace ₹ with Rs. for PDFKit compatibility
            doc.text(`Total Cost: ${replaceRupeeSymbol(options.summary.totalCost)}`, 350, summaryY)
            yPosition += 30
          }
          
          // Detailed Breakdown for each production
          options.detailedBreakdown.forEach((production, prodIndex) => {
            // Check if we need a new page
            if (yPosition > 700) {
              doc.addPage()
              yPosition = 50
            }
            
            // Production Header
            doc.fontSize(12)
            doc.font('Helvetica-Bold')
            doc.text(production.recipeName, 50, yPosition)
            yPosition += 15
            
            doc.fontSize(10)
            doc.font('Helvetica')
            doc.text(`Date: ${production.date}`, 50, yPosition)
            doc.text(`Quantity: ${production.quantity}`, 300, yPosition)
            yPosition += 20
            
            // Ingredients Table Header
            const ingTableTop = yPosition
            const ingCellHeight = 20
            const ingCellPadding = 5
            const ingTableWidth = 495
            const ingColWidths = [200, 100, 100, 95] // ITEM, QUANTITY, UNIT COST, TOTAL
            
            doc.fillColor('#D64545')
            doc.rect(50, ingTableTop, ingTableWidth, ingCellHeight)
            doc.fill()
            doc.strokeColor('#D64545')
            doc.rect(50, ingTableTop, ingTableWidth, ingCellHeight)
            doc.stroke()
            
            doc.fillColor('#FFFFFF')
            doc.fontSize(9)
            doc.font('Helvetica-Bold')
            let ingX = 55
            doc.text('ITEM', ingX, ingTableTop + 6)
            ingX += ingColWidths[0]
            doc.text('QUANTITY', ingX, ingTableTop + 6)
            ingX += ingColWidths[1]
            doc.text('UNIT COST', ingX, ingTableTop + 6)
            ingX += ingColWidths[2]
            doc.text('TOTAL', ingX, ingTableTop + 6)
            
            // Ingredients Table Rows
            doc.fillColor('#000000')
            doc.strokeColor('#000000')
            doc.fontSize(8)
            doc.font('Helvetica')
            let ingY = ingTableTop + ingCellHeight
            
            production.ingredients.forEach((ing, ingIdx) => {
              if (ingY + ingCellHeight > 750) {
                doc.addPage()
                ingY = 50
              }
              
              // Alternate row color
              if (ingIdx % 2 === 0) {
                doc.fillColor('#F7E7D9')
                doc.rect(50, ingY, ingTableWidth, ingCellHeight)
                doc.fill()
                doc.fillColor('#000000')
              }
              
              ingX = 55
              doc.rect(50, ingY, ingTableWidth, ingCellHeight)
              doc.stroke()
              
              doc.text(ing.itemName.substring(0, 25), ingX, ingY + 6, { width: ingColWidths[0] - 10 })
              ingX += ingColWidths[0]
              doc.text(ing.quantity, ingX, ingY + 6, { width: ingColWidths[1] - 10 })
              ingX += ingColWidths[1]
              // Replace ₹ with Rs. for PDFKit compatibility
              doc.text(replaceRupeeSymbol(ing.unitCost), ingX, ingY + 6, { width: ingColWidths[2] - 10 })
              ingX += ingColWidths[2]
              doc.text(replaceRupeeSymbol(ing.total), ingX, ingY + 6, { width: ingColWidths[3] - 10 })
              
              ingY += ingCellHeight
            })
            
            yPosition = ingY + 15
            
            // Labor and Overhead Costs
            doc.fontSize(9)
            doc.font('Helvetica')
            // Replace ₹ with Rs. for PDFKit compatibility
            doc.text(`Labor Cost: ${replaceRupeeSymbol(production.laborCost)}`, 50, yPosition)
            yPosition += 15
            doc.text(`Overhead Cost: ${replaceRupeeSymbol(production.overheadCost)}`, 50, yPosition)
            yPosition += 20
            
            // Total Cost and Cost/Unit
            doc.fontSize(10)
            doc.font('Helvetica-Bold')
            // Replace ₹ with Rs. for PDFKit compatibility
            doc.text(`Total Cost: ${replaceRupeeSymbol(production.totalCost)}`, 300, yPosition - 20)
            doc.text(`Cost/Unit: ${replaceRupeeSymbol(production.costPerUnit)}`, 300, yPosition - 5)
            
            yPosition += 30
            
            // Add separator line between productions
            if (prodIndex < options.detailedBreakdown.length - 1) {
              doc.strokeColor('#CCCCCC')
              doc.moveTo(50, yPosition)
              doc.lineTo(545, yPosition)
              doc.stroke()
              doc.strokeColor('#000000')
              yPosition += 20
            }
          })
          
          doc.end()
          return
        }
        
        // Prepare table data (fallback to simple table if no detailed breakdown)
        if (!options.data || options.data.length === 0) {
          doc.fontSize(12)
          doc.font('Helvetica')
          doc.text('No data available', 50, yPosition + 20)
          doc.end()
          return
        }
        
        const headers = options.columns.map((col) => col.header)
        const rows = options.data.map((row) =>
          options.columns.map((col) => {
            try {
              const value = row[col.dataKey]
              if (value === null || value === undefined) return ''
              if (typeof value === 'object') {
                const keys = col.dataKey.split('.')
                let result = value
                for (const key of keys) {
                  result = result?.[key]
                }
                return result || ''
              }
              let stringValue = String(value)
              // Replace ₹ symbol with "Rs." for PDFKit compatibility
              // PDFKit's default Helvetica font doesn't support ₹ Unicode character
              stringValue = replaceRupeeSymbol(stringValue)
              return stringValue
            } catch (e) {
              return ''
            }
          })
        )
        
        // Table dimensions
        const tableTop = yPosition + 10
        const cellHeight = 25
        const cellPadding = 5
        const pageWidth = 595
        const pageMargin = 50
        const tableWidth = pageWidth - (pageMargin * 2)
        const columnCount = Math.max(headers.length, 1)
        const columnWidth = tableWidth / columnCount
        
        // Draw table header
        let xPosition = pageMargin
        doc.fillColor('#D64545')
        doc.rect(xPosition, tableTop, tableWidth, cellHeight)
        doc.fill()
        doc.strokeColor('#D64545')
        doc.rect(xPosition, tableTop, tableWidth, cellHeight)
        doc.stroke()
        
        doc.fillColor('#FFFFFF')
        doc.fontSize(9)
        doc.font('Helvetica-Bold')
        headers.forEach((header) => {
          doc.text(header || '', xPosition + cellPadding, tableTop + 8, {
            width: columnWidth - (cellPadding * 2),
            align: 'left',
          })
          xPosition += columnWidth
        })
        
        // Draw table rows
        doc.fillColor('#000000')
        doc.strokeColor('#000000')
        doc.fontSize(8)
        doc.font('Helvetica')
        let currentY = tableTop + cellHeight
        
        rows.forEach((row, rowIndex) => {
          // Check if we need a new page
          if (currentY + cellHeight > 750) {
            doc.addPage()
            currentY = 50
          }
          
          // Alternate row color
          if (rowIndex % 2 === 0) {
            doc.fillColor('#F7E7D9')
            doc.rect(pageMargin, currentY, tableWidth, cellHeight)
            doc.fill()
            doc.fillColor('#000000')
          }
          
          xPosition = pageMargin
          row.forEach((cell) => {
            doc.rect(xPosition, currentY, columnWidth, cellHeight)
            doc.stroke()
            const cellText = String(cell || '').substring(0, 50)
            doc.text(cellText, xPosition + cellPadding, currentY + 8, {
              width: columnWidth - (cellPadding * 2),
              align: 'left',
            })
            xPosition += columnWidth
          })
          
          currentY += cellHeight
        })
        
        // Add Summary Section if provided
        if (options.dailyTotals || options.monthlyTotals || options.grandTotal) {
          // Check if we need a new page for summary
          if (currentY + 200 > 750) {
            doc.addPage()
            currentY = 50
          } else {
            currentY += 30
          }
          
          doc.fontSize(14)
          doc.font('Helvetica-Bold')
          doc.text('Summary', 50, currentY)
          currentY += 25
          
          // Daily Totals
          if (options.dailyTotals && options.dailyTotals.length > 0) {
            doc.fontSize(11)
            doc.font('Helvetica-Bold')
            doc.text('Daily Totals', 50, currentY)
            currentY += 20
            
            doc.fontSize(9)
            doc.font('Helvetica')
            options.dailyTotals.forEach((daily) => {
              if (currentY + 20 > 750) {
                doc.addPage()
                currentY = 50
              }
              doc.text(daily.date, 50, currentY, { width: 200 })
              doc.text(replaceRupeeSymbol(daily.total), 250, currentY, { width: 200, align: 'right' })
              currentY += 18
            })
            currentY += 10
          }
          
          // Monthly Totals
          if (options.monthlyTotals && options.monthlyTotals.length > 0) {
            doc.fontSize(11)
            doc.font('Helvetica-Bold')
            doc.text('Monthly Totals', 50, currentY)
            currentY += 20
            
            doc.fontSize(9)
            doc.font('Helvetica')
            options.monthlyTotals.forEach((monthly) => {
              if (currentY + 20 > 750) {
                doc.addPage()
                currentY = 50
              }
              doc.text(monthly.month, 50, currentY, { width: 200 })
              doc.text(replaceRupeeSymbol(monthly.total), 250, currentY, { width: 200, align: 'right' })
              currentY += 18
            })
            currentY += 10
          }
          
          // Grand Total
          if (options.grandTotal) {
            currentY += 10
            doc.strokeColor('#000000')
            doc.moveTo(50, currentY)
            doc.lineTo(545, currentY)
            doc.stroke()
            currentY += 15
            
            doc.fontSize(12)
            doc.font('Helvetica-Bold')
            doc.text('Grand Total', 50, currentY)
            doc.text(replaceRupeeSymbol(options.grandTotal), 350, currentY, { width: 195, align: 'right' })
          }
        }
        
        doc.end()
      } catch (error) {
        console.error('Error in PDF content generation:', error)
        reject(error)
      }
    } catch (error) {
      console.error('Error creating PDF document:', error)
      reject(error)
    }
  })
}
