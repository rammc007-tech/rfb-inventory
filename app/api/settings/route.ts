import { NextRequest, NextResponse } from 'next/server'
import { prisma, reloadDatabase } from '@/lib/prisma'

// GET shop settings
export async function GET() {
  try {
    // Reload database for fresh data
    if (typeof reloadDatabase === 'function') {
      reloadDatabase()
    }
    
    let settings = prisma.shopSettings.findFirst()

    if (!settings) {
      console.log('No settings found, creating default...')
      settings = prisma.shopSettings.create({
        data: {
          shopName: 'RISHA FOODS AND BAKERY',
          shopAddress: 'Server No: 103/1A2, Agaramel, Poonamallee Taluk, Chennai - 600123',
          shopEmail: 'rishafoodsandbakery@gmail.com',
          shopPhone: '',
          currency: '₹',
          taxRate: 0,
          printTextSize: 'medium',
          logoUrl: '',
        },
      })
      console.log('Default settings created')
    }

    return NextResponse.json(settings, {
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
      }
    })
  } catch (error) {
    console.error('Error fetching settings:', error)
    // Return default settings on error instead of 500
    return NextResponse.json({
      shopName: 'RISHA FOODS AND BAKERY',
      shopAddress: 'Server No: 103/1A2, Agaramel, Poonamallee Taluk, Chennai - 600123',
      shopEmail: 'rishafoodsandbakery@gmail.com',
      shopPhone: '',
      currency: '₹',
      taxRate: 0,
      printTextSize: 'medium',
      logoUrl: '',
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
      }
    })
  }
}

// PUT update shop settings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { shopName, shopAddress, shopEmail, shopPhone, currency, taxRate, printTextSize, logoUrl } = body

    console.log('Updating settings with:', { shopName, shopAddress, shopEmail })

    // Reload database
    if (typeof reloadDatabase === 'function') {
      reloadDatabase()
    }

    let settings = prisma.shopSettings.findFirst()

    if (!settings) {
      console.log('Creating new settings...')
      settings = prisma.shopSettings.create({
        data: {
          shopName: shopName || 'RISHA FOODS AND BAKERY',
          shopAddress: shopAddress || '',
          shopEmail: shopEmail || '',
          shopPhone: shopPhone || '',
          currency: currency || '₹',
          taxRate: taxRate || 0,
          printTextSize: printTextSize || 'medium',
          logoUrl: logoUrl || '',
        },
      })
      console.log('Settings created:', settings.id)
    } else {
      console.log('Updating existing settings:', settings.id)
      settings = prisma.shopSettings.update({
        where: { id: settings.id },
        data: {
          shopName,
          shopAddress,
          shopEmail,
          shopPhone,
          currency,
          taxRate,
          printTextSize: printTextSize || settings.printTextSize,
          logoUrl: logoUrl !== undefined ? logoUrl : settings.logoUrl,
        },
      })
      console.log('Settings updated successfully')
    }

    // Reload after update
    if (typeof reloadDatabase === 'function') {
      reloadDatabase()
    }

    return NextResponse.json(settings, {
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
      }
    })
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json(
      { error: 'Failed to update settings: ' + (error instanceof Error ? error.message : 'Unknown') },
      { status: 500 }
    )
  }
}

