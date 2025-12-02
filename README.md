# RFB Inventory Management System

**RISHA FOODS AND BAKERY** - Professional Inventory Management System

## 🎯 Features

- ✅ Raw Materials Management
- ✅ Essential Items Tracking
- ✅ Purchase Entry & Analytics
- ✅ Recipe Management with Cost Calculation
- ✅ Production Tracking
- ✅ Cost Reports & Analytics
- ✅ User Management (Admin, Supervisor, User roles)
- ✅ PWA Support (Installable App)
- ✅ Responsive Design (Mobile, Tablet, Desktop)
- ✅ Print Functionality
- ✅ Data Backup & Restore
- ✅ Deleted Items Recovery

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone repository
git clone <repository-url>
cd "RFB inventory"

# Install dependencies
npm install

# Create admin user
npm run create-admin

# Seed sample data (optional)
npm run seed-data

# Start development server
npm run dev
```

Visit: `http://localhost:3001`

**Default Login:**
- Username: `admin`
- Password: `admin123`

## 📋 Available Scripts

```bash
npm run dev          # Start development server
npm run dev:clean    # Clean cache and start dev server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Check code quality
npm run pre-deploy   # Run pre-deployment checks
npm run clean        # Clean cache
npm run reset        # Full reset (reinstall dependencies)
```

## 🏗️ Project Structure

```
RFB inventory/
├── app/                    # Next.js 14 App Router
│   ├── api/               # API routes
│   ├── dashboard/         # Dashboard page
│   ├── raw-materials/     # Raw materials page
│   ├── recipes/           # Recipes page
│   └── ...
├── components/            # React components
│   ├── DashboardLayout.tsx
│   ├── InstallPWA.tsx
│   └── ...
├── contexts/              # React contexts
│   └── AuthContext.tsx
├── lib/                   # Utilities
│   ├── database.ts        # Database operations
│   ├── auth.ts           # Authentication
│   └── ...
├── public/               # Static files
│   ├── manifest.json     # PWA manifest
│   └── sw.js            # Service worker
├── scripts/              # Utility scripts
└── database/            # JSON database
```

## 🔧 Configuration

### Environment Variables

Create `.env.local`:

```env
NODE_ENV=development
DATABASE_URL=file:./database/rfb-inventory.json
JWT_SECRET=your-secret-key-change-in-production
```

### Database

- Location: `database/rfb-inventory.json`
- Backup: Automatic via UI
- Format: JSON

## 📱 PWA Features

- Installable on mobile and desktop
- Offline support (production only)
- App-like experience
- Push notifications ready

## 🔐 Security

- JWT-based authentication
- Role-based access control (RBAC)
- Password hashing with bcrypt
- Secure API routes

## 🎨 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **State**: React Context + SWR
- **Database**: JSON file (can migrate to PostgreSQL)
- **Auth**: JWT + bcrypt

## 📚 Documentation

- [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)
- [Hydration Fix Summary](./HYDRATION_FIX_SUMMARY.md)

## 🚀 Deployment

### Pre-Deployment

```bash
# Run checks
npm run pre-deploy

# Review checklist
cat DEPLOYMENT_CHECKLIST.md
```

### Netlify

1. Connect repository
2. Build command: `npm run build`
3. Publish directory: `.next`
4. Set environment variables

### Vercel

```bash
vercel --prod
```

### Manual Server

```bash
npm run build
npm run start
```

## 🐛 Troubleshooting

Common issues and solutions in [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

Quick fixes:
```bash
# Clean cache
npm run clean

# Full reset
npm run reset

# Pre-deployment check
npm run pre-deploy
```

## 📊 Features in Detail

### Raw Materials
- Add, edit, delete materials
- Track stock levels
- Low stock alerts
- Purchase history

### Recipes
- Create recipes with ingredients
- Calculate costs automatically
- Print recipes
- Desired output calculator

### Production
- Track daily production
- Calculate production costs
- Production history
- Cost analytics

### Reports
- Cost breakdown
- Production logs
- Date range filtering
- Print reports

### User Management
- Multiple user roles
- Access control
- Password management
- Activity tracking

## 🔄 Updates

### Version 1.0.0 (December 2024)
- ✅ Initial release
- ✅ All core features implemented
- ✅ PWA support
- ✅ Responsive design
- ✅ Production ready

## 📝 License

Private - RISHA FOODS AND BAKERY

## 👨‍💻 Support

For issues or questions:
1. Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
2. Review documentation
3. Check browser console for errors

---

**Built with ❤️ for RISHA FOODS AND BAKERY**

**Status**: Production Ready ✅  
**Version**: 1.0.0  
**Last Updated**: December 2, 2024

