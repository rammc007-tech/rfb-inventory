// Unit conversion utilities
export type Unit = 'kg' | 'g' | 'liter' | 'ml' | 'pieces'

// Conversion rates to base units
const CONVERSION_TO_BASE: Record<string, number> = {
  kg: 1000,      // 1 kg = 1000 g
  g: 1,          // base unit for weight
  liter: 1000,   // 1 liter = 1000 ml
  ml: 1,         // base unit for volume
  pieces: 1,     // pieces cannot be converted
}

// Base unit for each type
const BASE_UNITS: Record<string, Unit> = {
  kg: 'g',
  g: 'g',
  liter: 'ml',
  ml: 'ml',
  pieces: 'pieces',
}

/**
 * Convert quantity from one unit to another
 */
export function convertUnit(
  quantity: number,
  fromUnit: Unit,
  toUnit: Unit
): number {
  // If same unit, return as is
  if (fromUnit === toUnit) return quantity

  // If converting pieces, only same unit works
  if (fromUnit === 'pieces' || toUnit === 'pieces') {
    if (fromUnit !== toUnit) {
      throw new Error('Cannot convert pieces to other units')
    }
    return quantity
  }

  // Check if units are compatible (both weight or both volume)
  const fromBase = BASE_UNITS[fromUnit]
  const toBase = BASE_UNITS[toUnit]

  if (fromBase !== toBase) {
    throw new Error(`Cannot convert ${fromUnit} to ${toUnit} - incompatible unit types`)
  }

  // Convert to base unit first, then to target unit
  const baseQuantity = quantity * CONVERSION_TO_BASE[fromUnit]
  const convertedQuantity = baseQuantity / CONVERSION_TO_BASE[toUnit]

  return convertedQuantity
}

/**
 * Normalize quantity to base unit (g for weight, ml for volume)
 */
export function toBaseUnit(quantity: number, unit: Unit): number {
  return quantity * CONVERSION_TO_BASE[unit]
}

/**
 * Convert from base unit to target unit
 */
export function fromBaseUnit(quantity: number, targetUnit: Unit): number {
  return quantity / CONVERSION_TO_BASE[targetUnit]
}

/**
 * Check if two units are compatible (can be converted)
 */
export function areUnitsCompatible(unit1: Unit, unit2: Unit): boolean {
  if (unit1 === unit2) return true
  if (unit1 === 'pieces' || unit2 === 'pieces') return false
  return BASE_UNITS[unit1] === BASE_UNITS[unit2]
}

