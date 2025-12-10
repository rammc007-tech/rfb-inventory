import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can restore backups
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { data } = body

    if (!data || typeof data !== 'object') {
      return NextResponse.json(
        { error: 'Invalid backup file format' },
        { status: 400 }
      )
    }

    // Start transaction-like operations
    // Note: SQLite doesn't support transactions in the same way, so we'll do sequential operations

    try {
      // Clear existing data (except current user)
      await Promise.all([
        prisma.productionItem.deleteMany({}),
        prisma.production.deleteMany({}),
        prisma.purchaseItem.deleteMany({}),
        prisma.purchase.deleteMany({}),
        prisma.recipeIngredient.deleteMany({}),
        prisma.recipe.deleteMany({}),
        prisma.stock.deleteMany({}),
        prisma.itemUnit.deleteMany({}),
        prisma.item.deleteMany({}),
        prisma.supplier.deleteMany({}),
        prisma.accessControl.deleteMany({}),
        // Don't delete current user
        prisma.user.deleteMany({
          where: {
            id: { not: session.user.id },
          },
        }),
      ])

      // Restore units first (they're referenced by items)
      if (data.units && Array.isArray(data.units)) {
        for (const unit of data.units) {
          await prisma.unit.upsert({
            where: { id: unit.id },
            update: {
              name: unit.name,
              symbol: unit.symbol,
              type: unit.type,
            },
            create: {
              id: unit.id,
              name: unit.name,
              symbol: unit.symbol,
              type: unit.type,
            },
          })
        }
      }

      // Restore items
      if (data.items && Array.isArray(data.items)) {
        for (const item of data.items) {
          await prisma.item.create({
            data: {
              id: item.id,
              name: item.name,
              sku: item.sku,
              type: item.type,
              category: item.category,
              baseUnitId: item.baseUnitId,
              reorderThreshold: item.reorderThreshold,
              lastPurchasePrice: item.lastPurchasePrice,
              avgPrice: item.avgPrice,
              deletedAt: item.deletedAt,
              createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
              updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date(),
            },
          })

          // Restore item units
          if (item.itemUnits && Array.isArray(item.itemUnits)) {
            for (const itemUnit of item.itemUnits) {
              await prisma.itemUnit.create({
                data: {
                  id: itemUnit.id,
                  itemId: item.id,
                  unitId: itemUnit.unitId,
                },
              })
            }
          }

          // Restore stock
          if (item.stock) {
            await prisma.stock.create({
              data: {
                id: item.stock.id,
                itemId: item.id,
                quantity: item.stock.quantity,
                unitId: item.stock.unitId,
              },
            })
          }
        }
      }

      // Restore suppliers
      if (data.suppliers && Array.isArray(data.suppliers)) {
        for (const supplier of data.suppliers) {
          await prisma.supplier.create({
            data: {
              id: supplier.id,
              name: supplier.name,
              contact: supplier.contact,
              address: supplier.address,
              deletedAt: supplier.deletedAt,
              createdAt: supplier.createdAt ? new Date(supplier.createdAt) : new Date(),
              updatedAt: supplier.updatedAt ? new Date(supplier.updatedAt) : new Date(),
            },
          })
        }
      }

      // Restore recipes
      if (data.recipes && Array.isArray(data.recipes)) {
        for (const recipe of data.recipes) {
          await prisma.recipe.create({
            data: {
              id: recipe.id,
              name: recipe.name,
              yieldQuantity: recipe.yieldQuantity,
              yieldUnitId: recipe.yieldUnitId,
              deletedAt: recipe.deletedAt,
              createdAt: recipe.createdAt ? new Date(recipe.createdAt) : new Date(),
              updatedAt: recipe.updatedAt ? new Date(recipe.updatedAt) : new Date(),
            },
          })

          // Restore recipe ingredients
          if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
            for (const ingredient of recipe.ingredients) {
              await prisma.recipeIngredient.create({
                data: {
                  id: ingredient.id,
                  recipeId: recipe.id,
                  itemId: ingredient.itemId,
                  quantity: ingredient.quantity,
                  unitId: ingredient.unitId,
                },
              })
            }
          }
        }
      }

      // Restore purchases
      if (data.purchases && Array.isArray(data.purchases)) {
        for (const purchase of data.purchases) {
          await prisma.purchase.create({
            data: {
              id: purchase.id,
              date: new Date(purchase.date),
              supplierId: purchase.supplierId,
              totalAmount: purchase.totalAmount,
              notes: purchase.notes,
              deletedAt: purchase.deletedAt,
              createdAt: purchase.createdAt ? new Date(purchase.createdAt) : new Date(),
              updatedAt: purchase.updatedAt ? new Date(purchase.updatedAt) : new Date(),
            },
          })

          // Restore purchase items
          if (purchase.items && Array.isArray(purchase.items)) {
            for (const item of purchase.items) {
              await prisma.purchaseItem.create({
                data: {
                  id: item.id,
                  purchaseId: purchase.id,
                  itemId: item.itemId,
                  quantity: item.quantity,
                  unitId: item.unitId,
                  unitPrice: item.unitPrice,
                  lineTotal: item.lineTotal,
                },
              })
            }
          }
        }
      }

      // Restore productions
      if (data.productions && Array.isArray(data.productions)) {
        for (const production of data.productions) {
          await prisma.production.create({
            data: {
              id: production.id,
              date: new Date(production.date),
              recipeId: production.recipeId,
              producedQuantity: production.producedQuantity,
              producedUnitId: production.producedUnitId,
              laborCost: production.laborCost,
              overheadCost: production.overheadCost,
              totalCost: production.totalCost,
              costPerUnit: production.costPerUnit,
              notes: production.notes,
              deletedAt: production.deletedAt,
              createdAt: production.createdAt ? new Date(production.createdAt) : new Date(),
              updatedAt: production.updatedAt ? new Date(production.updatedAt) : new Date(),
            },
          })

          // Restore production items
          if (production.items && Array.isArray(production.items)) {
            for (const item of production.items) {
              await prisma.productionItem.create({
                data: {
                  id: item.id,
                  productionId: production.id,
                  itemId: item.itemId,
                  quantity: item.quantity,
                  unitId: item.unitId,
                  unitCost: item.unitCost,
                  lineTotal: item.lineTotal,
                },
              })
            }
          }
        }
      }

      // Restore users (except current user)
      if (data.users && Array.isArray(data.users)) {
        for (const user of data.users) {
          // Skip current user
          if (user.id === session.user.id) continue

          // Check if user already exists
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email },
          })

          if (!existingUser) {
            // Create user without password (they'll need to reset)
            await prisma.user.create({
              data: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                password: 'TEMP_PASSWORD_NEEDS_RESET', // User must reset password
                createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
                updatedAt: user.updatedAt ? new Date(user.updatedAt) : new Date(),
              },
            })
          }
        }
      }

      return NextResponse.json({ success: true, message: 'Backup restored successfully' })
    } catch (restoreError: any) {
      console.error('Error during restore:', restoreError)
      return NextResponse.json(
        { error: `Failed to restore backup: ${restoreError.message}` },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Error restoring backup:', error)
    return NextResponse.json(
      { error: 'Failed to restore backup' },
      { status: 500 }
    )
  }
}

