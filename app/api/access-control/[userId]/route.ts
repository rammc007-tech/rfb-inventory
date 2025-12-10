import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can view access control
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let accessControl = await prisma.accessControl.findUnique({
      where: { userId: params.userId },
    })

    // If no access control exists, create default one
    if (!accessControl) {
      accessControl = await prisma.accessControl.create({
        data: {
          userId: params.userId,
          canViewDashboard: true,
          canManageItems: false,
          canManagePurchase: false,
          canManageRecipe: false,
          canManageProduction: false,
          canViewReports: false,
          canManageUsers: false,
          canManageSettings: false,
        },
      })
    }

    return NextResponse.json(accessControl)
  } catch (error) {
    console.error('Error fetching access control:', error)
    return NextResponse.json(
      { error: 'Failed to fetch access control' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can update access control
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const {
      canViewDashboard,
      canManageItems,
      canManagePurchase,
      canManageRecipe,
      canManageProduction,
      canViewReports,
      canManageUsers,
      canManageSettings,
    } = body

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // For non-admin users, force canManageUsers and canManageSettings to false
    const finalCanManageUsers = user.role === 'ADMIN' ? canManageUsers : false
    const finalCanManageSettings = user.role === 'ADMIN' ? canManageSettings : false

    // Update or create access control
    const accessControl = await prisma.accessControl.upsert({
      where: { userId: params.userId },
      update: {
        canViewDashboard: canViewDashboard ?? true,
        canManageItems: canManageItems ?? false,
        canManagePurchase: canManagePurchase ?? false,
        canManageRecipe: canManageRecipe ?? false,
        canManageProduction: canManageProduction ?? false,
        canViewReports: canViewReports ?? false,
        canManageUsers: finalCanManageUsers,
        canManageSettings: finalCanManageSettings,
      },
      create: {
        userId: params.userId,
        canViewDashboard: canViewDashboard ?? true,
        canManageItems: canManageItems ?? false,
        canManagePurchase: canManagePurchase ?? false,
        canManageRecipe: canManageRecipe ?? false,
        canManageProduction: canManageProduction ?? false,
        canViewReports: canViewReports ?? false,
        canManageUsers: finalCanManageUsers,
        canManageSettings: finalCanManageSettings,
      },
    })

    return NextResponse.json(accessControl)
  } catch (error) {
    console.error('Error updating access control:', error)
    return NextResponse.json(
      { error: 'Failed to update access control' },
      { status: 500 }
    )
  }
}

