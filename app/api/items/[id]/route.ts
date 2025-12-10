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

    const item = await prisma.item.findFirst({
      where: { 
        id: params.id,
        deletedAt: null, // Only get non-deleted items
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

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    return NextResponse.json(item)
  } catch (error) {
    console.error('Error fetching item:', error)
    return NextResponse.json(
      { error: 'Failed to fetch item' },
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
    const {
      name,
      sku,
      category,
      baseUnitId,
      reorderThreshold,
      location,
      unitIds,
    } = body

    // Update item
    const item = await prisma.item.update({
      where: { id: params.id },
      data: {
        name,
        sku,
        category,
        baseUnitId,
        reorderThreshold,
        location,
      },
    })

    // Update item units
    if (unitIds) {
      await prisma.itemUnit.deleteMany({
        where: { itemId: params.id },
      })
      await prisma.itemUnit.createMany({
        data: unitIds.map((unitId: string) => ({
          itemId: params.id,
          unitId,
        })),
      })
    }

    const updatedItem = await prisma.item.findUnique({
      where: { id: params.id },
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

    return NextResponse.json(updatedItem)
  } catch (error) {
    console.error('Error updating item:', error)
    return NextResponse.json(
      { error: 'Failed to update item' },
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

    // Check if item exists
    const existingItem = await prisma.item.findUnique({
      where: { id: params.id },
    })

    if (!existingItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    // Soft delete - set deletedAt timestamp
    try {
      const deletedAtValue = new Date()
      const deletedItem = await prisma.item.update({
        where: { id: params.id },
        data: { deletedAt: deletedAtValue },
      })
      
      // Verify the deletion was successful
      const verifyItem = await prisma.item.findUnique({
        where: { id: params.id },
        select: { id: true, name: true, deletedAt: true },
      })
      
      if (!verifyItem || !verifyItem.deletedAt) {
        console.error('[Delete API] Verification failed - deletedAt not set:', verifyItem)
        return NextResponse.json(
          { error: 'Failed to soft delete item - verification failed' },
          { status: 500 }
        )
      }
      
      console.log('[Delete API] Item soft-deleted and verified:', {
        id: verifyItem.id,
        name: verifyItem.name,
        deletedAt: verifyItem.deletedAt,
      })
    } catch (updateError: any) {
      // If deletedAt column doesn't exist, try hard delete but check for foreign key constraints
      if (updateError?.message?.includes('deletedAt') || updateError?.code === 'P2021' || updateError?.code === 'P2001') {
        try {
          await prisma.item.delete({
            where: { id: params.id },
          })
        } catch (deleteError: any) {
          // If foreign key constraint violation, return a user-friendly error
          if (deleteError?.code === 'P2003' || deleteError?.message?.includes('Foreign key constraint')) {
            return NextResponse.json(
              { 
                error: 'Cannot delete item: It is being used in purchases, recipes, or productions. Please remove those references first.',
                details: process.env.NODE_ENV === 'development' ? deleteError?.message : undefined
              },
              { status: 400 }
            )
          }
          throw deleteError
        }
      } else {
        throw updateError
      }
    }

    return NextResponse.json({ success: true, message: 'Item deleted successfully' })
  } catch (error: any) {
    console.error('Error deleting item:', error)
    console.error('Error details:', error?.message, error?.stack)
    return NextResponse.json(
      { 
        error: 'Failed to delete item',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: 500 }
    )
  }
}

