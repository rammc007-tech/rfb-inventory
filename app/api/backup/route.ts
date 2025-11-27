import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as fs from 'fs'
import * as path from 'path'

// GET create backup
export async function GET() {
  try {
    // Get all data
    const [materials, purchases, recipes, productions, users, settings] =
      await Promise.all([
        prisma.rawMaterial.findMany({
          include: { purchaseBatches: true },
        }),
        prisma.purchaseBatch.findMany({ include: { rawMaterial: true } }),
        prisma.recipe.findMany({
          include: { ingredients: { include: { rawMaterial: true } } },
        }),
        prisma.productionLog.findMany({ include: { recipe: true } }),
        prisma.user.findMany({
          select: {
            id: true,
            username: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
        }),
        prisma.shopSettings.findFirst(),
      ])

    const backup = {
      timestamp: new Date().toISOString(),
      materials,
      purchases,
      recipes,
      productions,
      users,
      settings,
    }

    // Create backup directory if it doesn't exist
    const backupDir = path.join(process.cwd(), 'backups')
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true })
    }

    // Save backup file
    const filename = `backup_${new Date().toISOString().replace(/:/g, '-')}.json`
    const filepath = path.join(backupDir, filename)
    fs.writeFileSync(filepath, JSON.stringify(backup, null, 2))

    return NextResponse.json({
      success: true,
      filename,
      filepath,
      timestamp: backup.timestamp,
    })
  } catch (error) {
    console.error('Error creating backup:', error)
    return NextResponse.json(
      { error: 'Failed to create backup' },
      { status: 500 }
    )
  }
}

// POST restore from backup
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { backupData } = body

    if (!backupData) {
      return NextResponse.json(
        { error: 'Backup data is required' },
        { status: 400 }
      )
    }

    // Clear existing data (be careful in production!)
    await prisma.productionLog.deleteMany()
    await prisma.purchaseBatch.deleteMany()
    await prisma.recipeIngredient.deleteMany()
    await prisma.recipe.deleteMany()
    await prisma.rawMaterial.deleteMany()

    // Restore data
    if (backupData.materials) {
      for (const material of backupData.materials) {
        await prisma.rawMaterial.create({
          data: {
            name: material.name,
            unit: material.unit,
          },
        })
      }
    }

    // Restore purchases, recipes, etc. (simplified for now)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error restoring backup:', error)
    return NextResponse.json(
      { error: 'Failed to restore backup' },
      { status: 500 }
    )
  }
}

