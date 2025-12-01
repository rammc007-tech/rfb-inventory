import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST reset production counters (NOT production data)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type } = body

    // Get current settings
    let settings: any = prisma.shopSettings.findFirst()
    if (!settings) {
      // Create default settings if not exists
      settings = prisma.shopSettings.create({
        data: {
          shopName: 'RISHA FOODS AND BAKERY',
          shopAddress: 'Server No: 103/1A2, Agaramel, Poonamallee Taluk, Chennai - 600123',
          shopEmail: 'rishafoodsandbakery@gmail.com',
          shopPhone: '',
          currency: '₹',
          taxRate: 0,
          printTextSize: 'medium',
          totalProductionRuns: 0,
          totalProductionCost: 0,
          todayProductionCost: 0,
          lastResetDate: null,
        },
      })
    }

    // Reset counters only - DO NOT DELETE PRODUCTION DATA
    if (type === 'runs') {
      const updated = prisma.shopSettings.update({
        where: { id: settings.id },
        data: {
          totalProductionRuns: 0,
          lastResetDate: new Date().toISOString(),
        },
      })
      return NextResponse.json({ 
        message: 'Total Production Runs counter reset successfully',
        count: 0
      })
    } else if (type === 'cost') {
      const updated = prisma.shopSettings.update({
        where: { id: settings.id },
        data: {
          totalProductionCost: 0,
          lastResetDate: new Date().toISOString(),
        },
      })
      return NextResponse.json({ 
        message: 'Total Production Cost counter reset successfully',
        count: 0
      })
    } else if (type === 'today') {
      const updated = prisma.shopSettings.update({
        where: { id: settings.id },
        data: {
          todayProductionCost: 0,
          lastResetDate: new Date().toISOString(),
        },
      })
      return NextResponse.json({ 
        message: 'Today\'s Production Cost counter reset successfully',
        count: 0
      })
    }

    return NextResponse.json(
      { error: 'Invalid reset type' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error resetting production counters:', error)
    return NextResponse.json(
      { error: 'Failed to reset production counters' },
      { status: 500 }
    )
  }
}

