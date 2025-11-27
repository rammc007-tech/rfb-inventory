import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET single recipe
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const recipe = await prisma.recipe.findUnique({
      where: { id: params.id },
      include: {
        ingredients: {
          include: {
            rawMaterial: true,
          },
        },
      },
    })

    if (!recipe) {
      return NextResponse.json(
        { error: 'Recipe not found' },
        { status: 404 }
      )
    }

    const formattedRecipe = {
      id: recipe.id,
      name: recipe.name,
      outputQty: recipe.outputQty,
      outputUnit: recipe.outputUnit,
      ingredients: recipe.ingredients.map((ing) => ({
        id: ing.id,
        recipeId: ing.recipeId,
        rawMaterialId: ing.rawMaterialId,
        rawMaterialName: ing.rawMaterial.name,
        quantity: ing.quantity,
        unit: ing.unit,
      })),
      createdAt: recipe.createdAt,
      updatedAt: recipe.updatedAt,
    }

    return NextResponse.json(formattedRecipe)
  } catch (error) {
    console.error('Error fetching recipe:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recipe' },
      { status: 500 }
    )
  }
}

// PUT update recipe
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { name, outputQty, outputUnit, ingredients } = body

    // Delete existing ingredients
    await prisma.recipeIngredient.deleteMany({
      where: { recipeId: params.id },
    })

    // Update recipe
    const recipe = await prisma.recipe.update({
      where: { id: params.id },
      data: {
        name: name?.trim(),
        outputQty: outputQty ? parseFloat(outputQty) : undefined,
        outputUnit: outputUnit,
        ingredients: ingredients ? {
          create: ingredients.map((ing: any) => ({
            rawMaterialId: ing.rawMaterialId,
            quantity: parseFloat(ing.quantity),
            unit: ing.unit,
          })),
        } : undefined,
      },
      include: {
        ingredients: {
          include: {
            rawMaterial: true,
          },
        },
      },
    })

    const formattedRecipe = {
      id: recipe.id,
      name: recipe.name,
      outputQty: recipe.outputQty,
      outputUnit: recipe.outputUnit,
      ingredients: recipe.ingredients.map((ing) => ({
        id: ing.id,
        recipeId: ing.recipeId,
        rawMaterialId: ing.rawMaterialId,
        rawMaterialName: ing.rawMaterial.name,
        quantity: ing.quantity,
        unit: ing.unit,
      })),
      createdAt: recipe.createdAt,
      updatedAt: recipe.updatedAt,
    }

    return NextResponse.json(formattedRecipe)
  } catch (error) {
    console.error('Error updating recipe:', error)
    return NextResponse.json(
      { error: 'Failed to update recipe' },
      { status: 500 }
    )
  }
}

// DELETE recipe
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.recipe.delete({
      where: { id: params.id },
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

