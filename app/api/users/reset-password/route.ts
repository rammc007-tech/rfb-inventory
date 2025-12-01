import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// POST reset password (forget password)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, newPassword } = body

    if (!username || !newPassword) {
      return NextResponse.json(
        { error: 'Username and new password are required' },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      )
    }

    // Find user
    const users = prisma.user.findMany({
      where: { username: username },
    })
    const user = Array.isArray(users) && users.length > 0 ? users[0] : null

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // Update password
    prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        updatedAt: new Date().toISOString(),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully',
    })
  } catch (error: any) {
    console.error('Error resetting password:', error)
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    )
  }
}

