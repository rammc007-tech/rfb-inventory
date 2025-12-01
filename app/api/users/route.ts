import { NextRequest, NextResponse } from 'next/server'
import { prisma, reloadDatabase } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// GET all users
export async function GET(request: NextRequest) {
  try {
    // Force reload database to get absolutely fresh data
    reloadDatabase()
    
    // Small delay to ensure file is written
    await new Promise(resolve => setTimeout(resolve, 200))
    
    // Reload again to be sure
    reloadDatabase()
    
    const allUsers = prisma.user.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    })

    console.log('Fetched users count:', Array.isArray(allUsers) ? allUsers.length : 0)

    // Filter to only return selected fields with fallbacks
    const users = (Array.isArray(allUsers) ? allUsers : []).map((user: any) => ({
      id: user.id || '',
      username: user.username || '',
      role: user.role || 'user',
      isActive: user.isActive !== undefined ? user.isActive : true,
      createdAt: user.createdAt || new Date().toISOString(),
      updatedAt: user.updatedAt || new Date().toISOString(),
    })).filter((user: any) => user.id && user.username) // Filter out invalid users

    console.log('Filtered users count:', users.length)
    console.log('Users list:', users.map((u: any) => u.username))

    // Set cache control headers to prevent caching
    return NextResponse.json(users, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

// POST create new user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password, role } = body

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      )
    }

    // Check if username already exists
    const existingUsers = prisma.user.findMany({})
    const existingUser = Array.isArray(existingUsers) 
      ? existingUsers.find((u: any) => u.username && u.username.trim().toLowerCase() === username.trim().toLowerCase())
      : null

    if (existingUser) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 400 }
      )
    }

    // Hash password with bcrypt
    const hashedPassword = await bcrypt.hash(password, 10)
    console.log('Password hashed. Hash length:', hashedPassword.length)
    console.log('Hash preview:', hashedPassword.substring(0, 30) + '...')

    // Reload database before creating to ensure we have latest data
    if (reloadDatabase) {
      reloadDatabase()
    }

    const createdUser: any = prisma.user.create({
      data: {
        username: username.trim(),
        password: hashedPassword, // Ensure hashed password is passed
        role: role || 'user',
        isActive: true,
      },
    })
    
    console.log('✅ User created in API:', createdUser.id, createdUser.username)
    console.log('✅ Password hash in createdUser:', createdUser.password ? createdUser.password.substring(0, 30) + '...' : '❌ MISSING')
    console.log('✅ Password hash length:', createdUser.password ? createdUser.password.length : 0)
    
    // Force reload database to ensure it's saved
    reloadDatabase()
    
    // Wait a moment for file write
    await new Promise(resolve => setTimeout(resolve, 200))
    
    // Reload again and verify
    reloadDatabase()
    const verifyUsers = prisma.user.findMany({})
    const verifyUser = Array.isArray(verifyUsers) 
      ? verifyUsers.find((u: any) => u.id === createdUser.id)
      : null
    
    console.log('Users after creation verification:', Array.isArray(verifyUsers) ? verifyUsers.length : 0)
    if (verifyUser) {
      console.log('✅ Verified user found')
      console.log('✅ Verified password hash:', verifyUser.password ? verifyUser.password.substring(0, 30) + '...' : '❌ MISSING')
      console.log('✅ Verified password hash length:', verifyUser.password ? verifyUser.password.length : 0)
      console.log('✅ Password hash starts with $2:', verifyUser.password ? verifyUser.password.startsWith('$2') : false)
    } else {
      console.error('❌ Created user not found in verification!')
    }

    // Ensure we return all required fields with proper values
    const user = {
      id: createdUser.id || '',
      username: createdUser.username || username.trim(),
      role: createdUser.role || role || 'user',
      isActive: createdUser.isActive !== undefined ? createdUser.isActive : true,
      createdAt: createdUser.createdAt || new Date().toISOString(),
      updatedAt: createdUser.updatedAt || new Date().toISOString(),
    }

    console.log('Created user:', user)

    return NextResponse.json(user, { status: 201 })
  } catch (error: any) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create user' },
      { status: 500 }
    )
  }
}

