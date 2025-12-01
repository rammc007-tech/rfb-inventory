import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET access control permissions
export async function GET() {
  try {
    const settings = prisma.shopSettings.findFirst()
    
    // Default permissions structure
    const defaultPermissions = {
      // Dashboard
      dashboard_view: { user: true, supervisor: true, admin: true },
      
      // Raw Materials
      raw_materials_view: { user: true, supervisor: true, admin: true },
      raw_materials_add_edit: { user: true, supervisor: true, admin: true },
      raw_materials_delete: { user: false, supervisor: true, admin: true },
      
      // Purchases
      purchases_view: { user: true, supervisor: true, admin: true },
      purchases_add_edit: { user: true, supervisor: true, admin: true },
      purchases_delete: { user: false, supervisor: true, admin: true },
      
      // Recipes
      recipes_view: { user: true, supervisor: true, admin: true },
      recipes_add_edit: { user: true, supervisor: true, admin: true },
      recipes_delete: { user: false, supervisor: true, admin: true },
      
      // Production
      production_view: { user: true, supervisor: true, admin: true },
      production_add_edit: { user: true, supervisor: true, admin: true },
      production_delete: { user: false, supervisor: true, admin: true },
      
      // Cost Calculator
      cost_calculator_view: { user: true, supervisor: true, admin: true },
      cost_calculator_calculate: { user: true, supervisor: true, admin: true },
      
      // Reports
      reports_view: { user: true, supervisor: true, admin: true },
      reports_reset: { user: false, supervisor: true, admin: true },
      
      // Settings
      settings_view: { user: true, supervisor: true, admin: true },
      settings_shop: { user: false, supervisor: true, admin: true },
      settings_users: { user: false, supervisor: false, admin: true },
      settings_access: { user: false, supervisor: false, admin: true },
      settings_backup: { user: false, supervisor: true, admin: true },
    }
    
    const accessControl = (settings as any)?.accessControl || defaultPermissions
    
    return NextResponse.json(accessControl)
  } catch (error) {
    console.error('Error fetching access control:', error)
    return NextResponse.json(
      { error: 'Failed to fetch access control' },
      { status: 500 }
    )
  }
}

// PUT update access control permissions
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { accessControl } = body

    if (!accessControl) {
      return NextResponse.json(
        { error: 'Access control data is required' },
        { status: 400 }
      )
    }

    const existing = prisma.shopSettings.findFirst()
    
    if (existing) {
      prisma.shopSettings.update({
        where: { id: (existing as any).id },
        data: {
          accessControl: accessControl,
        },
      })
    } else {
      prisma.shopSettings.create({
        data: {
          accessControl: accessControl,
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating access control:', error)
    return NextResponse.json(
      { error: 'Failed to update access control' },
      { status: 500 }
    )
  }
}

