import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const purchase = await prisma.purchase.findFirst({
      where: {
        id: params.id,
        deletedAt: null,
      },
      include: {
        supplier: true,
        items: {
          include: {
            item: {
              include: {
                baseUnit: true,
                itemUnits: {
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
    })

    if (!purchase) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 })
    }

    return NextResponse.json(purchase)
  } catch (error) {
    console.error('Error fetching purchase:', error)
    return NextResponse.json(
      { error: 'Failed to fetch purchase' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    // Validate and parse date
    let purchaseDate: Date
    try {
      if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = date.split('-').map(Number)
        purchaseDate = new Date(year, month - 1, day)
        purchaseDate.setHours(12, 0, 0, 0)
      } else {
        purchaseDate = new Date(date)
      }

      if (isNaN(purchaseDate.getTime())) {
        return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
      }

      const today = new Date()
      today.setHours(23, 59, 59, 999)
      if (purchaseDate > today) {
        return NextResponse.json({ error: 'Purchase date cannot be in the future' }, { status: 400 })
      }
    } catch (dateError) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
    }

    // Check if purchase exists
    const existingPurchase = await prisma.purchase.findFirst({
      where: {
        id: params.id,
        deletedAt: null,
      },
    })

    if (!existingPurchase) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 })
    }

    // Calculate total amount
    let totalAmount = 0
    const purchaseItems = []

    for (const item of items) {
      if (!item.itemId || !item.unitId || !item.quantity || !item.unitPrice) {
        return NextResponse.json(
          { error: 'All item fields are required' },
          { status: 400 }
        )
      }

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

    // Delete existing purchase items and create new ones
    await prisma.purchaseItem.deleteMany({
      where: { purchaseId: params.id },
    })

    // Update purchase
    const purchase = await prisma.purchase.update({
      where: { id: params.id },
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

    return NextResponse.json(purchase)
  } catch (error: any) {
    console.error('Error updating purchase:', error)
    
    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: 'Invalid reference. Please check your selections.' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update purchase' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if purchase exists
    const purchase = await prisma.purchase.findFirst({
      where: {
        id: params.id,
      },
    })

    if (!purchase) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 })
    }

    // Soft delete by setting deletedAt
    try {
      await prisma.purchase.update({
        where: { id: params.id },
        data: { deletedAt: new Date() },
      })
    } catch (updateError: any) {
      // If deletedAt column doesn't exist, try hard delete
      if (updateError?.message?.includes('deletedAt') || updateError?.code === 'P2021') {
        await prisma.purchase.delete({
          where: { id: params.id },
        })
      } else {
        throw updateError
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting purchase:', error)
    
    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: 'Cannot delete purchase. It is referenced by other records.' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to delete purchase' },
      { status: 500 }
    )
  }
}

