import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET all packing purchases
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const materialId = searchParams.get('materialId')

    const where: any = {}
    if (materialId) {
      where.packingMaterialId = materialId
    }

    const purchases = prisma.packingPurchase.findMany({
      where,
      orderBy: {
        purchaseDate: 'desc',
      },
    })

    if (!purchases || !Array.isArray(purchases)) {
      return NextResponse.json([])
    }

    // Get all materials first
    const allMaterials = prisma.packingMaterial.findMany({})
    const materialsMap = new Map()
    if (Array.isArray(allMaterials)) {
      allMaterials.forEach((mat: any) => {
        materialsMap.set(mat.id, mat.name)
      })
    }

    // Get packing material names
    const purchasesWithNames = purchases.map((purchase: any) => {
      const materialName = materialsMap.get(purchase.packingMaterialId) || 'Unknown'
      
      return {
        id: purchase.id,
        packingMaterialId: purchase.packingMaterialId,
        packingMaterialName: materialName,
        quantity: parseFloat(purchase.quantity) || 0,
        unit: purchase.unit || 'pieces',
        unitPrice: parseFloat(purchase.unitPrice) || 0,
        totalCost: parseFloat(purchase.totalCost) || 0,
        purchaseDate: purchase.purchaseDate,
        remainingQty: parseFloat(purchase.remainingQty) || 0,
        createdAt: purchase.createdAt,
        updatedAt: purchase.updatedAt,
      }
    })

    return NextResponse.json(purchasesWithNames)
  } catch (error) {
    console.error('Error fetching packing purchases:', error)
    return NextResponse.json(
      { error: 'Failed to fetch packing purchases', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

// POST create new packing purchase
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { packingMaterialId, quantity, unit, unitPrice, totalCost, purchaseDate } = body

    if (!packingMaterialId || !quantity || !unitPrice) {
      return NextResponse.json(
        { error: 'Packing material, quantity, and unit price are required' },
        { status: 400 }
      )
    }

    const calculatedTotal = totalCost || (parseFloat(quantity) * parseFloat(unitPrice))

    const purchase = prisma.packingPurchase.create({
      data: {
        packingMaterialId,
        quantity: parseFloat(quantity),
        unit: unit || 'pieces',
        unitPrice: parseFloat(unitPrice),
        totalCost: calculatedTotal,
        purchaseDate: purchaseDate || new Date().toISOString(),
        remainingQty: parseFloat(quantity),
      },
    })

    // Get material name for response
    const material = prisma.packingMaterial.findUnique({
      where: { id: packingMaterialId },
    })

    return NextResponse.json({
      ...purchase,
      packingMaterialName: material?.name || 'Unknown',
    })
  } catch (error) {
    console.error('Error creating packing purchase:', error)
    return NextResponse.json(
      { error: 'Failed to create packing purchase' },
      { status: 500 }
    )
  }
}

