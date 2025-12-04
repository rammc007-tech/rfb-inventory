import { NextRequest, NextResponse } from 'next/server'
import { initializeDatabase } from '@/lib/init-db'

export async function GET(request: NextRequest) {
  try {
    console.log('Manual database initialization requested')
    const result = await initializeDatabase()
    
    return NextResponse.json({
      ...result,
      message: result.success 
        ? 'Database initialized successfully. Default admin user created.'
        : 'Database initialization failed',
      credentials: result.success ? {
        username: 'admin',
        password: 'admin123'
      } : undefined
    })
  } catch (error) {
    console.error('Init API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}

