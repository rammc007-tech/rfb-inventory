import { prisma } from './prisma'
import { Unit, ConversionFactor } from '@prisma/client'

export async function convertUnit(
  quantity: number,
  fromUnitId: string,
  toUnitId: string
): Promise<number> {
  if (fromUnitId === toUnitId) {
    return quantity
  }

  // Try direct conversion
  const directConversion = await prisma.conversionFactor.findUnique({
    where: {
      fromUnitId_toUnitId: {
        fromUnitId,
        toUnitId,
      },
    },
  })

  if (directConversion) {
    return quantity * directConversion.factor
  }

  // Try reverse conversion
  const reverseConversion = await prisma.conversionFactor.findUnique({
    where: {
      fromUnitId_toUnitId: {
        fromUnitId: toUnitId,
        toUnitId: fromUnitId,
      },
    },
  })

  if (reverseConversion) {
    return quantity / reverseConversion.factor
  }

  // If no conversion found, return original quantity
  console.warn(`No conversion found from ${fromUnitId} to ${toUnitId}`)
  return quantity
}

export async function convertToBaseUnit(
  quantity: number,
  unitId: string,
  baseUnitId: string
): Promise<number> {
  return convertUnit(quantity, unitId, baseUnitId)
}

export function calculatePerKgOrPerL(
  quantity: number,
  unitPrice: number,
  unitId: string,
  baseUnitId: string
): number {
  // This is a simplified calculation - in production, use actual conversion factors
  // For now, assuming kg and L are base units
  return unitPrice / quantity
}

