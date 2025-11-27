import { NextRequest, NextResponse } from 'next/server'
import { calculateVariantCost } from '@/lib/variant-calculator'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      baseRecipeId,
      baseBatches,
      variantName,
      additionalIngredients,
    } = body

    if (!baseRecipeId || !baseBatches || !variantName) {
      return NextResponse.json(
        { error: 'Base recipe ID, batches, and variant name are required' },
        { status: 400 }
      )
    }

    const variantCost = await calculateVariantCost(
      baseRecipeId,
      baseBatches,
      variantName,
      additionalIngredients || []
    )

    return NextResponse.json(variantCost)
  } catch (error: any) {
    console.error('Error calculating variant cost:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to calculate variant cost' },
      { status: 500 }
    )
  }
}

