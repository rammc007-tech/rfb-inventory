import { NextRequest, NextResponse } from 'next/server'
import { prisma, reloadDatabase } from '@/lib/prisma'

// DELETE production log - NO PERMISSION CHECK
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🗑️ Delete request for production log:', params.id)
    
    // Soft delete production log
    const productionLog = prisma.productionLog.findUnique({
      where: { id: params.id },
    })
    
    if (!productionLog) {
      console.log('❌ Production log not found:', params.id)
      return NextResponse.json(
        { error: 'Production log not found' },
        { status: 404 }
      )
    }
    
    console.log('✓ Production log found, moving to deleted_items')
    
    // Move to deleted_items
    const deletedItem = prisma.deletedItem.create({
      data: {
        category: 'production_log',
        originalData: productionLog,
      },
    })
    console.log('✓ Production log moved to deleted_items:', deletedItem.id)
    
    // Delete from production_logs
    prisma.productionLog.deleteMany({
      where: { id: params.id },
    })
    
    console.log('✓ Production log deleted successfully')
    
    // Reload database to ensure consistency
    if (typeof reloadDatabase === 'function') {
      reloadDatabase()
    }

    return NextResponse.json({ 
      success: true,
      message: 'Production log deleted successfully'
    })
  } catch (error: any) {
    console.error('❌ Error deleting production log:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete production log' },
      { status: 500 }
    )
  }
}
