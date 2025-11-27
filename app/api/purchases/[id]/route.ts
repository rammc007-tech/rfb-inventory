import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET single purchase
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const purchase = await prisma.purchaseBatch.findUnique({
      where: { id: params.id },
      include: {
        rawMaterial: true,
      },
    })

    if (!purchase) {
      return NextResponse.json(
        { error: 'Purchase not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: purchase.id,
      rawMaterialId: purchase.rawMaterialId,
      rawMaterialName: purchase.rawMaterial.name,
      quantity: purchase.quantity,
      unit: purchase.unit,
      unitPrice: purchase.unitPrice,
      totalCost: purchase.totalCost,
      purchaseDate: purchase.purchaseDate,
      remainingQty: purchase.remainingQty,
      gasCylinderQty: purchase.gasCylinderQty,
    })
  } catch (error) {
    console.error('Error fetching purchase:', error)
    return NextResponse.json(
      { error: 'Failed to fetch purchase' },
      { status: 500 }
    )
  }
}

// PUT update purchase
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { quantity, unit, unitPrice, totalCost, purchaseDate, gasCylinderQty } = body

    // Calculate unit price if total cost is provided
    let finalUnitPrice = unitPrice
    let finalTotalCost = totalCost

    if (totalCost && quantity && !unitPrice) {
      finalUnitPrice = totalCost / quantity
      finalTotalCost = totalCost
    } else if (unitPrice && quantity && !totalCost) {
      finalUnitPrice = unitPrice
      finalTotalCost = unitPrice * quantity
    }

    const purchase = await prisma.purchaseBatch.update({
      where: { id: params.id },
      data: {
        quantity: quantity ? parseFloat(quantity) : undefined,
        unit: unit,
        unitPrice: finalUnitPrice,
        totalCost: finalTotalCost,
        remainingQty: quantity ? parseFloat(quantity) : undefined,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
        gasCylinderQty: gasCylinderQty ? parseFloat(gasCylinderQty) : null,
      },
      include: {
        rawMaterial: true,
      },
    })

    return NextResponse.json({
      id: purchase.id,
      rawMaterialId: purchase.rawMaterialId,
      rawMaterialName: purchase.rawMaterial.name,
      quantity: purchase.quantity,
      unit: purchase.unit,
      unitPrice: purchase.unitPrice,
      totalCost: purchase.totalCost,
      purchaseDate: purchase.purchaseDate,
      remainingQty: purchase.remainingQty,
    })
  } catch (error) {
    console.error('Error updating purchase:', error)
    return NextResponse.json(
      { error: 'Failed to update purchase' },
      { status: 500 }
    )
  }
}

// DELETE purchase
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.purchaseBatch.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting purchase:', error)
    return NextResponse.json(
      { error: 'Failed to delete purchase' },
      { status: 500 }
    )
  }
}

