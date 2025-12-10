import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admin can reset
    if (session.user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only administrators can perform reset operations' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { type } = body

    if (type === 'production') {
      // Production counter is date-based, so we just return success
      // The counter will automatically show today's count
      return NextResponse.json({
        message: 'Production counter refreshed. The counter automatically resets daily based on the date.',
      })
    }

    if (type === 'info') {
      // Just informational
      return NextResponse.json({
        message: 'System information refreshed',
      })
    }

    return NextResponse.json(
      { error: 'Invalid reset type' },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('Error in reset operation:', error)
    return NextResponse.json(
      { error: 'Failed to perform reset operation' },
      { status: 500 }
    )
  }
}

