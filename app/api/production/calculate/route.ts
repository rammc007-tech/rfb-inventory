import { NextRequest, NextResponse } from 'next/server'
import { calculateProductionCost } from '@/lib/fifo-calculator'

// POST calculate production cost without deducting stock
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { recipeId, batches } = body

    if (!recipeId || !batches || batches < 1) {
      return NextResponse.json(
        { error: 'Recipe ID and batches (>= 1) are required' },
        { status: 400 }
      )
    }

    const costResult = await calculateProductionCost(recipeId, batches)

    return NextResponse.json(costResult)
  } catch (error) {
    console.error('Error calculating production cost:', error)
    return NextResponse.json(
      { error: 'Failed to calculate production cost' },
      { status: 500 }
    )
  }
}

