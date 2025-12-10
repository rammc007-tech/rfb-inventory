import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can view users
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can create users
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { name, email, password, role } = body

    // Validation
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    const validRole = role || 'CASHIER'
    if (!['ADMIN', 'MANAGER', 'CASHIER'].includes(validRole)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be ADMIN, MANAGER, or CASHIER' },
        { status: 400 }
      )
    }

    // Process email - validate and check for duplicates if provided
    let finalEmail: string | null = null
    
    // Only process email if it's provided and not empty
    if (email !== undefined && email !== null && email !== '') {
      const emailStr = String(email).trim()
      if (emailStr !== '') {
        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(emailStr)) {
          return NextResponse.json(
            { error: 'Invalid email format' },
            { status: 400 }
          )
        }
        finalEmail = emailStr

        // Check if user already exists with this email
        try {
          const existingUser = await prisma.user.findUnique({
            where: { email: finalEmail },
          })

          if (existingUser) {
            return NextResponse.json(
              { error: 'User with this email already exists' },
              { status: 400 }
            )
          }
        } catch (emailCheckError: any) {
          // If email check fails, log and continue
          console.warn('Email uniqueness check warning:', emailCheckError?.message)
        }
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Build data object - always include email (null if not provided)
    // For SQLite with Prisma, optional unique fields must be explicitly set to null
    const userData: {
      name: string
      password: string
      role: string
      email: string | null
    } = {
      name: name.trim(),
      password: hashedPassword,
      role: validRole,
      email: finalEmail, // null is valid for optional nullable field
    }

    // Create user
    const user = await prisma.user.create({
      data: userData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error: any) {
    console.error('Error creating user:', error)
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
      stack: error?.stack,
    })
    
    // Handle Prisma unique constraint errors
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0] || 'field'
      if (field === 'email') {
        return NextResponse.json(
          { error: 'User with this email already exists' },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { error: `A user with this ${field} already exists` },
        { status: 400 }
      )
    }

    // Handle other Prisma errors
    if (error.code) {
      return NextResponse.json(
        { 
          error: 'Failed to create user',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Failed to create user',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: 500 }
    )
  }
}
