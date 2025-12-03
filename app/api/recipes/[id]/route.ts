import { NextRequest, NextResponse } from 'next/server'
import { prisma, reloadDatabase } from '@/lib/prisma'

// GET single recipe
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const recipe = prisma.recipe.findUnique({
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
      name: recipe.name || 'Unnamed Recipe',
      outputQty: recipe.outputQty || 0,
      outputUnit: recipe.outputUnit || 'pieces',
      unitWeight: recipe.unitWeight || null,
      ingredients: (recipe.ingredients || []).map((ing: any) => {
        const rawMaterial = ing.rawMaterial || (ing as any).rawMaterialData
        const materialName = rawMaterial?.name || (rawMaterial as any)?.data?.name || 'Unknown Material'
        
        return {
          id: ing.id || '',
          recipeId: ing.recipeId || recipe.id,
          rawMaterialId: ing.rawMaterialId || '',
          rawMaterialName: materialName,
          quantity: ing.quantity || 0,
          unit: ing.unit || 'pieces',
        }
      }),
      createdAt: recipe.createdAt || new Date().toISOString(),
      updatedAt: recipe.updatedAt || new Date().toISOString(),
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
    const { name, outputQty, outputUnit, ingredients, unitWeight } = body

    // Delete existing ingredients
    prisma.recipeIngredient.deleteMany({
      where: { recipeId: params.id },
    })

    // Update recipe (without nested ingredients)
    const recipe = prisma.recipe.update({
      where: { id: params.id },
      data: {
        name: name?.trim(),
        outputQty: outputQty ? parseFloat(outputQty) : undefined,
        outputUnit: outputUnit,
        unitWeight: unitWeight !== undefined ? (unitWeight ? parseFloat(unitWeight) : null) : undefined,
      },
    })

    // Create ingredients separately
    if (ingredients && Array.isArray(ingredients) && ingredients.length > 0) {
      for (const ing of ingredients) {
        if (ing.rawMaterialId && ing.quantity) {
          prisma.recipeIngredient.create({
            data: {
              recipeId: params.id,
            rawMaterialId: ing.rawMaterialId,
            quantity: parseFloat(ing.quantity),
              unit: ing.unit || 'kg',
            }
          })
        }
      }
    }

    // Fetch recipe with ingredients
    const recipeWithIngredients = prisma.recipe.findUnique({
      where: { id: params.id },
      include: {
        ingredients: {
          include: {
            rawMaterial: true,
          },
        },
      },
    })

    if (!recipeWithIngredients) {
      return NextResponse.json(
        { error: 'Recipe not found after update' },
        { status: 404 }
      )
    }

    const formattedRecipe = {
      id: recipeWithIngredients.id,
      name: recipeWithIngredients.name || 'Unnamed Recipe',
      outputQty: recipeWithIngredients.outputQty || 0,
      outputUnit: recipeWithIngredients.outputUnit || 'pieces',
      unitWeight: recipeWithIngredients.unitWeight || null,
      ingredients: (recipeWithIngredients.ingredients || []).map((ing: any) => {
        const rawMaterial = ing.rawMaterial || (ing as any).rawMaterialData
        const materialName = rawMaterial?.name || (rawMaterial as any)?.data?.name || 'Unknown Material'
        
        return {
          id: ing.id || '',
          recipeId: ing.recipeId || recipeWithIngredients.id,
          rawMaterialId: ing.rawMaterialId || '',
          rawMaterialName: materialName,
          quantity: ing.quantity || 0,
          unit: ing.unit || 'pieces',
        }
      }),
      createdAt: recipeWithIngredients.createdAt || new Date().toISOString(),
      updatedAt: recipeWithIngredients.updatedAt || new Date().toISOString(),
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

// DELETE recipe - NO PERMISSION CHECK
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🗑️ Delete request for recipe:', params.id)
    
    // Get recipe with ingredients before deleting
    const recipe = prisma.recipe.findUnique({
      where: { id: params.id },
      include: {
        ingredients: true,
      },
    })
    
    if (!recipe) {
      console.log('❌ Recipe not found:', params.id)
      return NextResponse.json(
        { error: 'Recipe not found' },
        { status: 404 }
      )
    }
    
    console.log('✓ Recipe found, moving to deleted_items')
    
    // Move to deleted_items (soft delete)
    const deletedItem = prisma.deletedItem.create({
      data: {
        category: 'recipe',
        originalData: recipe,
      },
    })
    console.log('✓ Recipe moved to deleted_items:', deletedItem.id)
    
    // Delete recipe and its ingredients
    prisma.recipeIngredient.deleteMany({
      where: { recipeId: params.id },
    })
    
    prisma.recipe.delete({
      where: { id: params.id },
    })
    
    console.log('✓ Recipe deleted successfully')
    
    // Reload database to ensure consistency
    if (typeof reloadDatabase === 'function') {
      reloadDatabase()
    }

    return NextResponse.json({ 
      success: true,
      message: 'Recipe deleted successfully'
    })
  } catch (error: any) {
    console.error('❌ Error deleting recipe:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete recipe' },
      { status: 500 }
    )
  }
}
