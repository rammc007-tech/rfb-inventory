-- AlterTable
ALTER TABLE "Item" ADD COLUMN "deletedAt" TIMESTAMP;

-- AlterTable
ALTER TABLE "Production" ADD COLUMN "deletedAt" TIMESTAMP;

-- AlterTable
ALTER TABLE "Purchase" ADD COLUMN "deletedAt" TIMESTAMP;

-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN "deletedAt" TIMESTAMP;

-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN "deletedAt" TIMESTAMP;
