import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Fetch all deleted items
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let items: any[] = []
    let recipes: any[] = []
    let purchases: any[] = []
    let productions: any[] = []
    let suppliers: any[] = []

    try {
      // Query for deleted items - use a more reliable approach
      const results = await Promise.all([
        // Deleted Items - use fetch-all-and-filter method (most reliable for SQLite)
        (async () => {
          try {
            // Get all items and filter in memory (most reliable method for SQLite)
            const allItems = await prisma.item.findMany({
              select: {
                id: true,
                name: true,
                deletedAt: true,
              },
            })
            
            // Filter items with deletedAt set
            const filtered = allItems.filter((item: any) => {
              const hasDeletedAt = item.deletedAt !== null && item.deletedAt !== undefined
              // Log for debugging
              if (hasDeletedAt) {
                console.log('[Trash API] Found deleted item:', {
                  id: item.id,
                  name: item.name,
                  deletedAt: item.deletedAt,
                })
              }
              return hasDeletedAt
            })
            
            // Sort by deletedAt descending
            filtered.sort((a: any, b: any) => {
              const dateA = a.deletedAt ? new Date(a.deletedAt).getTime() : 0
              const dateB = b.deletedAt ? new Date(b.deletedAt).getTime() : 0
              return dateB - dateA
            })
            
            console.log('[Trash API] Total items:', allItems.length, 'Deleted items:', filtered.length)
            return filtered
          } catch (err: any) {
            // Silently return empty array on error
            return []
          }
        })(),
        // Deleted Recipes
        (async () => {
          try {
            try {
              const deletedRecipes = await prisma.recipe.findMany({
                where: { deletedAt: { not: null } },
                select: {
                  id: true,
                  name: true,
                  deletedAt: true,
                },
                orderBy: { deletedAt: 'desc' },
              })
              return deletedRecipes
            } catch {
              const allRecipes = await prisma.recipe.findMany({
                select: {
                  id: true,
                  name: true,
                  deletedAt: true,
                },
              })
              const filtered = allRecipes.filter((r: any) => r.deletedAt !== null && r.deletedAt !== undefined)
              filtered.sort((a: any, b: any) => {
                const dateA = a.deletedAt ? new Date(a.deletedAt).getTime() : 0
                const dateB = b.deletedAt ? new Date(b.deletedAt).getTime() : 0
                return dateB - dateA
              })
              return filtered
            }
          } catch {
            return []
          }
        })(),
        // Deleted Purchases
        (async () => {
          try {
            try {
              const deletedPurchases = await prisma.purchase.findMany({
                where: { deletedAt: { not: null } },
                select: {
                  id: true,
                  deletedAt: true,
                },
                orderBy: { deletedAt: 'desc' },
              })
              return deletedPurchases.map((p: any) => ({
                id: p.id,
                name: `Purchase #${p.id}`,
                deletedAt: p.deletedAt,
              }))
            } catch {
              const allPurchases = await prisma.purchase.findMany({
                select: {
                  id: true,
                  deletedAt: true,
                },
              })
              const filtered = allPurchases.filter((p: any) => p.deletedAt !== null && p.deletedAt !== undefined)
              filtered.sort((a: any, b: any) => {
                const dateA = a.deletedAt ? new Date(a.deletedAt).getTime() : 0
                const dateB = b.deletedAt ? new Date(b.deletedAt).getTime() : 0
                return dateB - dateA
              })
              return filtered.map((p: any) => ({
                id: p.id,
                name: `Purchase #${p.id}`,
                deletedAt: p.deletedAt,
              }))
            }
          } catch {
            return []
          }
        })(),
        // Deleted Productions
        (async () => {
          try {
            try {
              const deletedProductions = await prisma.production.findMany({
                where: { deletedAt: { not: null } },
                select: {
                  id: true,
                  deletedAt: true,
                },
                orderBy: { deletedAt: 'desc' },
              })
              return deletedProductions.map((p: any) => ({
                id: p.id,
                name: `Production #${p.id}`,
                deletedAt: p.deletedAt,
              }))
            } catch {
              const allProductions = await prisma.production.findMany({
                select: {
                  id: true,
                  deletedAt: true,
                },
              })
              const filtered = allProductions.filter((p: any) => p.deletedAt !== null && p.deletedAt !== undefined)
              filtered.sort((a: any, b: any) => {
                const dateA = a.deletedAt ? new Date(a.deletedAt).getTime() : 0
                const dateB = b.deletedAt ? new Date(b.deletedAt).getTime() : 0
                return dateB - dateA
              })
              return filtered.map((p: any) => ({
                id: p.id,
                name: `Production #${p.id}`,
                deletedAt: p.deletedAt,
              }))
            }
          } catch {
            return []
          }
        })(),
        // Deleted Suppliers
        (async () => {
          try {
            try {
              const deletedSuppliers = await prisma.supplier.findMany({
                where: { deletedAt: { not: null } },
                select: {
                  id: true,
                  name: true,
                  deletedAt: true,
                },
                orderBy: { deletedAt: 'desc' },
              })
              return deletedSuppliers
            } catch {
              const allSuppliers = await prisma.supplier.findMany({
                select: {
                  id: true,
                  name: true,
                  deletedAt: true,
                },
              })
              const filtered = allSuppliers.filter((s: any) => s.deletedAt !== null && s.deletedAt !== undefined)
              filtered.sort((a: any, b: any) => {
                const dateA = a.deletedAt ? new Date(a.deletedAt).getTime() : 0
                const dateB = b.deletedAt ? new Date(b.deletedAt).getTime() : 0
                return dateB - dateA
              })
              return filtered
            }
          } catch {
            return []
          }
        })(),
      ])

      items = results[0] || []
      recipes = results[1] || []
      purchases = results[2] || []
      productions = results[3] || []
      suppliers = results[4] || []
    } catch (queryError: any) {
      // Silently handle errors - return empty arrays
      items = []
      recipes = []
      purchases = []
      productions = []
      suppliers = []
    }

    // Format response - ensure all items have required fields
    const formattedResponse = {
      items: items.map((item: any) => {
        // Ensure deletedAt is properly formatted
        let deletedAtValue = item.deletedAt
        if (deletedAtValue) {
          // If it's already a Date object, convert to ISO string
          if (deletedAtValue instanceof Date) {
            deletedAtValue = deletedAtValue.toISOString()
          } else if (typeof deletedAtValue === 'string') {
            // If it's a string, ensure it's valid
            try {
              new Date(deletedAtValue)
            } catch {
              deletedAtValue = new Date().toISOString()
            }
          } else {
            deletedAtValue = new Date().toISOString()
          }
        } else {
          deletedAtValue = new Date().toISOString()
        }
        
        return {
          id: item.id,
          name: item.name || 'Unknown Item',
          deletedAt: deletedAtValue,
        }
      }),
      recipes: recipes.map((recipe: any) => ({
        id: recipe.id,
        name: recipe.name || 'Unknown Recipe',
        deletedAt: recipe.deletedAt ? new Date(recipe.deletedAt).toISOString() : new Date().toISOString(),
      })),
      purchases: purchases.map((purchase: any) => ({
        id: purchase.id,
        name: purchase.name || `Purchase #${purchase.id}`,
        deletedAt: purchase.deletedAt ? new Date(purchase.deletedAt).toISOString() : new Date().toISOString(),
      })),
      productions: productions.map((production: any) => ({
        id: production.id,
        name: production.name || `Production #${production.id}`,
        deletedAt: production.deletedAt ? new Date(production.deletedAt).toISOString() : new Date().toISOString(),
      })),
      suppliers: suppliers.map((supplier: any) => ({
        id: supplier.id,
        name: supplier.name || 'Unknown Supplier',
        deletedAt: supplier.deletedAt ? new Date(supplier.deletedAt).toISOString() : new Date().toISOString(),
      })),
    }

    return NextResponse.json(formattedResponse)
  } catch (error: any) {
    // Return empty arrays instead of error to prevent breaking other pages
    return NextResponse.json({
      items: [],
      recipes: [],
      purchases: [],
      productions: [],
      suppliers: [],
    })
  }
}

