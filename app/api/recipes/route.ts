import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let recipes
    try {
      recipes = await prisma.recipe.findMany({
        where: {
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
        orderBy: {
          name: 'asc',
        },
      })
    } catch (dbError: any) {
      console.error('[Recipes API] Database query error:', dbError?.message, dbError?.code)
      // If deletedAt column issue, try without it (fallback)
      if (dbError?.message?.includes('deletedAt') || dbError?.code === 'P2021' || dbError?.code === 'P2001') {
        console.log('[Recipes API] Retrying query without deletedAt filter')
        recipes = await prisma.recipe.findMany({
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
          orderBy: {
            name: 'asc',
          },
        })
      } else {
        throw dbError // Re-throw other database errors
      }
    }

    return NextResponse.json(recipes)
  } catch (error: any) {
    console.error('Error fetching recipes:', error)
    console.error('Error details:', error?.message, error?.stack)
    return NextResponse.json(
      { 
        error: 'Failed to fetch recipes',
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
    const { name, description, yieldQuantity, yieldUnitId, ingredients } = body

    const recipe = await prisma.recipe.create({
      data: {
        name,
        description,
        yieldQuantity,
        yieldUnitId,
        ingredients: {
          create: ingredients.map((ing: any) => ({
            itemId: ing.itemId,
            quantity: ing.quantity,
            unitId: ing.unitId,
          })),
        },
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

    return NextResponse.json(recipe)
  } catch (error: any) {
    console.error('Error creating recipe:', error)
    
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
      ? error.message || 'Failed to create recipe'
      : 'Failed to create recipe'

    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

