import { NextRequest, NextResponse } from 'next/server'
import { calculateProductionCost } from '@/lib/fifo-calculator'

// POST calculate production cost without deducting stock
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { recipeId, batches, desiredOutputQty } = body

    if (!recipeId) {
      return NextResponse.json(
        { error: 'Recipe ID is required' },
        { status: 400 }
      )
    }

    // Allow fractional batches when desiredOutputQty is provided
    if (desiredOutputQty !== null && desiredOutputQty !== undefined) {
      if (batches === null || batches === undefined || batches < 0) {
        return NextResponse.json(
          { error: 'Valid batches value is required when using desired output quantity' },
          { status: 400 }
        )
      }
    } else {
      // For regular batch calculation, batches should be >= 1
      if (!batches || batches < 1) {
        return NextResponse.json(
          { error: 'Batches (>= 1) are required' },
          { status: 400 }
        )
      }
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

