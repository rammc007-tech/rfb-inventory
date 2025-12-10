import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let suppliers
    try {
      suppliers = await prisma.supplier.findMany({
        where: {
          deletedAt: null, // Only get non-deleted suppliers
        },
        orderBy: {
          name: 'asc',
        },
      })
    } catch (dbError: any) {
      console.error('[Suppliers API] Database query error:', dbError?.message, dbError?.code)
      // If deletedAt column issue, try without it (fallback)
      if (dbError?.message?.includes('deletedAt') || dbError?.code === 'P2021' || dbError?.code === 'P2001') {
        console.log('[Suppliers API] Retrying query without deletedAt filter')
        suppliers = await prisma.supplier.findMany({
          orderBy: {
            name: 'asc',
          },
        })
        // Filter out deleted suppliers manually if column exists
        suppliers = suppliers.filter((supplier: any) => !supplier.deletedAt)
      } else {
        throw dbError
      }
    }

    return NextResponse.json(suppliers)
  } catch (error) {
    console.error('Error fetching suppliers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch suppliers' },
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

    const body = await request.json()
    const { name, contact, email, address } = body

    const supplier = await prisma.supplier.create({
      data: {
        name,
        contact,
        email,
        address,
      },
    })

    return NextResponse.json(supplier)
  } catch (error: any) {
    console.error('Error creating supplier:', error)
    
    // Handle Prisma-specific errors
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0] || 'field'
      return NextResponse.json(
        { error: `A record with this ${field} already exists` },
        { status: 400 }
      )
    }

    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: 'Invalid reference. Please check your selections.' },
        { status: 400 }
      )
    }

    const errorMessage = process.env.NODE_ENV === 'development'
      ? error.message || 'Failed to create supplier'
      : 'Failed to create supplier'

    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

