import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const recipe = await prisma.recipe.findFirst({
      where: { 
        id: params.id,
        deletedAt: null, // Only get non-deleted recipes
      },
      include: {
        yieldUnit: true,
        ingredients: {
          include: {
            item: {
              include: {
                baseUnit: true,
              },
            },
            unit: true,
          },
        },
      },
    })

    if (!recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    }

    return NextResponse.json(recipe)
  } catch (error) {
    console.error('Error fetching recipe:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recipe' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, yieldQuantity, yieldUnitId, ingredients } = body

    // Update recipe
    await prisma.recipe.update({
      where: { id: params.id },
      data: {
        name,
        description,
        yieldQuantity,
        yieldUnitId,
      },
    })

    // Update ingredients
    await prisma.recipeIngredient.deleteMany({
      where: { recipeId: params.id },
    })

    await prisma.recipeIngredient.createMany({
      data: ingredients.map((ing: any) => ({
        recipeId: params.id,
        itemId: ing.itemId,
        quantity: ing.quantity,
        unitId: ing.unitId,
      })),
    })

    const updatedRecipe = await prisma.recipe.findUnique({
      where: { id: params.id },
      include: {
        yieldUnit: true,
        ingredients: {
          include: {
            item: {
              include: {
                baseUnit: true,
              },
            },
            unit: true,
          },
        },
      },
    })

    return NextResponse.json(updatedRecipe)
  } catch (error) {
    console.error('Error updating recipe:', error)
    return NextResponse.json(
      { error: 'Failed to update recipe' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Soft delete - set deletedAt timestamp
    await prisma.recipe.update({
      where: { id: params.id },
      data: { deletedAt: new Date() },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting recipe:', error)
    return NextResponse.json(
      { error: 'Failed to delete recipe' },
      { status: 500 }
    )
  }
}

