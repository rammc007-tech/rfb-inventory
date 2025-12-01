import { prisma } from '../lib/prisma'
import bcrypt from 'bcryptjs'

async function createTestData() {
  console.log('🚀 Creating test data...\n')

  // Clear existing test data (optional - comment out if you want to keep existing data)
  console.log('⚠️  Clearing existing test data...')
  try {
    await prisma.productionLog.deleteMany({})
    await prisma.recipeIngredient.deleteMany({})
    await prisma.recipe.deleteMany({})
    await prisma.purchaseBatch.deleteMany({})
    await prisma.rawMaterial.deleteMany({})
    console.log('✅ Cleared existing test data\n')
  } catch (error) {
    console.log('⚠️  Could not clear existing data (this is okay)\n')
  }

  try {
    // 1. Create Raw Materials
    console.log('1. Creating Raw Materials...')
    const maida = await prisma.rawMaterial.create({
      data: {
        name: 'Maida',
        unit: 'kg',
        isEssential: true,
      },
    })
    console.log('✅ Created: Maida')

    const oil = await prisma.rawMaterial.create({
      data: {
        name: 'Oil',
        unit: 'liter',
        isEssential: true,
      },
    })
    console.log('✅ Created: Oil')

    const dalda = await prisma.rawMaterial.create({
      data: {
        name: 'Dalda',
        unit: 'kg',
        isEssential: false,
      },
    })
    console.log('✅ Created: Dalda')

    const sugar = await prisma.rawMaterial.create({
      data: {
        name: 'Sugar',
        unit: 'kg',
        isEssential: true,
      },
    })
    console.log('✅ Created: Sugar')

    const gasCylinder = await prisma.rawMaterial.create({
      data: {
        name: 'Gas Cylinder',
        unit: 'kg',
        isEssential: true,
      },
    })
    console.log('✅ Created: Gas Cylinder')

    // 2. Create Purchase Batches
    console.log('\n2. Creating Purchase Entries...')
    
    const purchase1 = await prisma.purchaseBatch.create({
      data: {
        rawMaterialId: maida.id,
        quantity: 50,
        unit: 'kg',
        unitPrice: 42,
        totalCost: 2100,
        remainingQty: 50,
      },
    })
    console.log(`✅ Purchased: 50 kg Maida @ ₹42/kg = ₹2100`)

    const purchase2 = await prisma.purchaseBatch.create({
      data: {
        rawMaterialId: oil.id,
        quantity: 5,
        unit: 'liter',
        unitPrice: 120,
        totalCost: 600,
        remainingQty: 5,
      },
    })
    console.log(`✅ Purchased: 5 liter Oil @ ₹120/liter = ₹600`)

    const purchase3 = await prisma.purchaseBatch.create({
      data: {
        rawMaterialId: dalda.id,
        quantity: 4,
        unit: 'kg',
        unitPrice: 200,
        totalCost: 800,
        remainingQty: 4,
      },
    })
    console.log(`✅ Purchased: 4 kg Dalda @ ₹200/kg = ₹800`)

    const purchase4 = await prisma.purchaseBatch.create({
      data: {
        rawMaterialId: sugar.id,
        quantity: 5,
        unit: 'kg',
        unitPrice: 40,
        totalCost: 200,
        remainingQty: 5,
      },
    })
    console.log(`✅ Purchased: 5 kg Sugar @ ₹40/kg = ₹200`)

    const purchase5 = await prisma.purchaseBatch.create({
      data: {
        rawMaterialId: gasCylinder.id,
        quantity: 19,
        unit: 'kg',
        unitPrice: 110,
        totalCost: 2090,
        remainingQty: 19,
        gasCylinderQty: 19,
      },
    })
    console.log(`✅ Purchased: 19 kg Gas Cylinder @ ₹110/kg = ₹2090`)

    // 3. Create Recipe
    console.log('\n3. Creating Recipe...')
    
    const puffRecipe = await prisma.recipe.create({
      data: {
        name: 'Puff',
        outputQty: 15,
        outputUnit: 'pieces',
        ingredients: {
          create: [
            {
              rawMaterialId: maida.id,
              quantity: 1,
              unit: 'kg',
            },
            {
              rawMaterialId: oil.id,
              quantity: 0.5,
              unit: 'liter',
            },
            {
              rawMaterialId: dalda.id,
              quantity: 0.5,
              unit: 'kg',
            },
            {
              rawMaterialId: sugar.id,
              quantity: 0.25,
              unit: 'kg',
            },
            {
              rawMaterialId: gasCylinder.id,
              quantity: 0.2,
              unit: 'kg',
            },
          ],
        },
      },
    })
    console.log('✅ Created Recipe: Puff (15 pieces)')
    console.log('   Ingredients:')
    console.log('   - 1 kg Maida')
    console.log('   - 0.5 liter Oil')
    console.log('   - 0.5 kg Dalda')
    console.log('   - 0.25 kg Sugar')
    console.log('   - 0.2 kg Gas Cylinder')

    // 4. Verify Stock Calculation
    console.log('\n4. Verifying Stock Levels...')
    const materials = await prisma.rawMaterial.findMany({
      include: {
        purchaseBatches: {
          where: {
            remainingQty: { gt: 0 },
          },
          orderBy: {
            purchaseDate: 'asc',
          },
        },
      },
    })

    for (const material of materials) {
      let totalStock = 0
      const baseUnit = material.unit === 'kg' || material.unit === 'g' ? 'g' : 
                       material.unit === 'liter' || material.unit === 'ml' ? 'ml' : 'pieces'

      for (const batch of material.purchaseBatches) {
        if (batch.remainingQty > 0) {
          if (baseUnit === 'pieces') {
            totalStock += batch.remainingQty
          } else {
            // Simple conversion
            let qtyInBase = batch.remainingQty
            if (batch.unit === 'kg' && baseUnit === 'g') {
              qtyInBase = batch.remainingQty * 1000
            } else if (batch.unit === 'g' && baseUnit === 'kg') {
              qtyInBase = batch.remainingQty / 1000
            } else if (batch.unit === 'liter' && baseUnit === 'ml') {
              qtyInBase = batch.remainingQty * 1000
            } else if (batch.unit === 'ml' && baseUnit === 'liter') {
              qtyInBase = batch.remainingQty / 1000
            }
            totalStock += qtyInBase
          }
        }
      }

      const stockInDisplayUnit = baseUnit === 'pieces' 
        ? totalStock 
        : baseUnit === 'g' 
          ? (material.unit === 'kg' ? totalStock / 1000 : totalStock)
          : (material.unit === 'liter' ? totalStock / 1000 : totalStock)

      console.log(`   ${material.name}: ${stockInDisplayUnit.toFixed(2)} ${material.unit}`)
    }

    console.log('\n✅ Test data created successfully!')
    console.log('\n📋 Summary:')
    console.log(`   - Raw Materials: ${materials.length}`)
    console.log(`   - Purchase Batches: 5`)
    console.log(`   - Recipes: 1`)
    console.log('\n🎉 You can now test the application!')

  } catch (error: any) {
    console.error('❌ Error creating test data:', error)
    if (error.code === 'P2002') {
      console.log('\n⚠️  Some data already exists. Skipping...')
    } else {
      throw error
    }
  }
}

createTestData()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => {
    process.exit(0)
  })

