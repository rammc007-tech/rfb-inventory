export type Unit = 'kg' | 'g' | 'liter' | 'ml' | 'pieces'

export interface RawMaterial {
  id: string
  name: string
  unit: Unit
  currentStock: number
  stockUnit: Unit
  createdAt: Date
  updatedAt: Date
}

export interface PurchaseBatch {
  id: string
  rawMaterialId: string
  rawMaterialName: string
  quantity: number
  unit: Unit
  unitPrice: number
  totalCost: number
  purchaseDate: Date
  remainingQty: number
}

export interface Recipe {
  id: string
  name: string
  outputQty: number
  outputUnit: Unit
  ingredients: RecipeIngredient[]
  createdAt: Date
  updatedAt: Date
}

export interface RecipeIngredient {
  id: string
  recipeId: string
  rawMaterialId: string
  rawMaterialName: string
  quantity: number
  unit: Unit
}

export interface ProductionLog {
  id: string
  recipeId: string
  recipeName: string
  batches: number
  totalCost: number
  costPerUnit: number
  productionDate: Date
  costBreakdown: Record<string, any>
}

