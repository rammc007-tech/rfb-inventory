import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { convertUnit } from '@/lib/units'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const supplierId = searchParams.get('supplierId')

    const where: any = {}
    
    // Add deletedAt filter with fallback
    try {
      where.deletedAt = null // Only get non-deleted purchases
    } catch {
      // If deletedAt column doesn't exist, skip the filter
    }
    
    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    }
    if (supplierId) {
      where.supplierId = supplierId
    }

    let purchases
    try {
      purchases = await prisma.purchase.findMany({
        where,
        include: {
          supplier: true,
          items: {
            include: {
              item: {
                include: {
                  baseUnit: true,
                  stock: {
                    include: {
                      unit: true,
                    },
                  },
                },
              },
              unit: true,
            },
          },
        },
        orderBy: {
          date: 'desc',
        },
      })
    } catch (dbError: any) {
      console.error('[Purchases API] Database query error:', dbError?.message, dbError?.code)
      // If deletedAt column issue, try without it (fallback)
      if (dbError?.message?.includes('deletedAt') || dbError?.code === 'P2021' || dbError?.code === 'P2001') {
        console.log('[Purchases API] Retrying query without deletedAt filter')
        delete where.deletedAt
        purchases = await prisma.purchase.findMany({
          where,
          include: {
            supplier: true,
            items: {
              include: {
                item: {
                  include: {
                    baseUnit: true,
                  },
                },
                unit: true,
              },
            },
          },
          orderBy: {
            date: 'desc',
          },
        })
      } else {
        throw dbError // Re-throw other database errors
      }
    }

    return NextResponse.json(purchases)
  } catch (error: any) {
    console.error('Error fetching purchases:', error)
    console.error('Error details:', error?.message, error?.stack)
    return NextResponse.json(
      { 
        error: 'Failed to fetch purchases',
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
    const { date, supplierId, notes, items } = body

    // Validate required fields
    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 })
    }

    if (!supplierId) {
      return NextResponse.json({ error: 'Supplier is required' }, { status: 400 })
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'At least one item is required' }, { status: 400 })
    }

    // Validate and parse date properly
    let purchaseDate: Date
    try {
      // If date is in YYYY-MM-DD format, parse it correctly
      if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = date.split('-').map(Number)
        purchaseDate = new Date(year, month - 1, day) // month is 0-indexed
        purchaseDate.setHours(12, 0, 0, 0) // Set to noon to avoid timezone issues
      } else {
        purchaseDate = new Date(date)
      }

      // Validate date is not invalid
      if (isNaN(purchaseDate.getTime())) {
        return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
      }

      // Validate date is not in the future
      const today = new Date()
      today.setHours(23, 59, 59, 999)
      if (purchaseDate > today) {
        return NextResponse.json({ error: 'Purchase date cannot be in the future' }, { status: 400 })
      }
    } catch (dateError) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
    }

    // Validate items
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (!item.itemId) {
        return NextResponse.json({ error: `Item ${i + 1}: Item is required` }, { status: 400 })
      }
      if (!item.unitId) {
        return NextResponse.json({ error: `Item ${i + 1}: Unit is required` }, { status: 400 })
      }
      if (!item.quantity || item.quantity <= 0) {
        return NextResponse.json({ error: `Item ${i + 1}: Valid quantity is required` }, { status: 400 })
      }
      if (!item.unitPrice || item.unitPrice <= 0) {
        return NextResponse.json({ error: `Item ${i + 1}: Valid unit price is required` }, { status: 400 })
      }
    }

    let totalAmount = 0
    const purchaseItems = []

    for (const item of items) {
      const lineTotal = item.quantity * item.unitPrice
      totalAmount += lineTotal

      purchaseItems.push({
        itemId: item.itemId,
        quantity: item.quantity,
        unitId: item.unitId,
        unitPrice: item.unitPrice,
        lineTotal,
      })
    }

    const purchase = await prisma.purchase.create({
      data: {
        date: purchaseDate,
        supplierId,
        totalAmount,
        notes,
        items: {
          create: purchaseItems,
        },
      },
      include: {
        supplier: true,
        items: {
          include: {
            item: {
              include: {
                baseUnit: true,
              },
            },
            unit: true,
          },
        },
      },
    })

    // Update item prices and stock
    for (const item of items) {
      const dbItem = await prisma.item.findUnique({
        where: { id: item.itemId },
        include: { stock: true },
      })

      if (!dbItem) continue

      // Update prices
      const newAvgPrice =
        dbItem.avgPrice === 0
          ? item.unitPrice
          : (dbItem.avgPrice + item.unitPrice) / 2

      await prisma.item.update({
        where: { id: item.itemId },
        data: {
          lastPurchasePrice: item.unitPrice,
          avgPrice: newAvgPrice,
        },
      })

      // Update stock
      if (dbItem.stock) {
        const quantityInStockUnit = await convertUnit(
          item.quantity,
          item.unitId,
          dbItem.stock.unitId
        )

        await prisma.stock.update({
          where: { itemId: item.itemId },
          data: {
            quantity: {
              increment: quantityInStockUnit,
            },
          },
        })
      } else {
        // Create stock if it doesn't exist
        const quantityInBaseUnit = await convertUnit(
          item.quantity,
          item.unitId,
          dbItem.baseUnitId
        )

        await prisma.stock.create({
          data: {
            itemId: item.itemId,
            quantity: quantityInBaseUnit,
            unitId: dbItem.baseUnitId,
          },
        })
      }
    }

    return NextResponse.json(purchase)
  } catch (error: any) {
    console.error('Error creating purchase:', error)
    
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
      ? error.message || 'Failed to create purchase'
      : 'Failed to create purchase'

    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

