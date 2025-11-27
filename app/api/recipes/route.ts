import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET all recipes
export async function GET() {
  try {
    const recipes = await prisma.recipe.findMany({
      include: {
        ingredients: {
          include: {
            rawMaterial: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    const formattedRecipes = recipes.map((recipe) => ({
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
    }))

    return NextResponse.json(formattedRecipes)
  } catch (error) {
    console.error('Error fetching recipes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recipes' },
      { status: 500 }
    )
  }
}

// POST create new recipe
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, outputQty, outputUnit, ingredients } = body

    if (!name || !outputQty || !outputUnit || !Array.isArray(ingredients) || ingredients.length === 0) {
      return NextResponse.json(
        { error: 'Name, outputQty, outputUnit, and ingredients are required' },
        { status: 400 }
      )
    }

    const recipe = await prisma.recipe.create({
      data: {
        name: name.trim(),
        outputQty: parseFloat(outputQty),
        outputUnit: outputUnit,
        ingredients: {
          create: ingredients.map((ing: any) => ({
            rawMaterialId: ing.rawMaterialId,
            quantity: parseFloat(ing.quantity),
            unit: ing.unit,
          })),
        },
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
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Recipe with this name already exists' },
        { status: 400 }
      )
    }
    console.error('Error creating recipe:', error)
    return NextResponse.json(
      { error: 'Failed to create recipe' },
      { status: 500 }
    )
  }
}

