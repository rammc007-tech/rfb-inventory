import { prisma } from './prisma'
import { calculateProductionCost } from './fifo-calculator'
import { convertUnit, areUnitsCompatible } from './unit-converter'
import type { Unit } from './unit-converter'

export interface VariantIngredient {
  rawMaterialId: string
  rawMaterialName: string
  quantity: number
  unit: Unit
}

export interface VariantCostResult {
  variantName: string
  baseCost: number
  additionalCost: number
  totalCost: number
  costPerUnit: number
  baseRecipeOutput: number
  outputUnit: Unit
  additionalIngredients: VariantIngredient[]
}

/**
 * Calculate cost for production variant
 * Base recipe cost + additional ingredients cost
 */
export async function calculateVariantCost(
  baseRecipeId: string,
  baseBatches: number,
  variantName: string,
  additionalIngredients: VariantIngredient[]
): Promise<VariantCostResult> {
  // Calculate base recipe cost
  const baseCostResult = await calculateProductionCost(baseRecipeId, baseBatches)

  if (!baseCostResult.canProduce) {
    throw new Error('Insufficient stock for base recipe')
  }

  // Get base recipe output
  const baseRecipe = await prisma.recipe.findUnique({
    where: { id: baseRecipeId },
  })

  if (!baseRecipe) {
    throw new Error('Base recipe not found')
  }

  const baseRecipeOutput = baseRecipe.outputQty * baseBatches

  // Calculate additional ingredients cost using FIFO
  let additionalCost = 0
  const additionalBreakdown: VariantIngredient[] = []

  for (const ingredient of additionalIngredients) {
    if (ingredient.quantity <= 0) continue

    // Get purchase batches for this material (FIFO)
    const purchaseBatches = await prisma.purchaseBatch.findMany({
      where: {
        rawMaterialId: ingredient.rawMaterialId,
        remainingQty: { gt: 0 },
      },
      orderBy: {
        purchaseDate: 'asc',
      },
    })

    // Calculate cost using FIFO
    let remainingNeeded = ingredient.quantity
    let ingredientCost = 0

    for (const batch of purchaseBatches) {
      if (remainingNeeded <= 0) break

      if (!areUnitsCompatible(ingredient.unit, batch.unit as Unit)) {
        continue
      }

      // Convert batch quantity to ingredient unit
      const batchQtyInIngredientUnit = convertUnit(
        batch.remainingQty,
        batch.unit as Unit,
        ingredient.unit
      )

      // Use as much as needed from this batch
      const qtyToUse = Math.min(remainingNeeded, batchQtyInIngredientUnit)

      // Calculate cost: convert qty to batch unit, then multiply by unit price
      const qtyInBatchUnit = convertUnit(qtyToUse, ingredient.unit, batch.unit as Unit)
      const costFromThisBatch = qtyInBatchUnit * batch.unitPrice

      ingredientCost += costFromThisBatch
      remainingNeeded -= qtyToUse
    }

    additionalCost += ingredientCost
    additionalBreakdown.push({
      ...ingredient,
      rawMaterialName: ingredient.rawMaterialName,
    })
  }

  const totalCost = baseCostResult.totalCost + additionalCost
  const costPerUnit = totalCost / baseRecipeOutput

  return {
    variantName,
    baseCost: baseCostResult.totalCost,
    additionalCost,
    totalCost,
    costPerUnit,
    baseRecipeOutput,
    outputUnit: baseRecipe.outputUnit as Unit,
    additionalIngredients: additionalBreakdown,
  }
}

