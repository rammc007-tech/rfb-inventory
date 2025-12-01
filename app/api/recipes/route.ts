import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET all recipes
export async function GET() {
  try {
    const recipes = prisma.recipe.findMany({
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

    const formattedRecipes = recipes
      .filter((recipe) => recipe && recipe.id) // Filter out invalid recipes
      .map((recipe) => {
        // Ensure all required fields are present
        const materialName = (recipe as any).rawMaterial?.name || 'Unknown Material'
        
        return {
          id: recipe.id,
          name: recipe.name || 'Unnamed Recipe',
          outputQty: recipe.outputQty || 0,
          outputUnit: recipe.outputUnit || 'pieces',
          unitWeight: recipe.unitWeight || null,
          ingredients: (recipe.ingredients || []).map((ing: any) => {
            const rawMaterial = ing.rawMaterial || (ing as any).rawMaterialData
            const ingMaterialName = rawMaterial?.name || (rawMaterial as any)?.data?.name || 'Unknown Material'
            
            return {
              id: ing.id || '',
              recipeId: ing.recipeId || recipe.id,
              rawMaterialId: ing.rawMaterialId || '',
              rawMaterialName: ingMaterialName,
              quantity: ing.quantity || 0,
              unit: ing.unit || 'pieces',
            }
          }),
          createdAt: recipe.createdAt || new Date().toISOString(),
          updatedAt: recipe.updatedAt || new Date().toISOString(),
        }
      })

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
    const { name, outputQty, outputUnit, ingredients, unitWeight } = body

    if (!name || !outputQty || !outputUnit || !Array.isArray(ingredients) || ingredients.length === 0) {
      return NextResponse.json(
        { error: 'Name, outputQty, outputUnit, and ingredients are required' },
        { status: 400 }
      )
    }

    // Create recipe with nested ingredients (database.ts supports this)
    const recipe: any = prisma.recipe.create({
      data: {
        name: name.trim(),
        outputQty: parseFloat(outputQty),
        outputUnit: outputUnit,
        unitWeight: unitWeight ? parseFloat(unitWeight) : null,
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
      unitWeight: recipe.unitWeight || null,
      ingredients: (recipe.ingredients || []).map((ing: any) => ({
        id: ing.id,
        recipeId: ing.recipeId,
        rawMaterialId: ing.rawMaterialId,
        rawMaterialName: ing.rawMaterial?.name || 'Unknown',
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

