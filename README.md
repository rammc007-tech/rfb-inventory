# RFB Inventory & Production System

A production-ready inventory and production management system for RISHA FOODS AND BAKERY (RFB). Built with Next.js, TypeScript, Prisma, and designed for offline-first operation with background sync.

## Features

- **Dashboard**: Overview with stats, low-stock alerts, and quick actions
- **Items Management**: Separate lists for Raw Materials and Essences
- **Purchase Flow**: Record purchases with auto-calculation and export
- **Recipe Management**: Create recipes with scaling functionality
- **Production**: Track production with automatic stock decrement and shortage validation
- **Reports**: Production cost reports with PDF/CSV export
- **Offline Support**: IndexedDB-based offline storage with sync queue
- **User Management**: Role-based access control (Admin/Manager/Cashier)
- **Settings**: Shop configuration, user management, and backup

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Prisma ORM (SQLite local / PostgreSQL production)
- **Authentication**: NextAuth.js
- **Offline**: IndexedDB
- **Export**: jsPDF for PDF generation

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm (or npm/yarn)
- For production: PostgreSQL database

### Installation

1. Clone the repository:
```bash
cd "RFB Inventory 1"
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
Create a `.env.local` file:
```env
DATABASE_URL="file:./prisma/dev.db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-change-in-production"
```

4. Initialize database:
```bash
pnpm prisma generate
pnpm prisma migrate dev
pnpm prisma seed
```

5. Run the development server:
```bash
pnpm dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Default Login

- Email: `admin@rfb.com`
- Password: `admin123`

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── dashboard/         # Dashboard page
│   ├── items/             # Items management
│   ├── recipes/           # Recipe management
│   ├── purchases/        # Purchase management
│   ├── production/        # Production management
│   ├── reports/           # Reports
│   └── settings/          # Settings pages
├── components/            # React components
├── lib/                   # Utility functions
│   ├── prisma.ts         # Prisma client
│   ├── auth.ts           # NextAuth configuration
│   ├── units.ts          # Unit conversion utilities
│   └── offline.ts         # Offline sync utilities
├── prisma/                # Prisma schema and migrations
│   ├── schema.prisma     # Database schema
│   └── seed.ts           # Seed data
└── types/                 # TypeScript type definitions
```

## Database

### Local Development (SQLite)

The app uses SQLite for local development. The database file is created at `prisma/dev.db`.

### Production (PostgreSQL)

For production deployment, update the `DATABASE_URL` in your environment variables:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/rfb_inventory?schema=public"
```

Then run:
```bash
pnpm prisma migrate deploy
```

## Key Features Implementation

### Recipe Scaling

Recipes can be scaled to any desired yield. The system automatically calculates ingredient quantities based on the scaling factor.

Example: Scaling a 2kg recipe to 900g:
- Original yield: 2kg
- Desired yield: 900g
- Scaling factor: 0.45
- All ingredients are multiplied by 0.45

### Production Stock Validation

When creating a production record, the system:
1. Scales the recipe to the desired yield
2. Validates stock availability for all ingredients
3. Blocks save if insufficient stock and displays exact shortages
4. Decrements stock automatically on successful save

### Offline Support

The app uses IndexedDB to store:
- Sync queue for mutations made offline
- Local cache of frequently accessed data

When online, the sync queue is processed automatically.

## Deployment to Vercel

1. Push your code to GitHub
2. Import the project in Vercel
3. Add environment variables:
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `NEXTAUTH_URL`: Your production URL
   - `NEXTAUTH_SECRET`: A secure random string
4. Deploy

The build process will:
- Generate Prisma Client
- Run migrations
- Build the Next.js app

## Testing

Run tests:
```bash
pnpm test
```

Run tests in watch mode:
```bash
pnpm test:watch
```

## Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm test` - Run tests
- `pnpm prisma:studio` - Open Prisma Studio
- `pnpm prisma:migrate` - Create a new migration
- `pnpm prisma:seed` - Seed the database

## Business Information

- **Name**: RISHA FOODS AND BAKERY
- **Short Form**: RFB
- **Address**: Server No: 103/1A2, Agaramel, Poonamallee Taluk, Chennai - 600123
- **Email**: rishafoodsandbakery@gmail.com

## License

Private - RFB Internal Use Only

