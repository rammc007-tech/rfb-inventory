import { NextRequest, NextResponse } from 'next/server'
import { prisma, reloadDatabase } from '@/lib/prisma'

// GET all deleted items
export async function GET(request: NextRequest) {
  try {
    // Force reload database to get fresh data
    reloadDatabase()
    
    const deletedItems = prisma.deletedItem.findMany({
      orderBy: {
        deletedAt: 'desc',
      },
    })

    console.log('Fetched deleted items count:', Array.isArray(deletedItems) ? deletedItems.length : 0)
    if (Array.isArray(deletedItems) && deletedItems.length > 0) {
      console.log('Sample deleted item:', JSON.stringify(deletedItems[0], null, 2))
    }

    return NextResponse.json(Array.isArray(deletedItems) ? deletedItems : [])
  } catch (error) {
    console.error('Error fetching deleted items:', error)
    return NextResponse.json(
      { error: 'Failed to fetch deleted items' },
      { status: 500 }
    )
  }
}

// POST restore deleted item
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { deletedItemId } = body

    if (!deletedItemId) {
      return NextResponse.json(
        { error: 'Deleted item ID is required' },
        { status: 400 }
      )
    }

    const deletedItem = prisma.deletedItem.findUnique({
      where: { id: deletedItemId },
    })

    if (!deletedItem) {
      return NextResponse.json(
        { error: 'Deleted item not found' },
        { status: 404 }
      )
    }

    // Restore item to original table
    const originalData = deletedItem.originalData
    const category = deletedItem.category

    // Restore based on category
    if (category === 'raw_material' || category === 'essential_item') {
      // Both raw materials and essential items go to raw_materials table
      const restoreData = { ...originalData }
      // Ensure isEssential flag is set correctly
      if (category === 'essential_item') {
        restoreData.isEssential = true
      }
      prisma.rawMaterial.create({
        data: restoreData,
      })
      console.log(`✅ Restored ${category}:`, restoreData.name)
    } else if (category === 'recipe') {
      // Restore recipe first
      const recipeData = { ...originalData }
      delete recipeData.ingredients // Remove ingredients, they'll be restored separately
      const restoredRecipe: any = prisma.recipe.create({
        data: recipeData,
      })
      // Restore ingredients if they exist
      if (originalData.ingredients && Array.isArray(originalData.ingredients)) {
        for (const ing of originalData.ingredients) {
          prisma.recipeIngredient.create({
            data: {
              recipeId: restoredRecipe.id,
              rawMaterialId: ing.rawMaterialId,
              quantity: ing.quantity,
              unit: ing.unit,
            },
          })
        }
      }
    } else if (category === 'packing_material') {
      prisma.packingMaterial.create({
        data: originalData,
      })
    } else if (category === 'purchase') {
      prisma.purchaseBatch.create({
        data: originalData,
      })
    } else if (category === 'packing_purchase') {
      prisma.packingPurchase.create({
        data: originalData,
      })
    } else if (category === 'production_log') {
      prisma.productionLog.create({
        data: originalData,
      })
    }

    // Remove from deleted items
    prisma.deletedItem.delete({
      where: { id: deletedItemId },
    })
    
    // Force database reload
    if (typeof reloadDatabase === 'function') {
      reloadDatabase()
    }

    console.log(`✅ Item restored and deleted_item removed: ${deletedItemId}`)
    
    return NextResponse.json({ 
      message: 'Item restored successfully',
      category: category,
      success: true
    })
  } catch (error) {
    console.error('Error restoring deleted item:', error)
    return NextResponse.json(
      { error: 'Failed to restore deleted item' },
      { status: 500 }
    )
  }
}

// DELETE permanently delete item (empty bin)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const deletedItemId = searchParams.get('id')
    const emptyAll = searchParams.get('emptyAll') === 'true'

    if (emptyAll) {
      // Empty all deleted items
      prisma.deletedItem.deleteMany({})
      return NextResponse.json({ message: 'All deleted items permanently removed' })
    }

    if (!deletedItemId) {
      return NextResponse.json(
        { error: 'Deleted item ID is required' },
        { status: 400 }
      )
    }

    prisma.deletedItem.delete({
      where: { id: deletedItemId },
    })

    return NextResponse.json({ message: 'Item permanently deleted' })
  } catch (error) {
    console.error('Error deleting item:', error)
    return NextResponse.json(
      { error: 'Failed to delete item' },
      { status: 500 }
    )
  }
}

