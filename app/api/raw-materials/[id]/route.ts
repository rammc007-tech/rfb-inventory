import { NextRequest, NextResponse } from 'next/server'
import { prisma, reloadDatabase } from '@/lib/prisma'

// PUT update raw material
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { name, unit, isEssential } = body

    const updateData: any = {}
    if (name !== undefined) updateData.name = name.trim()
    if (unit !== undefined) updateData.unit = unit
    if (isEssential !== undefined) updateData.isEssential = isEssential

    const material = prisma.rawMaterial.update({
      where: { id: params.id },
      data: updateData,
    })

    if (!material) {
      return NextResponse.json(
        { error: 'Material not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: material.id,
      name: material.name,
      unit: material.unit,
      isEssential: material.isEssential,
    })
  } catch (error) {
    console.error('Error updating material:', error)
    return NextResponse.json(
      { error: 'Failed to update material' },
      { status: 500 }
    )
  }
}

// DELETE raw material (move to deleted_items)
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
    
    // Check permission for raw_materials_delete
    const hasPermission = accessControl.raw_materials_delete?.[userRole] ?? (userRole === 'admin')
    
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Permission denied. You do not have access to delete raw materials.' },
        { status: 403 }
      )
    }

    const material = prisma.rawMaterial.findUnique({
      where: { id: params.id },
    })

    if (!material) {
      return NextResponse.json(
        { error: 'Material not found' },
        { status: 404 }
      )
    }

    // Determine category based on isEssential flag
    const category = material.isEssential ? 'essential_item' : 'raw_material'
    
    console.log(`Deleting ${category}:`, material.name)
    
    // Move to deleted_items
    const deletedItem = prisma.deletedItem.create({
      data: {
        category: category,
        originalData: material,
      },
    })
    console.log(`${category} moved to deleted_items:`, deletedItem.id, material.name)

    // Delete from raw_materials
    prisma.rawMaterial.delete({
      where: { id: params.id },
    })
    
    console.log('Item deleted successfully')
    
    // Reload database to ensure consistency
    if (typeof reloadDatabase === 'function') {
      reloadDatabase()
    }

    return NextResponse.json({ 
      success: true,
      message: 'Item deleted successfully',
      category: category
    })
  } catch (error) {
    console.error('Error deleting material:', error)
    return NextResponse.json(
      { error: 'Failed to delete material' },
      { status: 500 }
    )
  }
}

