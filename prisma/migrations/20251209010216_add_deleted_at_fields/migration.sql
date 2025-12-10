-- AlterTable
ALTER TABLE "Item" ADD COLUMN "deletedAt" DATETIME;

-- AlterTable
ALTER TABLE "Production" ADD COLUMN "deletedAt" DATETIME;

-- AlterTable
ALTER TABLE "Purchase" ADD COLUMN "deletedAt" DATETIME;

-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN "deletedAt" DATETIME;

-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN "deletedAt" DATETIME;
