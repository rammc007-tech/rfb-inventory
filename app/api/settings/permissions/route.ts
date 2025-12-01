import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET permissions
export async function GET() {
  try {
    const settings = prisma.shopSettings.findFirst()
    
    return NextResponse.json({
      recipeDelete: (settings as any)?.recipeDeletePermission || 'supervisor',
      productionDelete: (settings as any)?.productionDeletePermission || 'supervisor',
    })
  } catch (error) {
    console.error('Error fetching permissions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch permissions' },
      { status: 500 }
    )
  }
}

// PUT update permissions
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { recipeDelete, productionDelete } = body

    const existing = prisma.shopSettings.findFirst()
    
    if (existing) {
      prisma.shopSettings.update({
        where: { id: (existing as any).id },
        data: {
          recipeDeletePermission: recipeDelete || 'supervisor',
          productionDeletePermission: productionDelete || 'supervisor',
        },
      })
    } else {
      prisma.shopSettings.create({
        data: {
          recipeDeletePermission: recipeDelete || 'supervisor',
          productionDeletePermission: productionDelete || 'supervisor',
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating permissions:', error)
    return NextResponse.json(
      { error: 'Failed to update permissions' },
      { status: 500 }
    )
  }
}

