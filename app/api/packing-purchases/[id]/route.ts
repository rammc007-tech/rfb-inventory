import { NextRequest, NextResponse } from 'next/server'
import { prisma, reloadDatabase } from '@/lib/prisma'

// GET single packing purchase
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const purchase = prisma.packingPurchase.findUnique({
      where: { id: params.id },
    })

    if (!purchase) {
      return NextResponse.json(
        { error: 'Packing purchase not found' },
        { status: 404 }
      )
    }

    const material = prisma.packingMaterial.findUnique({
      where: { id: purchase.packingMaterialId },
    })

    return NextResponse.json({
      ...purchase,
      packingMaterialName: material?.name || 'Unknown',
    })
  } catch (error) {
    console.error('Error fetching packing purchase:', error)
    return NextResponse.json(
      { error: 'Failed to fetch packing purchase' },
      { status: 500 }
    )
  }
}

// PUT update packing purchase
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { quantity, unit, unitPrice, totalCost, purchaseDate, remainingQty } = body

    // Get existing purchase
    const existingPurchase = prisma.packingPurchase.findUnique({
      where: { id: params.id },
    })

    if (!existingPurchase) {
      return NextResponse.json(
        { error: 'Packing purchase not found' },
        { status: 404 }
      )
    }

    const oldQty = parseFloat(existingPurchase.quantity) || 0
    const newQty = quantity ? parseFloat(quantity) : oldQty

    const purchase = prisma.packingPurchase.update({
      where: { id: params.id },
      data: {
        quantity: newQty,
        unit: unit || existingPurchase.unit,
        unitPrice: unitPrice ? parseFloat(unitPrice) : existingPurchase.unitPrice,
        totalCost: totalCost ? parseFloat(totalCost) : existingPurchase.totalCost,
        purchaseDate: purchaseDate || existingPurchase.purchaseDate,
        remainingQty: remainingQty ? parseFloat(remainingQty) : newQty,
      },
    })

    if (!purchase) {
      return NextResponse.json(
        { error: 'Failed to update packing purchase' },
        { status: 500 }
      )
    }

    const material = prisma.packingMaterial.findUnique({
      where: { id: purchase.packingMaterialId },
    })

    return NextResponse.json({
      ...purchase,
      packingMaterialName: material?.name || 'Unknown',
    })
  } catch (error) {
    console.error('Error updating packing purchase:', error)
    return NextResponse.json(
      { error: 'Failed to update packing purchase' },
      { status: 500 }
    )
  }
}

// DELETE packing purchase (move to deleted_items)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const purchase = prisma.packingPurchase.findUnique({
      where: { id: params.id },
    })

    if (!purchase) {
      return NextResponse.json(
        { error: 'Packing purchase not found' },
        { status: 404 }
      )
    }

    // Move to deleted_items
    const deletedItem = prisma.deletedItem.create({
      data: {
        category: 'packing_purchase',
        originalData: purchase,
      },
    })
    console.log('Packing purchase moved to deleted_items:', deletedItem.id)

    // Delete from packing_purchases
    prisma.packingPurchase.delete({
      where: { id: params.id },
    })
    
    // Reload database to ensure consistency
    if (typeof reloadDatabase === 'function') {
      reloadDatabase()
    }

    return NextResponse.json({ message: 'Packing purchase deleted successfully' })
  } catch (error) {
    console.error('Error deleting packing purchase:', error)
    return NextResponse.json(
      { error: 'Failed to delete packing purchase' },
      { status: 500 }
    )
  }
}

