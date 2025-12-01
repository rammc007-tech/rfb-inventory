import { prisma } from './prisma'
import { convertUnit, Unit, toBaseUnit, fromBaseUnit, areUnitsCompatible } from './unit-converter'

export interface CostBreakdown {
  materialId: string
  materialName: string
  quantity: number
  unit: Unit
  cost: number
  batchesUsed: Array<{
    batchId: string
    quantity: number
    unitPrice: number
  }>
}

export interface ProductionCostResult {
  totalCost: number
  breakdown: CostBreakdown[]
  canProduce: boolean
  missingMaterials?: Array<{
    materialId: string
    materialName: string
    required: number
    available: number
    unit: Unit
  }>
}

/**
 * Calculate production cost using FIFO (First In First Out) method
 */
export async function calculateProductionCost(
  recipeId: string,
  batches: number = 1
): Promise<ProductionCostResult> {
  // Get recipe with ingredients
  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId },
    include: {
      ingredients: {
        include: {
          rawMaterial: true,
        },
      },
    },
  })

  if (!recipe) {
    throw new Error('Recipe not found')
  }

  const breakdown: CostBreakdown[] = []
  let totalCost = 0
  const missingMaterials: ProductionCostResult['missingMaterials'] = []

  // Calculate for each ingredient
  for (const ingredient of recipe.ingredients) {
    if (!ingredient.rawMaterialId) {
      console.error('Ingredient missing rawMaterialId:', ingredient)
      continue
    }

    const requiredQty = ingredient.quantity * batches
    const requiredUnit = ingredient.unit as Unit

    // Get raw material name safely
    const rawMaterial = ingredient.rawMaterial || (ingredient as any).rawMaterialData
    const materialName = rawMaterial?.name || (rawMaterial as any)?.data?.name || 'Unknown Material'

    // Get all purchase batches for this material, ordered by date (FIFO)
    const purchaseBatches = await prisma.purchaseBatch.findMany({
      where: {
        rawMaterialId: ingredient.rawMaterialId,
        remainingQty: { gt: 0 }, // Only use batches with remaining quantity
      },
      orderBy: {
        purchaseDate: 'asc', // FIFO: oldest first
      },
    })

    // Calculate available stock
    let totalAvailable = 0
    for (const batch of purchaseBatches) {
      if (areUnitsCompatible(requiredUnit, batch.unit as Unit)) {
        const convertedQty = convertUnit(batch.remainingQty, batch.unit as Unit, requiredUnit)
        totalAvailable += convertedQty
      }
    }

    // Check if we have enough stock
    if (totalAvailable < requiredQty) {
      missingMaterials.push({
        materialId: ingredient.rawMaterialId,
        materialName: materialName,
        required: requiredQty,
        available: totalAvailable,
        unit: requiredUnit,
      })
      continue
    }

    // Calculate cost using FIFO
    let remainingNeeded = requiredQty
    const batchesUsed: CostBreakdown['batchesUsed'] = []
    let ingredientCost = 0

    for (const batch of purchaseBatches) {
      if (remainingNeeded <= 0) break

      if (!areUnitsCompatible(requiredUnit, batch.unit as Unit)) {
        continue
      }

      // Convert batch quantity to required unit
      const batchQtyInRequiredUnit = convertUnit(
        batch.remainingQty,
        batch.unit as Unit,
        requiredUnit
      )

      // Use as much as needed from this batch
      const qtyToUse = Math.min(remainingNeeded, batchQtyInRequiredUnit)

      // Calculate cost: convert qty to batch unit, then multiply by unit price
      const qtyInBatchUnit = convertUnit(qtyToUse, requiredUnit, batch.unit as Unit)
      const costFromThisBatch = qtyInBatchUnit * batch.unitPrice

      ingredientCost += costFromThisBatch
      batchesUsed.push({
        batchId: batch.id,
        quantity: qtyToUse,
        unitPrice: batch.unitPrice,
      })

      remainingNeeded -= qtyToUse
    }

    breakdown.push({
      materialId: ingredient.rawMaterialId,
      materialName: materialName,
      quantity: requiredQty,
      unit: requiredUnit,
      cost: ingredientCost,
      batchesUsed,
    })

    totalCost += ingredientCost
  }

  return {
    totalCost,
    breakdown,
    canProduce: missingMaterials.length === 0,
    missingMaterials: missingMaterials.length > 0 ? missingMaterials : undefined,
  }
}

/**
 * Deduct stock from purchase batches using FIFO
 */
export async function deductStock(
  recipeId: string,
  batches: number = 1
): Promise<void> {
  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId },
    include: {
      ingredients: {
        include: {
          rawMaterial: true,
        },
      },
    },
  })

  if (!recipe) {
    throw new Error('Recipe not found')
  }

  // Deduct for each ingredient
  for (const ingredient of recipe.ingredients) {
    if (!ingredient.rawMaterialId) {
      console.error('Ingredient missing rawMaterialId:', ingredient)
      continue
    }

    const requiredQty = ingredient.quantity * batches
    const requiredUnit = ingredient.unit as Unit

    // Get purchase batches in FIFO order
    const purchaseBatches = await prisma.purchaseBatch.findMany({
      where: {
        rawMaterialId: ingredient.rawMaterialId,
        remainingQty: { gt: 0 },
      },
      orderBy: {
        purchaseDate: 'asc',
      },
    })

    let remainingNeeded = requiredQty

    for (const batch of purchaseBatches) {
      if (remainingNeeded <= 0) break

      if (!areUnitsCompatible(requiredUnit, batch.unit as Unit)) {
        continue
      }

      // Convert batch quantity to required unit
      const batchQtyInRequiredUnit = convertUnit(
        batch.remainingQty,
        batch.unit as Unit,
        requiredUnit
      )

      // Use as much as needed from this batch
      const qtyToUse = Math.min(remainingNeeded, batchQtyInRequiredUnit)

      // Convert back to batch unit for deduction
      const qtyToDeduct = convertUnit(qtyToUse, requiredUnit, batch.unit as Unit)

      // Update batch remaining quantity
      await prisma.purchaseBatch.update({
        where: { id: batch.id },
        data: {
          remainingQty: {
            decrement: qtyToDeduct,
          },
        },
      })

      remainingNeeded -= qtyToUse
    }
  }
}

