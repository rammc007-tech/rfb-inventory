import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generatePDF, PDFOptions } from '@/lib/pdf'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { options }: { options: PDFOptions } = body

    if (!options) {
      return NextResponse.json({ error: 'PDF options required' }, { status: 400 })
    }

    if (!options.columns || !Array.isArray(options.columns)) {
      return NextResponse.json({ error: 'Invalid columns format' }, { status: 400 })
    }

    if (!options.data || !Array.isArray(options.data)) {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 })
    }

    console.log('Generating PDF with options:', {
      title: options.title,
      dataRows: options.data?.length || 0,
      columns: options.columns?.length || 0
    })

    let pdfBytes: Buffer
    try {
      pdfBytes = await generatePDF(options)
    } catch (pdfError: any) {
      console.error('PDF generation failed:', pdfError)
      console.error('Error stack:', pdfError?.stack)
      throw pdfError
    }

    const filename = (options.filename || 'document').replace(/[^a-z0-9]/gi, '_')

    return new NextResponse(pdfBytes as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}.pdf"`,
      },
    })
  } catch (error: any) {
    console.error('Error generating PDF:', error)
    console.error('Error stack:', error?.stack)
    return NextResponse.json(
      { 
        error: 'Failed to generate PDF', 
        details: error?.message || String(error),
        stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    )
  }
}

