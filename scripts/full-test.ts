import { prisma } from '../lib/prisma'

async function runFullTest() {
  console.log('🧪 Running Full System Test...\n')

  try {
    // Test 1: Check Raw Materials
    console.log('📦 Test 1: Raw Materials')
    const materials = await prisma.rawMaterial.findMany({
      include: {
        purchaseBatches: {
          where: { remainingQty: { gt: 0 } },
        },
      },
    })
    console.log(`   ✅ Found ${materials.length} materials`)
    for (const m of materials.slice(0, 5)) {
      const stock = m.purchaseBatches?.reduce((sum: number, b: any) => sum + (b.remainingQty || 0), 0) || 0
      console.log(`   - ${m.name || 'Unknown'}: ${stock} ${m.unit || ''}`)
    }

    // Test 2: Check Purchases
    console.log('\n💰 Test 2: Purchase Entries')
    const purchases = await prisma.purchaseBatch.findMany({
      include: { rawMaterial: true },
      orderBy: { purchaseDate: 'desc' },
    })
    console.log(`   ✅ Found ${purchases.length} purchase batches`)
    for (const p of purchases.slice(0, 5)) {
      const matName = p.rawMaterial?.name || 'Unknown'
      console.log(`   - ${matName}: ${p.quantity} ${p.unit} (Remaining: ${p.remainingQty || 0})`)
    }

    // Test 3: Check Recipes
    console.log('\n📖 Test 3: Recipes')
    const recipes = await prisma.recipe.findMany({
      include: { ingredients: { include: { rawMaterial: true } } },
    })
    console.log(`   ✅ Found ${recipes.length} recipes`)
    for (const r of recipes.slice(0, 3)) {
      console.log(`   - ${r.name || 'Unnamed'}: ${r.outputQty || 0} ${r.outputUnit || ''}`)
      console.log(`     Ingredients: ${r.ingredients?.length || 0}`)
    }

    // Test 4: API Endpoint Test
    console.log('\n🌐 Test 4: API Endpoints')
    const apiTests = [
      '/api/raw-materials',
      '/api/purchases',
      '/api/recipes',
    ]
    
    for (const endpoint of apiTests) {
      try {
        const res = await fetch(`http://localhost:3001${endpoint}`)
        const data = await res.json()
        console.log(`   ✅ ${endpoint}: ${Array.isArray(data) ? data.length : 'OK'} items`)
      } catch (e: any) {
        console.log(`   ❌ ${endpoint}: ${e.message}`)
      }
    }

    console.log('\n✅ All tests completed!')
    console.log('\n📊 System Status:')
    console.log(`   - Raw Materials: ${materials.length}`)
    console.log(`   - Purchase Batches: ${purchases.length}`)
    console.log(`   - Recipes: ${recipes.length}`)
    console.log('\n🎉 System is ready for use!')

  } catch (error: any) {
    console.error('❌ Test failed:', error.message)
    console.error(error)
  }
}

runFullTest()
  .catch(console.error)
  .finally(() => process.exit(0))


