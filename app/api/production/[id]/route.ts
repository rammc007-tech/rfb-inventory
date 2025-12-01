import { NextRequest, NextResponse } from 'next/server'
import { prisma, reloadDatabase } from '@/lib/prisma'

// DELETE production log
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get user role from request header
    const userRole = (request.headers.get('x-user-role') || 'user') as 'user' | 'supervisor' | 'admin'
    
    // Get access control settings
    const settings = prisma.shopSettings.findFirst()
    const accessControl = (settings as any)?.accessControl || {}
    
    // Check permission for production_delete
    const hasPermission = accessControl.production_delete?.[userRole] ?? (userRole === 'admin')
    
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Permission denied. You do not have access to delete production logs.' },
        { status: 403 }
      )
    }
    
    // Soft delete production log
    const productionLog = prisma.productionLog.findUnique({
      where: { id: params.id },
    })
    
    if (!productionLog) {
      return NextResponse.json(
        { error: 'Production log not found' },
        { status: 404 }
      )
    }
    
    // Move to deleted_items
    const deletedItem = prisma.deletedItem.create({
      data: {
        category: 'production_log',
        originalData: productionLog,
      },
    })
    console.log('Production log moved to deleted_items:', deletedItem.id)
    
    // Delete from production_logs
    prisma.productionLog.deleteMany({
      where: { id: params.id },
    })
    
    // Reload database to ensure consistency
    if (typeof reloadDatabase === 'function') {
      reloadDatabase()
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting production log:', error)
    return NextResponse.json(
      { error: 'Failed to delete production log' },
      { status: 500 }
    )
  }
}

