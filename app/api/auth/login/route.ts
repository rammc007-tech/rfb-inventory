import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'rfb-inventory-secret-key-change-in-production'

export async function POST(request: NextRequest) {
  try {
    console.log('Login attempt started')
    
    const body = await request.json()
    const { username, password } = body

    console.log('Received login request for:', username)

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      )
    }

    // Ensure Prisma client is available
    if (!prisma) {
      console.error('Prisma client is not initialized')
      return NextResponse.json(
        { error: 'Database connection error. Please restart the server.' },
        { status: 500 }
      )
    }

    let user
    try {
      console.log('Querying database for user:', username)
      user = await prisma.user.findUnique({
        where: { username },
      })
      console.log('User found:', user ? 'Yes' : 'No')
    } catch (dbError: any) {
      console.error('Database error:', dbError)
      console.error('Error details:', dbError.message, dbError.stack)
      return NextResponse.json(
        { error: `Database error: ${dbError.message || 'Unknown error'}` },
        { status: 500 }
      )
    }

    if (!user) {
      console.log('User not found in database')
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      )
    }

    if (!user.isActive) {
      console.log('User account is disabled')
      return NextResponse.json(
        { error: 'Account is disabled. Please contact administrator.' },
        { status: 401 }
      )
    }

    let isValid = false
    try {
      console.log('Comparing password...')
      isValid = await bcrypt.compare(password, user.password)
      console.log('Password match:', isValid)
    } catch (error: any) {
      console.error('Password comparison error:', error)
      return NextResponse.json(
        { error: 'Authentication error. Please try again.' },
        { status: 500 }
      )
    }

    if (!isValid) {
      console.log('Invalid password')
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      )
    }

    console.log('Login successful, generating token...')
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    console.log('Token generated, returning response')
    return NextResponse.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    })
  } catch (error: any) {
    console.error('Login error:', error)
    console.error('Error stack:', error.stack)
    return NextResponse.json(
      { error: error.message || 'Login failed. Please check console for details.' },
      { status: 500 }
    )
  }
}
