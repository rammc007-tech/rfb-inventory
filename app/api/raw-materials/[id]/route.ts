import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PUT update raw material (for marking as essential)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { isEssential } = body

    const material = await prisma.rawMaterial.update({
      where: { id: params.id },
      data: {
        isEssential: isEssential !== undefined ? isEssential : undefined,
      },
    })

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

