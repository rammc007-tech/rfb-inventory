import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { convertUnit } from '@/lib/unit-converter'
import type { Unit } from '@/lib/types'

// GET all raw materials with current stock
export async function GET() {
  try {
    // Add cache headers for better performance
    const headers = {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=60',
    }

    // Fetch materials - handle both array and non-array responses
    let materials: any[] = []
    try {
      const materialsResult = prisma.rawMaterial.findMany({
        orderBy: {
          name: 'asc',
        },
      })
      materials = Array.isArray(materialsResult) ? materialsResult : []
    } catch (err: any) {
      console.error('Error fetching materials:', err?.message || err)
      return NextResponse.json([], { status: 200, headers })
    }

    // Get purchase batches separately
    let allBatches: any[] = []
    try {
      const batchesResult = prisma.purchaseBatch.findMany({})
      allBatches = Array.isArray(batchesResult) ? batchesResult : []
    } catch (err: any) {
      console.error('Error fetching batches:', err?.message || err)
      allBatches = []
    }
    
    // Filter batches with remaining quantity > 0
    const activeBatches = Array.isArray(allBatches) 
      ? allBatches.filter((batch: any) => batch && (parseFloat(batch.remainingQty) || 0) > 0)
      : []

    // Return empty array if no materials
    if (!Array.isArray(materials) || materials.length === 0) {
      return NextResponse.json([])
    }

    // Calculate current stock for each material
    const materialsWithStock = materials
      .filter((material) => {
        // Ensure material has required fields
        if (!material || !material.id) return false
        // Handle both flat and nested structures
        const name = material.name || (material as any).data?.name
        if (!name) return false
        return true
      })
      .map((material) => {
        // Handle both flat and nested structures
        const name = material.name || (material as any).data?.name || 'Unknown'
        const unit = material.unit || (material as any).data?.unit || 'kg'
        const isEssential = material.isEssential || (material as any).data?.isEssential || false
        
        let totalStock = 0
        const baseUnit = unit === 'kg' || unit === 'g' ? 'g' : 
                         unit === 'liter' || unit === 'ml' ? 'ml' : 'pieces'

        // Calculate stock from purchase batches if available
        const purchaseBatches = Array.isArray(activeBatches) 
          ? activeBatches.filter((batch: any) => batch && batch.rawMaterialId === material.id)
          : []
        if (purchaseBatches.length > 0) {
          for (const batch of purchaseBatches) {
            if (batch) {
              const remainingQty = parseFloat(batch.remainingQty) || 0
              if (remainingQty > 0) {
                if (baseUnit === 'pieces') {
                  totalStock += remainingQty
                } else {
                  try {
                    const batchUnit = batch.unit || 'kg'
                    const baseQty = convertUnit(remainingQty, batchUnit as Unit, baseUnit as Unit)
                    totalStock += baseQty
                  } catch (convError) {
                    console.error('Unit conversion error:', convError)
                    // Fallback: add raw quantity if conversion fails
                    totalStock += remainingQty
                  }
                }
              }
            }
          }
        }

        let stockInDisplayUnit = totalStock
        if (baseUnit !== 'pieces') {
          try {
            stockInDisplayUnit = convertUnit(totalStock, baseUnit as Unit, unit as Unit)
          } catch (convError) {
            console.error('Stock unit conversion error:', convError)
            // Fallback: use totalStock as-is
            stockInDisplayUnit = totalStock
          }
        }

        return {
          id: material.id,
          name: name,
          unit: unit,
          isEssential: isEssential,
          currentStock: stockInDisplayUnit,
          stockUnit: unit,
          createdAt: material.createdAt || new Date().toISOString(),
          updatedAt: material.updatedAt || new Date().toISOString(),
        }
      })

    return NextResponse.json(materialsWithStock, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=60',
      },
    })
  } catch (error: any) {
    console.error('Error fetching raw materials:', error?.message || error)
    console.error('Error stack:', error?.stack)
    // Return empty array instead of error to prevent UI issues
    return NextResponse.json([], {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
    })
  }
}

// POST create new raw material
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, unit, isEssential } = body

    console.log('Creating raw material:', { name, unit, isEssential })

    if (!name || !unit) {
      console.error('Validation failed: name or unit missing', { name, unit })
      return NextResponse.json(
        { error: 'Name and unit are required' },
        { status: 400 }
      )
    }

    // Ensure database is initialized
    const { initDatabase } = require('@/lib/database')
    initDatabase()

    let material: any
    try {
      material = prisma.rawMaterial.create({
        data: {
          name: name.trim(),
          unit: unit,
          isEssential: isEssential || false,
        },
      })
      console.log('Material created successfully:', material?.id)
    } catch (createError: any) {
      console.error('Error creating material:', createError)
      console.error('Error details:', {
        code: createError.code,
        message: createError.message,
        stack: createError.stack,
      })
      if (createError.code === 'P2002' || createError.message?.includes('already exists') || createError.message?.includes('Unique constraint')) {
        return NextResponse.json(
          { error: 'Raw material with this name already exists' },
          { status: 400 }
        )
      }
      // Return more detailed error for debugging
      return NextResponse.json(
        { error: `Failed to create material: ${createError.message || 'Unknown error'}` },
        { status: 400 }
      )
    }

    if (!material || !material.id) {
      console.error('Material creation returned invalid response:', material)
      return NextResponse.json(
        { error: 'Failed to create material - invalid response' },
        { status: 500 }
      )
    }

    const response = {
      id: material.id,
      name: material.name || name.trim(),
      unit: material.unit || unit,
      isEssential: material.isEssential || false,
      currentStock: 0,
      stockUnit: material.unit || unit,
      createdAt: material.createdAt || new Date().toISOString(),
      updatedAt: material.updatedAt || new Date().toISOString(),
    }

    console.log('Returning created material:', response)
    return NextResponse.json(response, { status: 201 })
  } catch (error: any) {
    console.error('Unexpected error in POST /api/raw-materials:', error)
    console.error('Error stack:', error?.stack)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Raw material with this name already exists' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: `Failed to create raw material: ${error.message || 'Unknown error'}` },
      { status: 500 }
    )
  }
}

