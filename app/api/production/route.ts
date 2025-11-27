import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateProductionCost, deductStock } from '@/lib/fifo-calculator'

// GET all production logs
export async function GET() {
  try {
    const logs = await prisma.productionLog.findMany({
      include: {
        recipe: true,
      },
      orderBy: {
        productionDate: 'desc',
      },
    })

    const formattedLogs = logs.map((log) => ({
      id: log.id,
      recipeId: log.recipeId,
      recipeName: log.recipe.name,
      batches: log.batches,
      totalCost: log.totalCost,
      costPerUnit: log.costPerUnit,
      variantName: log.variantName,
      baseRecipeCost: log.baseRecipeCost,
      additionalCost: log.additionalCost,
      utilityCost: log.utilityCost,
      staffSalary: log.staffSalary,
      productionDate: log.productionDate,
      costBreakdown: JSON.parse(log.costBreakdown || '{}'),
      variantIngredients: log.variantIngredients
        ? JSON.parse(log.variantIngredients)
        : null,
    }))

    return NextResponse.json(formattedLogs)
  } catch (error) {
    console.error('Error fetching production logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch production logs' },
      { status: 500 }
    )
  }
}

// POST create production log
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      recipeId,
      batches,
      variantName,
      baseRecipeCost,
      additionalCost,
      utilityCost,
      staffSalary,
      variantIngredients,
    } = body

    if (!recipeId || !batches || batches < 1) {
      return NextResponse.json(
        { error: 'Recipe ID and batches (>= 1) are required' },
        { status: 400 }
      )
    }

    // Calculate cost using FIFO (for base recipe)
    const costResult = await calculateProductionCost(recipeId, batches)

    if (!costResult.canProduce) {
      return NextResponse.json(
        {
          error: 'Insufficient stock',
          missingMaterials: costResult.missingMaterials,
        },
        { status: 400 }
      )
    }

    // Get recipe to calculate cost per unit
    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
    })

    if (!recipe) {
      return NextResponse.json(
        { error: 'Recipe not found' },
        { status: 404 }
      )
    }

    // Use provided costs if variant, otherwise use calculated
    const finalBaseCost = baseRecipeCost ?? costResult.totalCost
    const finalAdditionalCost = additionalCost ?? 0
    const finalUtilityCost = utilityCost ?? 0
    const finalStaffSalary = staffSalary ?? 0
    const totalCost = finalBaseCost + finalAdditionalCost + finalUtilityCost + finalStaffSalary

    const totalOutputQty = recipe.outputQty * batches
    const costPerUnit = totalCost / totalOutputQty

    // Deduct stock using FIFO (base recipe ingredients)
    await deductStock(recipeId, batches)

    // TODO: Deduct additional variant ingredients if provided

    // Create production log
    const log = await prisma.productionLog.create({
      data: {
        recipeId: recipeId,
        batches: batches,
        totalCost: totalCost,
        costPerUnit: costPerUnit,
        variantName: variantName || null,
        baseRecipeCost: finalBaseCost,
        additionalCost: finalAdditionalCost > 0 ? finalAdditionalCost : null,
        utilityCost: finalUtilityCost > 0 ? finalUtilityCost : 0,
        staffSalary: finalStaffSalary > 0 ? finalStaffSalary : 0,
        costBreakdown: JSON.stringify(costResult.breakdown),
        variantIngredients: variantIngredients || null,
      },
      include: {
        recipe: true,
      },
    })

    const formattedLog = {
      id: log.id,
      recipeId: log.recipeId,
      recipeName: log.recipe.name,
      batches: log.batches,
      totalCost: log.totalCost,
      costPerUnit: log.costPerUnit,
      variantName: log.variantName,
      utilityCost: log.utilityCost,
      staffSalary: log.staffSalary,
      productionDate: log.productionDate,
      costBreakdown: costResult.breakdown,
    }

    return NextResponse.json(formattedLog)
  } catch (error) {
    console.error('Error creating production log:', error)
    return NextResponse.json(
      { error: 'Failed to create production log' },
      { status: 500 }
    )
  }
}

