# RFB Inventory System - Setup Guide

## Quick Start

1. **Navigate to project directory:**
   ```bash
   cd "/Users/ramelumalai/RFB inventory"
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Setup Prisma database:**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

5. **Open browser:**
   Navigate to `http://localhost:3000`

## Project Structure

```
RFB inventory/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── raw-materials/ # Raw material endpoints
│   │   ├── purchases/     # Purchase entry endpoints
│   │   ├── recipes/       # Recipe endpoints
│   │   └── production/    # Production endpoints
│   ├── dashboard/         # Dashboard page
│   ├── raw-materials/     # Raw materials page
│   ├── purchases/         # Purchase entry page
│   ├── recipes/           # Recipes page
│   ├── production/        # Production page
│   └── reports/           # Reports page
├── components/            # React components
├── lib/                   # Utility libraries
│   ├── prisma.ts         # Prisma client
│   ├── unit-converter.ts # Unit conversion utilities
│   ├── fifo-calculator.ts # FIFO cost calculation
│   └── types.ts          # TypeScript types
├── prisma/
│   └── schema.prisma     # Database schema
└── package.json          # Dependencies
```

## Features

✅ Raw Material Management
✅ Purchase Entry with FIFO tracking
✅ Recipe Creation
✅ Automatic FIFO Cost Calculation
✅ Production Planning
✅ Automatic Stock Deduction
✅ Unit Conversion (kg↔g, L↔ml)
✅ Cost Reports

## Usage Flow

1. **Add Raw Materials**: Go to Raw Materials page and add materials (e.g., Maida, Oil, Sugar)

2. **Record Purchases**: Go to Purchase Entry and record purchases with quantities and prices

3. **Create Recipes**: Go to Recipes page, create recipes with ingredients and quantities

4. **Calculate Production Cost**: Go to Production page, select recipe and batches, click "Calculate Cost"

5. **Produce**: Review cost breakdown, click "Confirm Production" to deduct stock and log production

6. **View Reports**: Go to Reports page to see cost breakdowns and statistics

## Notes

- All costs are calculated using FIFO (First-In-First-Out) method
- Stock is automatically calculated from purchase batches
- Units are automatically converted when needed
- Production deducts stock only after confirmation

