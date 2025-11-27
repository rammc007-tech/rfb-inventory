import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

export async function GET() {
  try {
    const swPath = join(process.cwd(), 'public', 'sw.js')
    const swContent = readFileSync(swPath, 'utf-8')
    
    return new NextResponse(swContent, {
      headers: {
        'Content-Type': 'application/javascript',
        'Cache-Control': 'public, max-age=0, must-revalidate',
      },
    })
  } catch (error) {
    return new NextResponse('Service Worker not found', { status: 404 })
  }
}

