import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Unit } from '@/lib/types'

// GET all purchase batches
export async function GET() {
  try {
    const batches = prisma.purchaseBatch.findMany({
      include: {
        rawMaterial: true,
      },
      orderBy: {
        purchaseDate: 'desc',
      },
    })

    const formattedBatches = batches
      .filter((batch) => batch && batch.id) // Filter out invalid batches
      .map((batch) => {
        // Handle both flat and nested structures for rawMaterial
        const rawMaterial = batch.rawMaterial || (batch as any).rawMaterialData
        const materialName = rawMaterial?.name || (rawMaterial as any)?.data?.name || 'Unknown Material'
        
        return {
          id: batch.id,
          rawMaterialId: batch.rawMaterialId,
          rawMaterialName: materialName,
          quantity: batch.quantity || 0,
          unit: batch.unit || 'kg',
          unitPrice: batch.unitPrice || 0,
          totalCost: batch.totalCost || 0,
          purchaseDate: batch.purchaseDate || new Date().toISOString(),
          remainingQty: batch.remainingQty !== undefined ? batch.remainingQty : batch.quantity || 0,
          gasCylinderQty: batch.gasCylinderQty || null,
        }
      })

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

      if (!materialId || quantity === undefined || !unit || unitPrice === undefined) {
        console.error('Missing required fields:', { materialId, quantity, unit, unitPrice })
        continue
      }

      // Verify material exists
      const material = prisma.rawMaterial.findUnique({
        where: { id: materialId },
      })

      if (!material) {
        console.error('Material not found:', materialId)
        continue
      }

      // Ensure numeric values
      const qty = parseFloat(quantity)
      const price = parseFloat(unitPrice)
      
      if (isNaN(qty) || isNaN(price)) {
        console.error('Invalid numeric values:', { quantity, unitPrice })
        continue
      }

      const totalCost = qty * price

      try {
        const batch = prisma.purchaseBatch.create({
          data: {
            rawMaterialId: materialId,
            quantity: qty,
            unit: unit,
            unitPrice: price,
            totalCost: totalCost,
            remainingQty: qty, // Initially, remaining = total
            gasCylinderQty: gasCylinderQty ? parseFloat(gasCylinderQty) : null,
          },
        })

        // Get material name (already fetched above)
        const materialName = material.name || 'Unknown Material'

        createdBatches.push({
          id: batch.id,
          rawMaterialId: batch.rawMaterialId,
          rawMaterialName: materialName,
          quantity: batch.quantity,
          unit: batch.unit,
          unitPrice: batch.unitPrice,
          totalCost: batch.totalCost,
          purchaseDate: batch.purchaseDate || new Date().toISOString(),
          remainingQty: batch.remainingQty !== undefined ? batch.remainingQty : batch.quantity,
          gasCylinderQty: batch.gasCylinderQty || null,
        })
      } catch (createError: any) {
        console.error('Error creating batch:', createError)
        console.error('Error message:', createError?.message)
        console.error('Error stack:', createError?.stack)
        // Return error immediately so user knows what's wrong
        return NextResponse.json(
          { error: `Failed to create purchase: ${createError?.message || 'Unknown error'}` },
          { status: 500 }
        )
      }
    }

    if (createdBatches.length === 0) {
      return NextResponse.json(
        { error: 'No purchases were created. Please check your input data.' },
        { status: 400 }
      )
    }

    return NextResponse.json(createdBatches)
  } catch (error: any) {
    console.error('Error creating purchase:', error)
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
    })
    return NextResponse.json(
      { error: error.message || 'Failed to create purchase' },
      { status: 500 }
    )
  }
}

