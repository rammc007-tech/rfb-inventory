import { NextRequest, NextResponse } from 'next/server'
import { prisma, reloadDatabase } from '@/lib/prisma'

// GET single packing material
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const material = prisma.packingMaterial.findUnique({
      where: { id: params.id },
    })

    if (!material) {
      return NextResponse.json(
        { error: 'Packing material not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(material)
  } catch (error) {
    console.error('Error fetching packing material:', error)
    return NextResponse.json(
      { error: 'Failed to fetch packing material' },
      { status: 500 }
    )
  }
}

// PUT update packing material
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { name, unit, category } = body

    // Check if material exists
    const existingMaterial = prisma.packingMaterial.findUnique({
      where: { id: params.id },
    })

    if (!existingMaterial) {
      return NextResponse.json(
        { error: 'Packing material not found' },
        { status: 404 }
      )
    }

    const material = prisma.packingMaterial.update({
      where: { id: params.id },
      data: {
        ...(name && { name: name.trim() }),
        ...(unit && { unit }),
        ...(category && { category }),
      },
    })

    return NextResponse.json(material)
  } catch (error) {
    console.error('Error updating packing material:', error)
    return NextResponse.json(
      { error: 'Failed to update packing material' },
      { status: 500 }
    )
  }
}

// DELETE packing material (move to deleted_items)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const material = prisma.packingMaterial.findUnique({
      where: { id: params.id },
    })

    if (!material) {
      return NextResponse.json(
        { error: 'Packing material not found' },
        { status: 404 }
      )
    }

    // Move to deleted_items
    const deletedItem = prisma.deletedItem.create({
      data: {
        category: 'packing_material',
        originalData: material,
      },
    })
    console.log('Packing material moved to deleted_items:', deletedItem.id)

    // Delete from packing_materials
    prisma.packingMaterial.delete({
      where: { id: params.id },
    })
    
    // Reload database to ensure consistency
    if (typeof reloadDatabase === 'function') {
      reloadDatabase()
    }

    return NextResponse.json({ message: 'Packing material deleted successfully' })
  } catch (error) {
    console.error('Error deleting packing material:', error)
    return NextResponse.json(
      { error: 'Failed to delete packing material' },
      { status: 500 }
    )
  }
}

