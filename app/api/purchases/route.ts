import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Unit } from '@/lib/types'

// GET all purchase batches
export async function GET() {
  try {
    const batches = await prisma.purchaseBatch.findMany({
      include: {
        rawMaterial: true,
      },
      orderBy: {
        purchaseDate: 'desc',
      },
    })

    const formattedBatches = batches.map((batch) => ({
      id: batch.id,
      rawMaterialId: batch.rawMaterialId,
      rawMaterialName: batch.rawMaterial.name,
      quantity: batch.quantity,
      unit: batch.unit,
      unitPrice: batch.unitPrice,
      totalCost: batch.totalCost,
      purchaseDate: batch.purchaseDate,
      remainingQty: batch.remainingQty,
      gasCylinderQty: batch.gasCylinderQty,
    }))

    return NextResponse.json(formattedBatches)
  } catch (error) {
    console.error('Error fetching purchases:', error)
    return NextResponse.json(
      { error: 'Failed to fetch purchases' },
      { status: 500 }
    )
  }
}

// POST create purchase entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { purchases } = body

    if (!Array.isArray(purchases) || purchases.length === 0) {
      return NextResponse.json(
        { error: 'Purchases array is required' },
        { status: 400 }
      )
    }

    const createdBatches = []

    for (const purchase of purchases) {
      const { materialId, quantity, unit, unitPrice, gasCylinderQty } = purchase

      if (!materialId || !quantity || !unit || unitPrice === undefined) {
        continue
      }

      // Verify material exists
      const material = await prisma.rawMaterial.findUnique({
        where: { id: materialId },
      })

      if (!material) {
        continue
      }

      const totalCost = quantity * unitPrice

      const batch = await prisma.purchaseBatch.create({
        data: {
          rawMaterialId: materialId,
          quantity: quantity,
          unit: unit,
          unitPrice: unitPrice,
          totalCost: totalCost,
          remainingQty: quantity, // Initially, remaining = total
          gasCylinderQty: gasCylinderQty || null, // Gas cylinder quantity if applicable
        },
        include: {
          rawMaterial: true,
        },
      })

      createdBatches.push({
        id: batch.id,
        rawMaterialId: batch.rawMaterialId,
        rawMaterialName: batch.rawMaterial.name,
        quantity: batch.quantity,
        unit: batch.unit,
        unitPrice: batch.unitPrice,
        totalCost: batch.totalCost,
        purchaseDate: batch.purchaseDate,
        remainingQty: batch.remainingQty,
        gasCylinderQty: batch.gasCylinderQty,
      })
    }

    return NextResponse.json(createdBatches)
  } catch (error) {
    console.error('Error creating purchase:', error)
    return NextResponse.json(
      { error: 'Failed to create purchase' },
      { status: 500 }
    )
  }
}

