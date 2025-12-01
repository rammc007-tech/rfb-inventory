import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET all packing materials with current stock
export async function GET() {
  try {
    const materials = prisma.packingMaterial.findMany({
      orderBy: {
        name: 'asc',
      },
    })

    if (!materials || !Array.isArray(materials) || materials.length === 0) {
      return NextResponse.json([])
    }

    // Calculate current stock for each material
    const materialsWithStock = materials.map((material: any) => {
      try {
        // Get all purchases and filter by material ID
        const allPurchases = prisma.packingPurchase.findMany({})
        const purchases = Array.isArray(allPurchases)
          ? allPurchases.filter((p: any) => p.packingMaterialId === material.id)
          : []
        
        const totalStock = purchases.reduce((sum: number, p: any) => {
              return sum + (parseFloat(p.remainingQty) || 0)
            }, 0)

        return {
          id: material.id,
          name: material.name || 'Unknown',
          unit: material.unit || 'pieces',
          category: material.category || 'Other',
          currentStock: totalStock,
          createdAt: material.createdAt,
          updatedAt: material.updatedAt,
        }
      } catch (err) {
        console.error('Error calculating stock for material:', material.id, err)
        return {
          id: material.id,
          name: material.name || 'Unknown',
          unit: material.unit || 'pieces',
          category: material.category || 'Other',
          currentStock: 0,
          createdAt: material.createdAt,
          updatedAt: material.updatedAt,
        }
      }
    })

    return NextResponse.json(materialsWithStock)
  } catch (error) {
    console.error('Error fetching packing materials:', error)
    return NextResponse.json(
      { error: 'Failed to fetch packing materials', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

// POST create new packing material
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, unit, category } = body

    if (!name || !unit) {
      return NextResponse.json(
        { error: 'Name and unit are required' },
        { status: 400 }
      )
    }

    const material = prisma.packingMaterial.create({
      data: {
        name: name.trim(),
        unit: unit,
        category: category || 'Other',
      },
    })

    return NextResponse.json(material)
  } catch (error) {
    console.error('Error creating packing material:', error)
    return NextResponse.json(
      { error: 'Failed to create packing material' },
      { status: 500 }
    )
  }
}