// POST - Restore or permanently delete items
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, entityType, ids } = body

    if (!action || !entityType || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request. Action, entityType, and ids are required.' },
        { status: 400 }
      )
    }

    if (action === 'restore') {
      // Restore items by setting deletedAt to null
      const updateData = { deletedAt: null }
      
      switch (entityType) {
        case 'item':
          await prisma.item.updateMany({
            where: { id: { in: ids } },
            data: updateData,
          })
          break
        case 'recipe':
          await prisma.recipe.updateMany({
            where: { id: { in: ids } },
            data: updateData,
          })
          break
        case 'purchase':
          await prisma.purchase.updateMany({
            where: { id: { in: ids } },
            data: updateData,
          })
          break
        case 'production':
          await prisma.production.updateMany({
            where: { id: { in: ids } },
            data: updateData,
          })
          break
        case 'supplier':
          await prisma.supplier.updateMany({
            where: { id: { in: ids } },
            data: updateData,
          })
          break
        default:
          return NextResponse.json(
            { error: 'Invalid entity type' },
            { status: 400 }
          )
      }

      return NextResponse.json({ success: true, message: 'Items restored successfully' })
    } else if (action === 'delete') {
      // Permanently delete items
      switch (entityType) {
        case 'item':
          await prisma.item.deleteMany({
            where: { id: { in: ids } },
          })
          break
        case 'recipe':
          await prisma.recipe.deleteMany({
            where: { id: { in: ids } },
          })
          break
        case 'purchase':
          await prisma.purchase.deleteMany({
            where: { id: { in: ids } },
          })
          break
        case 'production':
          await prisma.production.deleteMany({
            where: { id: { in: ids } },
          })
          break
        case 'supplier':
          await prisma.supplier.deleteMany({
            where: { id: { in: ids } },
          })
          break
        default:
          return NextResponse.json(
            { error: 'Invalid entity type' },
            { status: 400 }
          )
      }

      return NextResponse.json({ success: true, message: 'Items permanently deleted' })
    } else if (action === 'empty') {
      // Empty all trash - permanently delete all deleted items
      await Promise.all([
        prisma.item.deleteMany({ where: { deletedAt: { not: null } } }),
        prisma.recipe.deleteMany({ where: { deletedAt: { not: null } } }),
        prisma.purchase.deleteMany({ where: { deletedAt: { not: null } } }),
        prisma.production.deleteMany({ where: { deletedAt: { not: null } } }),
        prisma.supplier.deleteMany({ where: { deletedAt: { not: null } } }),
      ])

      return NextResponse.json({ success: true, message: 'Trash emptied successfully' })
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "restore", "delete", or "empty"' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error processing trash action:', error)
    return NextResponse.json(
      { error: 'Failed to process trash action' },
      { status: 500 }
    )
  }
}

