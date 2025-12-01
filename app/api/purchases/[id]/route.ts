import { NextRequest, NextResponse } from 'next/server'
import { prisma, reloadDatabase } from '@/lib/prisma'

// GET single purchase
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const purchase = prisma.purchaseBatch.findUnique({
      where: { id: params.id },
    })

    if (!purchase) {
      return NextResponse.json(
        { error: 'Purchase not found' },
        { status: 404 }
      )
    }

    // Get material name safely (JSON DB might not include relation)
    const rawMaterial = purchase.rawMaterial || (purchase as any).rawMaterialData
    let materialName = 'Unknown Material'
    if (rawMaterial) {
      materialName = rawMaterial.name || (rawMaterial as any)?.data?.name || 'Unknown Material'
    } else if (purchase.rawMaterialId) {
      // Fallback: fetch material separately if not included
      const material = prisma.rawMaterial.findUnique({
        where: { id: purchase.rawMaterialId },
      })
      materialName = material?.name || 'Unknown Material'
    }

    return NextResponse.json({
      id: purchase.id,
      rawMaterialId: purchase.rawMaterialId,
      rawMaterialName: materialName,
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

    // Check if purchase exists
    const existingPurchase = prisma.purchaseBatch.findUnique({
      where: { id: params.id },
    })

    if (!existingPurchase) {
      return NextResponse.json(
        { error: 'Purchase not found' },
        { status: 404 }
      )
    }

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

    const purchase = prisma.purchaseBatch.update({
      where: { id: params.id },
      data: {
        quantity: quantity ? parseFloat(quantity) : existingPurchase.quantity,
        unit: unit || existingPurchase.unit,
        unitPrice: finalUnitPrice || existingPurchase.unitPrice,
        totalCost: finalTotalCost || existingPurchase.totalCost,
        remainingQty: quantity ? parseFloat(quantity) : existingPurchase.remainingQty,
        purchaseDate: purchaseDate ? new Date(purchaseDate).toISOString() : existingPurchase.purchaseDate,
        gasCylinderQty: gasCylinderQty !== undefined ? (gasCylinderQty ? parseFloat(gasCylinderQty) : null) : existingPurchase.gasCylinderQty,
      },
    })

    if (!purchase) {
      return NextResponse.json(
        { error: 'Failed to update purchase' },
        { status: 500 }
      )
    }

    // Get material name separately
    let materialName = 'Unknown Material'
    if (purchase.rawMaterialId) {
      const material = prisma.rawMaterial.findUnique({
        where: { id: purchase.rawMaterialId },
      })
      materialName = material?.name || 'Unknown Material'
    }

    return NextResponse.json({
      id: purchase.id,
      rawMaterialId: purchase.rawMaterialId,
      rawMaterialName: materialName,
      quantity: purchase.quantity,
      unit: purchase.unit,
      unitPrice: purchase.unitPrice,
      totalCost: purchase.totalCost,
      purchaseDate: purchase.purchaseDate,
      remainingQty: purchase.remainingQty,
      gasCylinderQty: purchase.gasCylinderQty,
    })
  } catch (error) {
    console.error('Error updating purchase:', error)
    return NextResponse.json(
      { error: 'Failed to update purchase' },
      { status: 500 }
    )
  }
}

// DELETE purchase (move to deleted_items)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get user role from request header
    const userRole = (request.headers.get('x-user-role') || 'user') as 'user' | 'supervisor' | 'admin'
    
    // Get access control settings
    const settings = prisma.shopSettings.findFirst()
    const accessControl = (settings as any)?.accessControl || {}
    
    // Check permission for purchases_delete
    const hasPermission = accessControl.purchases_delete?.[userRole] ?? (userRole === 'admin')
    
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Permission denied. You do not have access to delete purchases.' },
        { status: 403 }
      )
    }

    const purchase = prisma.purchaseBatch.findUnique({
      where: { id: params.id },
    })

    if (!purchase) {
      return NextResponse.json(
        { error: 'Purchase not found' },
        { status: 404 }
      )
    }

    // Move to deleted_items
    const deletedItem = prisma.deletedItem.create({
      data: {
        category: 'purchase',
        originalData: purchase,
      },
    })
    console.log('Purchase moved to deleted_items:', deletedItem.id)

    // Delete from purchase_batches
    prisma.purchaseBatch.delete({
      where: { id: params.id },
    })
    
    // Reload database to ensure consistency
    if (typeof reloadDatabase === 'function') {
      reloadDatabase()
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting purchase:', error)
    return NextResponse.json(
      { error: 'Failed to delete purchase' },
      { status: 500 }
    )
  }
}

