import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const filter = searchParams.get('filter')

    // Build where clause
    const where: any = {}
    
    // Add type filter if provided
    if (type === 'RAW_MATERIAL' || type === 'ESSENCE') {
      where.type = type
    }
    
    // Filter out deleted items - use explicit null check
    where.deletedAt = null

    console.log('[Items API] Fetching items with where clause:', JSON.stringify(where))

    let items
    try {
      items = await prisma.item.findMany({
        where,
        include: {
          baseUnit: true,
          stock: {
            include: {
              unit: true,
            },
          },
          itemUnits: {
            include: {
              unit: true,
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
      })
      console.log('[Items API] Successfully fetched', items.length, 'items')
    } catch (dbError: any) {
      console.error('[Items API] Database query error:', dbError?.message, dbError?.code)
      // If deletedAt column issue, try without it (fallback)
      if (dbError?.message?.includes('deletedAt') || dbError?.code === 'P2021' || dbError?.code === 'P2001') {
        console.log('[Items API] Retrying query without deletedAt filter')
        delete where.deletedAt
        items = await prisma.item.findMany({
          where,
          include: {
            baseUnit: true,
            stock: {
              include: {
                unit: true,
              },
            },
            itemUnits: {
              include: {
                unit: true,
              },
            },
          },
          orderBy: {
            name: 'asc',
          },
        })
        // Filter out deleted items manually if column exists
        items = items.filter((item: any) => !item.deletedAt)
      } else {
        throw dbError
      }
    }

    let filteredItems = items
    if (filter === 'low-stock') {
      filteredItems = items.filter((item) => {
        if (!item.stock) return false
        return item.stock.quantity <= item.reorderThreshold
      })
    }

    return NextResponse.json(filteredItems)
  } catch (error: any) {
    console.error('Error fetching items:', error)
    console.error('Error details:', error?.message, error?.stack)
    return NextResponse.json(
      { 
        error: 'Failed to fetch items',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
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
    const {
      name,
      sku,
      type,
      category,
      baseUnitId,
      baseQuantity,
      reorderThreshold,
      location,
      unitIds,
    } = body

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Item name is required' },
        { status: 400 }
      )
    }

    if (!type || (type !== 'RAW_MATERIAL' && type !== 'ESSENCE')) {
      return NextResponse.json(
        { error: 'Item type must be RAW_MATERIAL or ESSENCE' },
        { status: 400 }
      )
    }

    if (!baseUnitId || !baseUnitId.trim()) {
      return NextResponse.json(
        { error: 'Base unit is required' },
        { status: 400 }
      )
    }

    // Validate base unit exists
    const baseUnit = await prisma.unit.findUnique({
      where: { id: baseUnitId },
    })

    if (!baseUnit) {
      return NextResponse.json(
        { error: 'Invalid base unit selected' },
        { status: 400 }
      )
    }

    // Validate unitIds if provided
    if (unitIds && Array.isArray(unitIds) && unitIds.length > 0) {
      const validUnits = await prisma.unit.findMany({
        where: { id: { in: unitIds } },
      })

      if (validUnits.length !== unitIds.length) {
        return NextResponse.json(
          { error: 'One or more selected units are invalid' },
          { status: 400 }
        )
      }
    }

    // Check if SKU already exists (if provided)
    if (sku && sku.trim()) {
      const existingItem = await prisma.item.findUnique({
        where: { sku: sku.trim() },
      })

      if (existingItem) {
        return NextResponse.json(
          { error: `SKU "${sku}" already exists. Please use a different SKU.` },
          { status: 400 }
        )
      }
    }

    const item = await prisma.item.create({
      data: {
        name: name.trim(),
        sku: sku && sku.trim() ? sku.trim() : null,
        type,
        category: category && category.trim() ? category.trim() : null,
        baseUnitId,
        baseQuantity: baseQuantity || 1,
        reorderThreshold: reorderThreshold || 0,
        location: location && location.trim() ? location.trim() : null,
        itemUnits: {
          create: (unitIds || []).map((unitId: string) => ({
            unitId,
          })),
        },
        stock: {
          create: {
            quantity: 0,
            unitId: baseUnitId,
          },
        },
      },
      include: {
        baseUnit: true,
        stock: {
          include: {
            unit: true,
          },
        },
        itemUnits: {
          include: {
            unit: true,
          },
        },
      },
    })

    return NextResponse.json(item)
  } catch (error: any) {
    console.error('Error creating item:', error)
    
    // Handle Prisma-specific errors
    if (error.code === 'P2002') {
      // Unique constraint violation
      const field = error.meta?.target?.[0] || 'field'
      return NextResponse.json(
        { error: `A record with this ${field} already exists` },
        { status: 400 }
      )
    }

    if (error.code === 'P2003') {
      // Foreign key constraint violation
      return NextResponse.json(
        { error: 'Invalid reference. Please check your selections.' },
        { status: 400 }
      )
    }

    // Return detailed error in development, generic in production
    const errorMessage = process.env.NODE_ENV === 'development'
      ? error.message || 'Failed to create item'
      : 'Failed to create item'

    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

