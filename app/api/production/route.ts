import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateProductionCost, deductStock } from '@/lib/fifo-calculator'

// GET all production logs
export async function GET() {
  try {
    const logs = prisma.productionLog.findMany({
      include: {
        recipe: true,
      },
      orderBy: {
        productionDate: 'desc',
      },
    })

    const formattedLogs = logs.map((log: any) => {
      // Safely get recipe name
      const recipe = log.recipe || (log as any).recipeData
      const recipeName = recipe?.name || (recipe as any)?.data?.name || 'Unknown Recipe'
      
      return {
        id: log.id,
        recipeId: log.recipeId,
        recipeName: recipeName,
        batches: log.batches || 0,
        totalCost: log.totalCost || 0,
        costPerUnit: log.costPerUnit || 0,
        variantName: log.variantName || null,
        baseRecipeCost: log.baseRecipeCost || null,
        additionalCost: log.additionalCost || null,
        utilityCost: log.utilityCost || 0,
        staffSalary: log.staffSalary || 0,
        productionDate: log.productionDate || new Date().toISOString(),
        costBreakdown: typeof log.costBreakdown === 'string' 
          ? JSON.parse(log.costBreakdown || '{}')
          : log.costBreakdown || {},
        variantIngredients: log.variantIngredients
          ? (typeof log.variantIngredients === 'string'
              ? JSON.parse(log.variantIngredients)
              : log.variantIngredients)
          : null,
      }
    })

    return NextResponse.json(formattedLogs || [])
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
      desiredOutputQty,
      desiredOutputUnit,
      calculatedIngredients,
      variantName,
      baseRecipeCost,
      additionalCost,
      utilityCost,
      staffSalary,
      variantIngredients,
    } = body

    if (!recipeId) {
      return NextResponse.json(
        { error: 'Recipe ID is required' },
        { status: 400 }
      )
    }

    // Get recipe first
    const recipe = prisma.recipe.findUnique({
      where: { id: recipeId },
    })

    if (!recipe) {
      return NextResponse.json(
        { error: 'Recipe not found' },
        { status: 404 }
      )
    }

    // Calculate batches if desiredOutputQty is provided
    let finalBatches = batches
    let finalOutputQty = recipe.outputQty * batches

    if (desiredOutputQty && desiredOutputQty > 0) {
      finalBatches = desiredOutputQty / recipe.outputQty
      finalOutputQty = desiredOutputQty
    }

    if (!finalBatches || finalBatches < 0.01) {
      return NextResponse.json(
        { error: 'Invalid batches or desired output quantity' },
        { status: 400 }
      )
    }

    // Calculate cost using FIFO (for base recipe)
    const costResult = await calculateProductionCost(recipeId, finalBatches)

    if (!costResult.canProduce) {
      return NextResponse.json(
        {
          error: 'Insufficient stock',
          missingMaterials: costResult.missingMaterials,
        },
        { status: 400 }
      )
    }

    // Use provided costs if variant, otherwise use calculated
    const finalBaseCost = baseRecipeCost ?? costResult.totalCost
    const finalAdditionalCost = additionalCost ?? 0
    const finalUtilityCost = utilityCost ?? 0
    const finalStaffSalary = staffSalary ?? 0
    const totalCost = finalBaseCost + finalAdditionalCost + finalUtilityCost + finalStaffSalary

    const costPerUnit = totalCost / finalOutputQty

    // Deduct stock using FIFO (base recipe ingredients)
    await deductStock(recipeId, batches)

    // TODO: Deduct additional variant ingredients if provided

    // Create production log
    const log = prisma.productionLog.create({
      data: {
        recipeId: recipeId,
        batches: finalBatches,
        totalCost: totalCost,
        costPerUnit: costPerUnit,
        variantName: variantName || null,
        baseRecipeCost: finalBaseCost,
        additionalCost: finalAdditionalCost > 0 ? finalAdditionalCost : null,
        utilityCost: finalUtilityCost > 0 ? finalUtilityCost : 0,
        staffSalary: finalStaffSalary > 0 ? finalStaffSalary : 0,
        costBreakdown: JSON.stringify(costResult.breakdown),
        variantIngredients: calculatedIngredients 
          ? JSON.stringify(calculatedIngredients)
          : (variantIngredients 
              ? (typeof variantIngredients === 'string' 
                  ? variantIngredients 
                  : JSON.stringify(variantIngredients))
              : null),
      },
      include: {
        recipe: true,
      },
    })

    // Update production counters in settings (without deleting data)
    let settings: any = prisma.shopSettings.findFirst()
    if (!settings) {
      settings = prisma.shopSettings.create({
        data: {
          shopName: 'RISHA FOODS AND BAKERY',
          shopAddress: 'Server No: 103/1A2, Agaramel, Poonamallee Taluk, Chennai - 600123',
          shopEmail: 'rishafoodsandbakery@gmail.com',
          shopPhone: '',
          currency: '₹',
          taxRate: 0,
          printTextSize: 'medium',
          totalProductionRuns: batches,
          totalProductionCost: totalCost,
          todayProductionCost: 0,
          lastResetDate: null,
        },
      })
    } else {
      // Update counters
      const currentRuns = (settings.totalProductionRuns || 0) + batches
      const currentCost = (settings.totalProductionCost || 0) + totalCost
      
      // Check if today's production
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const logDate = new Date(log.productionDate || new Date())
      logDate.setHours(0, 0, 0, 0)
      const isToday = logDate.getTime() === today.getTime()
      const currentTodayCost = isToday 
        ? (settings.todayProductionCost || 0) + totalCost
        : (settings.todayProductionCost || 0)
      
      prisma.shopSettings.update({
        where: { id: settings.id },
        data: {
          totalProductionRuns: currentRuns,
          totalProductionCost: currentCost,
          todayProductionCost: currentTodayCost,
        },
      })
    }

    const formattedLog = {
      id: log.id,
      recipeId: log.recipeId,
      recipeName: log.recipe?.name || 'Unknown',
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

