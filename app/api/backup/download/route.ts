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

    // Only admins can download backups
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch all data
    const [items, recipes, purchases, productions, suppliers, users, units] = await Promise.all([
      prisma.item.findMany({
        include: {
          baseUnit: true,
          stock: {
            include: {
              unit: true,
            },
          },
          itemUnits: {
            include: {
              unit: true,
            },
          },
        },
      }),
      prisma.recipe.findMany({
        include: {
          yieldUnit: true,
          ingredients: {
            include: {
              item: true,
              unit: true,
            },
          },
        },
      }),
      prisma.purchase.findMany({
        include: {
          supplier: true,
          items: {
            include: {
              item: true,
              unit: true,
            },
          },
        },
      }),
      prisma.production.findMany({
        include: {
          recipe: true,
          producedUnit: true,
          items: {
            include: {
              item: true,
              unit: true,
            },
          },
        },
      }),
      prisma.supplier.findMany(),
      prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.unit.findMany(),
    ])

    const backupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      data: {
        items,
        recipes,
        purchases,
        productions,
        suppliers,
        users,
        units,
      },
    }

    return new NextResponse(JSON.stringify(backupData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="rfb-backup-${new Date().toISOString().split('T')[0]}.json"`,
      },
    })
  } catch (error) {
    console.error('Error creating backup:', error)
    return NextResponse.json(
      { error: 'Failed to create backup' },
      { status: 500 }
    )
  }
}

