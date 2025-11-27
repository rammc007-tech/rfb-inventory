# RFB Inventory Management System

RISHA FOODS AND BAKERY - Inventory Management System with FIFO Cost Calculation

## Features

- **Raw Material Management**: Track raw materials with units (kg, g, liter, ml, pieces)
- **Purchase Entry**: Record purchases with rates and quantities
- **Recipe Creation**: Build recipes with ingredients and quantities
- **Automatic FIFO Cost Calculation**: Production costs calculated using First-In-First-Out method
- **Daily Production Planning**: Plan and execute daily production
- **Automatic Stock Deduction**: Stock automatically deducted from FIFO batches
- **Unit Conversion**: Automatic conversion between compatible units (kg↔g, L↔ml)
- **Cost Reporting**: Detailed cost breakdowns and reports
- **Essential Items**: Separate tracking for essential items
- **Production Variants**: Support for recipe variations
- **PWA Support**: Works offline and can be installed

## Technology Stack

- Next.js 14
- TypeScript
- Prisma ORM
- PostgreSQL Database (for production)
- Tailwind CSS
- SWR for data fetching

## Quick Start

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Setup Database**:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

3. **Run Development Server**:
   ```bash
   npm run dev
   ```

4. **Open in Browser**:
   Navigate to `http://localhost:3001`

## Deployment

See `DEPLOY_NOW.md` for detailed deployment instructions to Netlify.

## Default Login

- Username: `admin`
- Password: `admin123`

**⚠️ Change default password after first login!**

## Database Schema

- **RawMaterial**: Raw materials with units
- **PurchaseBatch**: Purchase entries with FIFO tracking
- **Recipe**: Recipe definitions
- **RecipeIngredient**: Recipe ingredients with quantities
- **ProductionLog**: Production logs with cost calculations
- **User**: User accounts
- **ShopSettings**: Shop settings and preferences

## Key Features Explained

### FIFO Cost Calculation
The system uses First-In-First-Out method to calculate production costs:
- Oldest purchase batches are used first
- Automatic unit conversion when needed
- Accurate cost tracking per ingredient

### Unit Conversion
Automatic conversion between:
- 1 kg = 1000 g
- 1 liter = 1000 ml
- Pieces cannot be converted

### Production Workflow
1. Select recipe and number of batches
2. System calculates cost using FIFO
3. Shows cost breakdown per ingredient
4. On confirmation, deducts stock from oldest batches first
5. Creates production log with all details

## API Endpoints

- `GET /api/raw-materials` - List all raw materials
- `POST /api/raw-materials` - Create raw material
- `GET /api/purchases` - List all purchases
- `POST /api/purchases` - Create purchase entry
- `GET /api/recipes` - List all recipes
- `POST /api/recipes` - Create recipe
- `GET /api/production` - List production logs
- `POST /api/production` - Create production log
- `POST /api/production/calculate` - Calculate production cost (without deducting stock)

## Notes

- Stock is automatically calculated from purchase batches
- Cost calculations are always based on FIFO
- Production confirms stock deduction only after user confirmation
- All costs are tracked and displayed in reports
