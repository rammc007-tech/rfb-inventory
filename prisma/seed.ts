import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Create default units
  const g = await prisma.unit.upsert({
    where: { symbol: 'g' },
    update: {},
    create: {
      name: 'Gram',
      symbol: 'g',
      type: 'WEIGHT',
    },
  })

  const kg = await prisma.unit.upsert({
    where: { symbol: 'kg' },
    update: {},
    create: {
      name: 'Kilogram',
      symbol: 'kg',
      type: 'WEIGHT',
    },
  })

  const ml = await prisma.unit.upsert({
    where: { symbol: 'ml' },
    update: {},
    create: {
      name: 'Milliliter',
      symbol: 'ml',
      type: 'VOLUME',
    },
  })

  const liter = await prisma.unit.upsert({
    where: { symbol: 'L' },
    update: {},
    create: {
      name: 'Liter',
      symbol: 'L',
      type: 'VOLUME',
    },
  })

  const piece = await prisma.unit.upsert({
    where: { symbol: 'piece' },
    update: {},
    create: {
      name: 'Piece',
      symbol: 'piece',
      type: 'COUNT',
    },
  })

  const tray = await prisma.unit.upsert({
    where: { symbol: 'tray' },
    update: {},
    create: {
      name: 'Tray',
      symbol: 'tray',
      type: 'COUNT',
    },
  })

  // Create conversion factors
  await prisma.conversionFactor.upsert({
    where: {
      fromUnitId_toUnitId: {
        fromUnitId: g.id,
        toUnitId: kg.id,
      },
    },
    update: {},
    create: {
      fromUnitId: g.id,
      toUnitId: kg.id,
      factor: 0.001,
    },
  })

  await prisma.conversionFactor.upsert({
    where: {
      fromUnitId_toUnitId: {
        fromUnitId: kg.id,
        toUnitId: g.id,
      },
    },
    update: {},
    create: {
      fromUnitId: kg.id,
      toUnitId: g.id,
      factor: 1000,
    },
  })

  await prisma.conversionFactor.upsert({
    where: {
      fromUnitId_toUnitId: {
        fromUnitId: ml.id,
        toUnitId: liter.id,
      },
    },
    update: {},
    create: {
      fromUnitId: ml.id,
      toUnitId: liter.id,
      factor: 0.001,
    },
  })

  await prisma.conversionFactor.upsert({
    where: {
      fromUnitId_toUnitId: {
        fromUnitId: liter.id,
        toUnitId: ml.id,
      },
    },
    update: {},
    create: {
      fromUnitId: liter.id,
      toUnitId: ml.id,
      factor: 1000,
    },
  })

  // Create default admin user
  const hashedPassword = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@rfb.com' },
    update: {},
    create: {
      email: 'admin@rfb.com',
      name: 'Admin User',
      password: hashedPassword,
      role: 'ADMIN',
      accessControl: {
        create: {
          canViewDashboard: true,
          canManageItems: true,
          canManagePurchase: true,
          canManageRecipe: true,
          canManageProduction: true,
          canViewReports: true,
          canManageUsers: true,
          canManageSettings: true,
        },
      },
    },
  })

  // Create sample raw materials
  const flour = await prisma.item.create({
    data: {
      name: 'All Purpose Flour',
      sku: 'RM-001',
      type: 'RAW_MATERIAL',
      category: 'Flour',
      baseUnitId: kg.id,
      baseQuantity: 1,
      reorderThreshold: 10,
      avgPrice: 50,
      lastPurchasePrice: 50,
      location: 'Store A',
      itemUnits: {
        create: [
          { unitId: kg.id },
          { unitId: g.id },
        ],
      },
      stock: {
        create: {
          quantity: 25,
          unitId: kg.id,
        },
      },
    },
  })

  const sugar = await prisma.item.create({
    data: {
      name: 'Sugar',
      sku: 'RM-002',
      type: 'RAW_MATERIAL',
      category: 'Sweetener',
      baseUnitId: kg.id,
      baseQuantity: 1,
      reorderThreshold: 5,
      avgPrice: 45,
      lastPurchasePrice: 45,
      location: 'Store A',
      itemUnits: {
        create: [
          { unitId: kg.id },
          { unitId: g.id },
        ],
      },
      stock: {
        create: {
          quantity: 15,
          unitId: kg.id,
        },
      },
    },
  })

  // Create sample essence
  const vanilla = await prisma.item.create({
    data: {
      name: 'Vanilla Essence',
      sku: 'ESS-001',
      type: 'ESSENCE',
      category: 'Flavoring',
      baseUnitId: ml.id,
      baseQuantity: 1,
      reorderThreshold: 100,
      avgPrice: 2.5,
      lastPurchasePrice: 2.5,
      location: 'Store B',
      itemUnits: {
        create: [
          { unitId: ml.id },
          { unitId: liter.id },
        ],
      },
      stock: {
        create: {
          quantity: 500,
          unitId: ml.id,
        },
      },
    },
  })

  // Create sample supplier
  const supplier = await prisma.supplier.create({
    data: {
      name: 'Local Grocery Store',
      contact: '+91 9876543210',
      email: 'supplier@example.com',
      address: 'Chennai',
    },
  })

  // Create shop settings
  await prisma.shopSettings.upsert({
    where: { id: '1' },
    update: {},
    create: {
      id: '1',
      name: 'RISHA FOODS AND BAKERY',
      shortForm: 'RFB',
      address: 'Server No: 103/1A2, Agaramel, Poonamallee Taluk, Chennai - 600123',
      email: 'rishafoodsandbakery@gmail.com',
    },
  })

  console.log('Seed data created successfully')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

