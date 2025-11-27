import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET shop settings
export async function GET() {
  try {
    let settings = await prisma.shopSettings.findFirst()

    if (!settings) {
      settings = await prisma.shopSettings.create({
        data: {
          shopName: 'RISHA FOODS AND BAKERY',
          shopAddress: 'Server No: 103/1A2, Agaramel, Poonamallee Taluk, Chennai - 600123',
          shopEmail: 'rishafoodsandbakery@gmail.com',
        },
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

// PUT update shop settings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
      const { shopName, shopAddress, shopEmail, shopPhone, currency, taxRate, printTextSize } = body

    let settings = await prisma.shopSettings.findFirst()

    if (!settings) {
      settings = await prisma.shopSettings.create({
        data: {
          shopName: shopName || 'RISHA FOODS AND BAKERY',
          shopAddress: shopAddress || '',
          shopEmail: shopEmail || '',
          shopPhone: shopPhone || '',
          currency: currency || '₹',
          taxRate: taxRate || 0,
          printTextSize: printTextSize || 'medium',
        },
      })
    } else {
      settings = await prisma.shopSettings.update({
        where: { id: settings.id },
        data: {
          shopName,
          shopAddress,
          shopEmail,
          shopPhone,
          currency,
          taxRate,
          printTextSize: printTextSize || settings.printTextSize,
        },
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}

