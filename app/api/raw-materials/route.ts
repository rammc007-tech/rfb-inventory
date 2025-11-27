import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { convertUnit } from '@/lib/unit-converter'
import type { Unit } from '@/lib/types'

// GET all raw materials with current stock
export async function GET() {
  try {
    const materials = await prisma.rawMaterial.findMany({
      include: {
        purchaseBatches: {
          where: {
            remainingQty: { gt: 0 },
          },
          orderBy: {
            purchaseDate: 'asc',
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    // Calculate current stock for each material
    const materialsWithStock = materials.map((material) => {
      let totalStock = 0
      const baseUnit = material.unit === 'kg' || material.unit === 'g' ? 'g' : 
                       material.unit === 'liter' || material.unit === 'ml' ? 'ml' : 'pieces'

      for (const batch of material.purchaseBatches) {
        if (batch.remainingQty > 0) {
          if (baseUnit === 'pieces') {
            totalStock += batch.remainingQty
          } else {
            const baseQty = convertUnit(batch.remainingQty, batch.unit as Unit, baseUnit as Unit)
            totalStock += baseQty
          }
        }
      }

      const stockInDisplayUnit = baseUnit === 'pieces' 
        ? totalStock 
        : convertUnit(totalStock, baseUnit as Unit, material.unit as Unit)

      return {
        id: material.id,
        name: material.name,
        unit: material.unit,
        isEssential: material.isEssential,
        currentStock: stockInDisplayUnit,
        stockUnit: material.unit,
        createdAt: material.createdAt,
        updatedAt: material.updatedAt,
      }
    })

    return NextResponse.json(materialsWithStock)
  } catch (error) {
    console.error('Error fetching raw materials:', error)
    return NextResponse.json(
      { error: 'Failed to fetch raw materials' },
      { status: 500 }
    )
  }
}

// POST create new raw material
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, unit, isEssential } = body

    if (!name || !unit) {
      return NextResponse.json(
        { error: 'Name and unit are required' },
        { status: 400 }
      )
    }

    const material = await prisma.rawMaterial.create({
      data: {
        name: name.trim(),
        unit: unit,
        isEssential: isEssential || false,
      },
    })

    return NextResponse.json({
        id: material.id,
        name: material.name,
        unit: material.unit,
        isEssential: material.isEssential,
        currentStock: 0,
        stockUnit: material.unit,
        createdAt: material.createdAt,
        updatedAt: material.updatedAt,
    })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Raw material with this name already exists' },
        { status: 400 }
      )
    }
    console.error('Error creating raw material:', error)
    return NextResponse.json(
      { error: 'Failed to create raw material' },
      { status: 500 }
    )
  }
}

