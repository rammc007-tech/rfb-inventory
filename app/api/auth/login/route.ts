import { NextRequest, NextResponse } from 'next/server'
import { prisma, reloadDatabase } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'rfb-inventory-secret-key-change-in-production'

export async function POST(request: NextRequest) {
  try {
    console.log('Login attempt started')
    
    // Parse request body with proper error handling
    let body;
    try {
      const text = await request.text()
      console.log('Request body text:', text)
      body = text ? JSON.parse(text) : {}
    } catch (parseError: any) {
      console.error('JSON parse error:', parseError)
      return NextResponse.json(
        { error: 'Invalid request format' },
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
        }
      )
    }

    const { username, password } = body

    console.log('Received login request for:', username)

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
        }
      )
    }

    // Ensure Prisma client is available
    if (!prisma) {
      console.error('Prisma client is not initialized')
      return NextResponse.json(
        { error: 'Database connection error. Please restart the server.' },
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
        }
      )
    }

    // Reload database to ensure fresh data
    reloadDatabase()
    
    let user: any = null
    try {
      console.log('Querying database for user:', username)
      // Use findMany and filter for more reliable lookup
      const allUsers = prisma.user.findMany({})
      const usersArray = Array.isArray(allUsers) ? allUsers : []
      
      console.log('Total users in database:', usersArray.length)
      console.log('All usernames:', usersArray.map((u: any) => u.username))
      
      // Case-insensitive username matching
      // Handle both flat structure and nested data structure
      user = usersArray.find((u: any) => {
        // Check if user has nested data structure
        const userObj = u.data || u
        const dbUsername = (userObj.username || u.username || '').trim().toLowerCase()
        const searchUsername = username.trim().toLowerCase()
        return dbUsername === searchUsername
      })
      
      // If user found with nested structure, flatten it
      if (user && user.data) {
        user = {
          ...user.data,
          id: user.id,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      }
      
      console.log('User found:', user ? 'Yes' : 'No')
      if (user) {
        console.log('User details:', { 
          id: user.id, 
          username: user.username, 
          role: user.role, 
          isActive: user.isActive,
          hasPassword: !!user.password,
          passwordLength: user.password ? user.password.length : 0
        })
      } else {
        console.log('User not found. Available users:', usersArray.map((u: any) => u.username))
      }
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
      console.log('Input password length:', password.length)
      console.log('Stored password hash:', user.password ? user.password.substring(0, 30) + '...' : 'MISSING')
      console.log('Stored password hash length:', user.password ? user.password.length : 0)
      
      if (!user.password) {
        console.error('❌ User password is missing!')
        return NextResponse.json(
          { error: 'Invalid username or password' },
          { status: 401 }
        )
      }
      
      // Check if password is already hashed (starts with $2a$ or $2b$)
      if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
      isValid = await bcrypt.compare(password, user.password)
        console.log('Password match (bcrypt):', isValid)
      } else {
        // If password is not hashed, compare directly (for backward compatibility)
        console.warn('⚠️ Password is not hashed! Comparing directly.')
        isValid = password === user.password
        console.log('Password match (direct):', isValid)
      }
      
      if (!isValid) {
        console.log('❌ Password does not match')
        console.log('Attempted password:', password)
        console.log('Stored password hash:', user.password.substring(0, 50))
      }
    } catch (error: any) {
      console.error('❌ Password comparison error:', error)
      console.error('Error details:', error.message, error.stack)
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
    
    // Return with proper headers
    return NextResponse.json(
      {
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
        },
      },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store, must-revalidate',
        },
      }
    )
  } catch (error: any) {
    console.error('Login error:', error)
    console.error('Error stack:', error.stack)
    return NextResponse.json(
      { error: error.message || 'Login failed. Please check console for details.' },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
      }
    )
  }
}
