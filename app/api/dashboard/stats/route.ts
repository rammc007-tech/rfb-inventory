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

    const totalItems = await prisma.item.count({
      where: { deletedAt: null },
    })
    
    const itemsWithStock = await prisma.item.findMany({
      where: { deletedAt: null },
      include: {
        stock: true,
      },
    })

    const lowStockItems = itemsWithStock.filter((item) => {
      if (!item.stock) return false
      return item.stock.quantity <= item.reorderThreshold
    }).length

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const todayProduction = await prisma.production.count({
      where: {
        deletedAt: null,
        date: {
          gte: today,
          lt: tomorrow,
        },
      },
    })

    const totalValue = itemsWithStock.reduce((sum, item) => {
      if (!item.stock) return sum
      return sum + (item.stock.quantity * (item.avgPrice || 0))
    }, 0)

    return NextResponse.json({
      totalItems,
      lowStockItems,
      totalProduction: todayProduction,
      totalValue,
    })
  } catch (error: any) {
    console.error('Error fetching dashboard stats:', error)
    console.error('Error details:', error?.message, error?.stack)
    return NextResponse.json(
      { 
        error: 'Failed to fetch stats',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: 500 }
    )
  }
}

