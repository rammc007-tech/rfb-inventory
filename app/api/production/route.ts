import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { convertUnit } from '@/lib/units'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let productions
    try {
      productions = await prisma.production.findMany({
        where: {
          deletedAt: null, // Only get non-deleted productions
        },
        include: {
          recipe: {
            include: {
              yieldUnit: true,
            },
          },
          producedUnit: true,
          items: {
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
        orderBy: {
          date: 'desc',
        },
      })
    } catch (dbError: any) {
      console.error('[Production API] Database query error:', dbError?.message, dbError?.code)
      // If deletedAt column issue, try without it (fallback)
      if (dbError?.message?.includes('deletedAt') || dbError?.code === 'P2021' || dbError?.code === 'P2001') {
        console.log('[Production API] Retrying query without deletedAt filter')
        productions = await prisma.production.findMany({
          include: {
            recipe: {
              include: {
                yieldUnit: true,
              },
            },
            producedUnit: true,
            items: {
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
          orderBy: {
            date: 'desc',
          },
        })
      } else {
        throw dbError // Re-throw other database errors
      }
    }

    return NextResponse.json(productions)
  } catch (error: any) {
    console.error('Error fetching productions:', error)
    console.error('Error details:', error?.message, error?.stack)
    return NextResponse.json(
      { 
        error: 'Failed to fetch productions',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      date,
      recipeId,
      producedQuantity,
      producedUnitId,
      laborCost,
      overheadCost,
      notes,
      scaledIngredients,
    } = body

    // Validate stock availability
    const shortages: Array<{
      itemId: string
      itemName: string
      required: number
      requiredUnit: string
      available: number
      availableUnit: string
    }> = []

    for (const ingredient of scaledIngredients) {
      const stock = await prisma.stock.findUnique({
        where: { itemId: ingredient.itemId },
        include: { unit: true },
      })

      if (!stock) {
        shortages.push({
          itemId: ingredient.itemId,
          itemName: ingredient.itemName,
          required: ingredient.quantity,
          requiredUnit: ingredient.unitSymbol,
          available: 0,
          availableUnit: ingredient.unitSymbol,
        })
        continue
      }

      // Convert required quantity to stock unit
      const requiredInStockUnit = await convertUnit(
        ingredient.quantity,
        ingredient.unitId,
        stock.unitId
      )

      if (requiredInStockUnit > stock.quantity) {
        shortages.push({
          itemId: ingredient.itemId,
          itemName: ingredient.itemName,
          required: requiredInStockUnit,
          requiredUnit: stock.unit.symbol,
          available: stock.quantity,
          availableUnit: stock.unit.symbol,
        })
      }
    }

    if (shortages.length > 0) {
      return NextResponse.json(
        {
          error: 'Insufficient stock',
          shortages,
        },
        { status: 400 }
      )
    }

    // Calculate costs
    let totalIngredientCost = 0
    const productionItems = []

    for (const ingredient of scaledIngredients) {
      const item = await prisma.item.findUnique({
        where: { id: ingredient.itemId },
      })

      if (!item) continue

      const unitCost = item.avgPrice || item.lastPurchasePrice || 0
      const lineTotal = ingredient.quantity * unitCost
      totalIngredientCost += lineTotal

      productionItems.push({
        itemId: ingredient.itemId,
        quantity: ingredient.quantity,
        unitId: ingredient.unitId,
        unitCost,
        lineTotal,
      })
    }

    const totalCost =
      totalIngredientCost + (laborCost || 0) + (overheadCost || 0)
    const costPerUnit = totalCost / producedQuantity

    // Create production record
    const production = await prisma.production.create({
      data: {
        date: new Date(date),
        recipeId,
        producedQuantity,
        producedUnitId,
        laborCost: laborCost || 0,
        overheadCost: overheadCost || 0,
        totalCost,
        costPerUnit,
        notes,
        items: {
          create: productionItems,
        },
      },
      include: {
        recipe: {
          include: {
            yieldUnit: true,
          },
        },
        producedUnit: true,
        items: {
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

    // Decrement stock
    for (const ingredient of scaledIngredients) {
      const stock = await prisma.stock.findUnique({
        where: { itemId: ingredient.itemId },
      })

      if (stock) {
        const requiredInStockUnit = await convertUnit(
          ingredient.quantity,
          ingredient.unitId,
          stock.unitId
        )

        await prisma.stock.update({
          where: { itemId: ingredient.itemId },
          data: {
            quantity: {
              decrement: requiredInStockUnit,
            },
          },
        })
      }
    }

    return NextResponse.json(production)
  } catch (error: any) {
    console.error('Error creating production:', error)
    
    // Handle Prisma-specific errors
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0] || 'field'
      return NextResponse.json(
        { error: `A record with this ${field} already exists` },
        { status: 400 }
      )
    }

    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: 'Invalid reference. Please check your selections.' },
        { status: 400 }
      )
    }

    const errorMessage = process.env.NODE_ENV === 'development'
      ? error.message || 'Failed to create production'
      : 'Failed to create production'

    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

