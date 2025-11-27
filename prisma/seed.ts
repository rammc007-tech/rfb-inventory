import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const rawMaterials = [
  { name: 'Maida', unit: 'kg' },
  { name: 'Sugar', unit: 'kg' },
  { name: 'Oil', unit: 'liter' },
  { name: 'Dalda', unit: 'kg' },
  { name: 'Yeast', unit: 'g' },
  { name: 'Egg', unit: 'pieces' },
  { name: 'Onion', unit: 'kg' },
  { name: 'Potato', unit: 'kg' },
  { name: 'Cylinder', unit: 'kg' },
  { name: 'Batter maavu', unit: 'kg' },
  { name: 'Puthina', unit: 'g' },
  { name: 'Chilli', unit: 'kg' },
  { name: 'Milk', unit: 'liter' },
  { name: 'Tea powder', unit: 'kg' },
  { name: 'Coffee powder', unit: 'kg' },
  { name: 'French fry', unit: 'kg' },
  { name: 'Ice cream', unit: 'liter' },
  { name: 'Chocolate', unit: 'kg' },
  { name: 'Cooldrinks', unit: 'liter' },
  { name: 'Biscuit', unit: 'pieces' },
  { name: 'Murukku', unit: 'kg' },
  { name: 'Essential', unit: 'pieces' },
  { name: 'Packaging materials', unit: 'pieces' },
  { name: 'Salt', unit: 'kg' },
  { name: 'Aappam soda', unit: 'g' },
  { name: 'Bread improver', unit: 'g' },
  { name: 'Cream Gel', unit: 'g' },
  { name: 'Kadalai', unit: 'kg' },
  { name: 'Thuvaram pararuppu', unit: 'kg' },
  { name: 'Tomato', unit: 'kg' },
  { name: 'Chilli powder', unit: 'kg' },
  { name: 'Banana', unit: 'kg' },
  { name: 'Yealakkai', unit: 'g' },
]

async function main() {
  console.log('Seeding raw materials...')
  
  for (const material of rawMaterials) {
    try {
      await prisma.rawMaterial.upsert({
        where: { name: material.name },
        update: {},
        create: {
          name: material.name,
          unit: material.unit,
        },
      })
      console.log(`✓ Added: ${material.name}`)
    } catch (error) {
      console.log(`✗ Error adding ${material.name}:`, error)
    }
  }
  
  console.log('Seeding completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

