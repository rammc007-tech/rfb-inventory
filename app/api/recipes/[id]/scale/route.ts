import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { convertUnit } from '@/lib/units'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { desiredYield, desiredUnitId } = body

    const recipe = await prisma.recipe.findUnique({
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

    if (!recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    }

    // Convert desired yield to recipe's base unit
    const desiredYieldInBaseUnit = await convertUnit(
      desiredYield,
      desiredUnitId,
      recipe.yieldUnitId
    )

    // Calculate scaling factor
    const scalingFactor = desiredYieldInBaseUnit / recipe.yieldQuantity

    // Scale ingredients
    const scaledIngredients = await Promise.all(
      recipe.ingredients.map(async (ingredient) => {
        const scaledQuantity = ingredient.quantity * scalingFactor
        return {
          ...ingredient,
          scaledQuantity,
        }
      })
    )

    return NextResponse.json({
      originalYield: recipe.yieldQuantity,
      originalUnit: recipe.yieldUnit,
      desiredYield,
      desiredUnitId,
      scalingFactor,
      scaledIngredients,
    })
  } catch (error) {
    console.error('Error scaling recipe:', error)
    return NextResponse.json(
      { error: 'Failed to scale recipe' },
      { status: 500 }
    )
  }
}

