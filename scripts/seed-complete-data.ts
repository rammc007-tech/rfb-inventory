import { prisma } from '../lib/prisma'

async function createCompleteData() {
  console.log('🚀 Creating Complete Sample Data for RFB Inventory...\n')

  try {
    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log('⚠️  Clearing existing data...')
    try {
      await prisma.productionLog.deleteMany({})
      await prisma.recipeIngredient.deleteMany({})
      await prisma.recipe.deleteMany({})
      await prisma.purchaseBatch.deleteMany({})
      await prisma.rawMaterial.deleteMany({})
      console.log('✅ Cleared existing data\n')
    } catch (error) {
      console.log('⚠️  Could not clear existing data (this is okay)\n')
    }

    // 1. Create Raw Materials (பேக்கரி மற்றும் ஃபுட் business-க்கு)
    console.log('1. Creating Raw Materials...')
    
    const rawMaterials = [
      // Essential Items (முக்கியமான items)
      { name: 'Maida', unit: 'kg', isEssential: true },
      { name: 'Sugar', unit: 'kg', isEssential: true },
      { name: 'Oil', unit: 'liter', isEssential: true },
      { name: 'Dalda', unit: 'kg', isEssential: true },
      { name: 'Gas Cylinder', unit: 'kg', isEssential: true },
      { name: 'vennila', unit: 'liter', isEssential: true }, // Vanilla essence
      
      // Other Raw Materials
      { name: 'Egg', unit: 'pieces', isEssential: false },
      { name: 'Milk', unit: 'liter', isEssential: false },
      { name: 'Yeast', unit: 'g', isEssential: false },
      { name: 'Baking Powder', unit: 'g', isEssential: false },
      { name: 'Cocoa Powder', unit: 'kg', isEssential: false },
      { name: 'Chocolate', unit: 'kg', isEssential: false },
      { name: 'Onion', unit: 'kg', isEssential: false },
      { name: 'Potato', unit: 'kg', isEssential: false },
      { name: 'Salt', unit: 'kg', isEssential: false },
      { name: 'Chilli Powder', unit: 'kg', isEssential: false },
      { name: 'Turmeric Powder', unit: 'kg', isEssential: false },
      { name: 'Cumin Seeds', unit: 'g', isEssential: false },
      { name: 'Coriander Seeds', unit: 'g', isEssential: false },
      { name: 'Garam Masala', unit: 'g', isEssential: false },
      { name: 'Bread Improver', unit: 'g', isEssential: false },
      { name: 'Cream Gel', unit: 'g', isEssential: false },
    ]

    const createdMaterials: any = {}
    
    for (const material of rawMaterials) {
      try {
        const created = await prisma.rawMaterial.create({
          data: material,
        })
        createdMaterials[material.name] = created
        console.log(`✅ Created: ${material.name} (${material.unit})${material.isEssential ? ' ⭐ Essential' : ''}`)
      } catch (error: any) {
        if (error.code === 'P2002') {
          // Already exists, find it
          const existing = await prisma.rawMaterial.findUnique({
            where: { name: material.name },
          })
          if (existing) {
            createdMaterials[material.name] = existing
            console.log(`⚠️  ${material.name} already exists, using existing`)
          }
        } else {
          console.log(`❌ Error creating ${material.name}:`, error.message)
        }
      }
    }

    // 2. Create Purchase Batches (Realistic purchase entries with stock)
    console.log('\n2. Creating Purchase Entries...')
    
    const purchases = [
      // Maida purchases
      {
        material: 'Maida',
        quantity: 50,
        unit: 'kg',
        unitPrice: 42,
        purchaseDate: new Date('2024-11-15'),
      },
      {
        material: 'Maida',
        quantity: 25,
        unit: 'kg',
        unitPrice: 43,
        purchaseDate: new Date('2024-11-20'),
      },
      
      // Sugar purchases
      {
        material: 'Sugar',
        quantity: 10,
        unit: 'kg',
        unitPrice: 40,
        purchaseDate: new Date('2024-11-10'),
      },
      {
        material: 'Sugar',
        quantity: 5,
        unit: 'kg',
        unitPrice: 41,
        purchaseDate: new Date('2024-11-25'),
      },
      
      // Oil purchases
      {
        material: 'Oil',
        quantity: 5,
        unit: 'liter',
        unitPrice: 120,
        purchaseDate: new Date('2024-11-12'),
      },
      {
        material: 'Oil',
        quantity: 3,
        unit: 'liter',
        unitPrice: 125,
        purchaseDate: new Date('2024-11-22'),
      },
      
      // Dalda purchases
      {
        material: 'Dalda',
        quantity: 4,
        unit: 'kg',
        unitPrice: 200,
        purchaseDate: new Date('2024-11-14'),
      },
      
      // Gas Cylinder
      {
        material: 'Gas Cylinder',
        quantity: 19,
        unit: 'kg',
        unitPrice: 110,
        purchaseDate: new Date('2024-11-18'),
        gasCylinderQty: 19,
      },
      
      // Vanilla
      {
        material: 'vennila',
        quantity: 2,
        unit: 'liter',
        unitPrice: 150,
        purchaseDate: new Date('2024-11-16'),
      },
      
      // Other materials
      {
        material: 'Egg',
        quantity: 100,
        unit: 'pieces',
        unitPrice: 8,
        purchaseDate: new Date('2024-11-20'),
      },
      {
        material: 'Milk',
        quantity: 10,
        unit: 'liter',
        unitPrice: 60,
        purchaseDate: new Date('2024-11-21'),
      },
      {
        material: 'Yeast',
        quantity: 500,
        unit: 'g',
        unitPrice: 0.5,
        purchaseDate: new Date('2024-11-19'),
      },
      {
        material: 'Cocoa Powder',
        quantity: 2,
        unit: 'kg',
        unitPrice: 350,
        purchaseDate: new Date('2024-11-17'),
      },
      {
        material: 'Chocolate',
        quantity: 3,
        unit: 'kg',
        unitPrice: 400,
        purchaseDate: new Date('2024-11-23'),
      },
      {
        material: 'Onion',
        quantity: 5,
        unit: 'kg',
        unitPrice: 30,
        purchaseDate: new Date('2024-11-24'),
      },
      {
        material: 'Potato',
        quantity: 10,
        unit: 'kg',
        unitPrice: 25,
        purchaseDate: new Date('2024-11-24'),
      },
      {
        material: 'Salt',
        quantity: 5,
        unit: 'kg',
        unitPrice: 20,
        purchaseDate: new Date('2024-11-15'),
      },
    ]

    for (const purchase of purchases) {
      const material = createdMaterials[purchase.material]
      if (!material) {
        console.log(`⚠️  Material ${purchase.material} not found, skipping purchase`)
        continue
      }

      const totalCost = purchase.quantity * purchase.unitPrice
      const purchaseData: any = {
        rawMaterialId: material.id,
        quantity: purchase.quantity,
        unit: purchase.unit,
        unitPrice: purchase.unitPrice,
        totalCost: totalCost,
        remainingQty: purchase.quantity,
        purchaseDate: purchase.purchaseDate.toISOString(),
      }

      if (purchase.gasCylinderQty) {
        purchaseData.gasCylinderQty = purchase.gasCylinderQty
      }

      try {
        const created = await prisma.purchaseBatch.create({
          data: purchaseData,
        })
        console.log(`✅ Purchased: ${purchase.quantity} ${purchase.unit} ${purchase.material} @ ₹${purchase.unitPrice}/${purchase.unit} = ₹${totalCost}`)
      } catch (error: any) {
        console.log(`❌ Error creating purchase for ${purchase.material}:`, error.message)
      }
    }

    // 3. Create Recipes
    console.log('\n3. Creating Recipes...')
    
    // Recipe 1: Puff (வடை)
    const puffRecipe = await prisma.recipe.create({
      data: {
        name: 'Puff',
        outputQty: 15,
        outputUnit: 'pieces',
        ingredients: {
          create: [
            {
              rawMaterialId: createdMaterials['Maida'].id,
              quantity: 1,
              unit: 'kg',
            },
            {
              rawMaterialId: createdMaterials['Oil'].id,
              quantity: 0.5,
              unit: 'liter',
            },
            {
              rawMaterialId: createdMaterials['Dalda'].id,
              quantity: 0.5,
              unit: 'kg',
            },
            {
              rawMaterialId: createdMaterials['Salt'].id,
              quantity: 0.05,
              unit: 'kg',
            },
            {
              rawMaterialId: createdMaterials['Gas Cylinder'].id,
              quantity: 0.2,
              unit: 'kg',
            },
          ],
        },
      },
    })
    console.log('✅ Created Recipe: Puff (15 pieces)')
    console.log('   Ingredients: 1 kg Maida, 0.5L Oil, 0.5 kg Dalda, 0.05 kg Salt, 0.2 kg Gas')

    // Recipe 2: Egg Puff
    const eggPuffRecipe = await prisma.recipe.create({
      data: {
        name: 'Egg Puff',
        outputQty: 12,
        outputUnit: 'pieces',
        ingredients: {
          create: [
            {
              rawMaterialId: createdMaterials['Maida'].id,
              quantity: 0.8,
              unit: 'kg',
            },
            {
              rawMaterialId: createdMaterials['Oil'].id,
              quantity: 0.4,
              unit: 'liter',
            },
            {
              rawMaterialId: createdMaterials['Dalda'].id,
              quantity: 0.4,
              unit: 'kg',
            },
            {
              rawMaterialId: createdMaterials['Egg'].id,
              quantity: 6,
              unit: 'pieces',
            },
            {
              rawMaterialId: createdMaterials['Onion'].id,
              quantity: 0.2,
              unit: 'kg',
            },
            {
              rawMaterialId: createdMaterials['Salt'].id,
              quantity: 0.03,
              unit: 'kg',
            },
            {
              rawMaterialId: createdMaterials['Chilli Powder'].id,
              quantity: 0.01,
              unit: 'kg',
            },
            {
              rawMaterialId: createdMaterials['Gas Cylinder'].id,
              quantity: 0.15,
              unit: 'kg',
            },
          ],
        },
      },
    })
    console.log('✅ Created Recipe: Egg Puff (12 pieces)')

    // Recipe 3: Chocolate Cake
    const cakeRecipe = await prisma.recipe.create({
      data: {
        name: 'Chocolate Cake',
        outputQty: 1,
        outputUnit: 'kg',
        ingredients: {
          create: [
            {
              rawMaterialId: createdMaterials['Maida'].id,
              quantity: 0.5,
              unit: 'kg',
            },
            {
              rawMaterialId: createdMaterials['Sugar'].id,
              quantity: 0.3,
              unit: 'kg',
            },
            {
              rawMaterialId: createdMaterials['Egg'].id,
              quantity: 4,
              unit: 'pieces',
            },
            {
              rawMaterialId: createdMaterials['Oil'].id,
              quantity: 0.2,
              unit: 'liter',
            },
            {
              rawMaterialId: createdMaterials['Milk'].id,
              quantity: 0.3,
              unit: 'liter',
            },
            {
              rawMaterialId: createdMaterials['Cocoa Powder'].id,
              quantity: 0.1,
              unit: 'kg',
            },
            {
              rawMaterialId: createdMaterials['Baking Powder'].id,
              quantity: 10,
              unit: 'g',
            },
            {
              rawMaterialId: createdMaterials['vennila'].id,
              quantity: 0.05,
              unit: 'liter',
            },
            {
              rawMaterialId: createdMaterials['Gas Cylinder'].id,
              quantity: 0.1,
              unit: 'kg',
            },
          ],
        },
      },
    })
    console.log('✅ Created Recipe: Chocolate Cake (1 kg)')

    // Recipe 4: Samosa
    const samosaRecipe = await prisma.recipe.create({
      data: {
        name: 'Samosa',
        outputQty: 20,
        outputUnit: 'pieces',
        ingredients: {
          create: [
            {
              rawMaterialId: createdMaterials['Maida'].id,
              quantity: 0.5,
              unit: 'kg',
            },
            {
              rawMaterialId: createdMaterials['Oil'].id,
              quantity: 0.3,
              unit: 'liter',
            },
            {
              rawMaterialId: createdMaterials['Potato'].id,
              quantity: 0.5,
              unit: 'kg',
            },
            {
              rawMaterialId: createdMaterials['Onion'].id,
              quantity: 0.2,
              unit: 'kg',
            },
            {
              rawMaterialId: createdMaterials['Salt'].id,
              quantity: 0.02,
              unit: 'kg',
            },
            {
              rawMaterialId: createdMaterials['Chilli Powder'].id,
              quantity: 0.01,
              unit: 'kg',
            },
            {
              rawMaterialId: createdMaterials['Cumin Seeds'].id,
              quantity: 5,
              unit: 'g',
            },
            {
              rawMaterialId: createdMaterials['Gas Cylinder'].id,
              quantity: 0.15,
              unit: 'kg',
            },
          ],
        },
      },
    })
    console.log('✅ Created Recipe: Samosa (20 pieces)')

    // Recipe 5: Vada
    const vadaRecipe = await prisma.recipe.create({
      data: {
        name: 'Vada',
        outputQty: 30,
        outputUnit: 'pieces',
        ingredients: {
          create: [
            {
              rawMaterialId: createdMaterials['Maida'].id,
              quantity: 0.3,
              unit: 'kg',
            },
            {
              rawMaterialId: createdMaterials['Oil'].id,
              quantity: 0.5,
              unit: 'liter',
            },
            {
              rawMaterialId: createdMaterials['Onion'].id,
              quantity: 0.3,
              unit: 'kg',
            },
            {
              rawMaterialId: createdMaterials['Salt'].id,
              quantity: 0.02,
              unit: 'kg',
            },
            {
              rawMaterialId: createdMaterials['Chilli Powder'].id,
              quantity: 0.01,
              unit: 'kg',
            },
            {
              rawMaterialId: createdMaterials['Gas Cylinder'].id,
              quantity: 0.2,
              unit: 'kg',
            },
          ],
        },
      },
    })
    console.log('✅ Created Recipe: Vada (30 pieces)')

    // 4. Display Summary
    console.log('\n✅ Complete Sample Data Created Successfully!')
    console.log('\n📋 Summary:')
    console.log(`   - Raw Materials: ${rawMaterials.length}`)
    console.log(`   - Essential Items: ${rawMaterials.filter(m => m.isEssential).length}`)
    console.log(`   - Purchase Batches: ${purchases.length}`)
    console.log(`   - Recipes: 5 (Puff, Egg Puff, Chocolate Cake, Samosa, Vada)`)
    console.log('\n🎉 Your inventory is now ready to use!')
    console.log('\n💡 Next Steps:')
    console.log('   1. Start the app: npm run dev')
    console.log('   2. Login with: admin / admin123')
    console.log('   3. Check Raw Materials page to see all items')
    console.log('   4. Check Essential Items page to see essential items')
    console.log('   5. Try Cost Calculator with any recipe!')

  } catch (error: any) {
    console.error('❌ Error creating data:', error)
    throw error
  }
}

createCompleteData()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => {
    process.exit(0)
  })

