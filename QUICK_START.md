# Quick Start - Netlify Deployment

## ⚠️ IMPORTANT: SQLite to PostgreSQL Migration Required

Your current setup uses SQLite, but **Netlify requires PostgreSQL**. Follow these steps:

## Fast Track Deployment

### 1. Setup PostgreSQL Database (5 minutes)

Choose one:
- **Supabase** (Recommended): https://supabase.com (Free tier)
- **Neon**: https://neon.tech (Free tier)

After creating database, copy the connection string:
```
postgresql://user:password@host:port/database
```

### 2. Update Prisma Schema

Edit `prisma/schema.prisma`:

**Change this:**
```prisma
datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}
```

**To this:**
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### 3. Update Local Environment

Create/update `.env` file:
```env
DATABASE_URL="postgresql://user:password@host:port/database"
JWT_SECRET="generate-a-random-secret-here"
```

Generate JWT_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Migrate Database

```bash
# Generate Prisma Client
npx prisma generate

# Push schema to PostgreSQL
npx prisma db push

# Seed initial data (if you have seed file)
npm run db:seed

# Create admin user
npm run create-admin
```

### 5. Test Locally

```bash
npm run dev
```

Test login and basic functionality.

### 6. Deploy to Netlify

#### Option A: Netlify Dashboard
1. Go to https://app.netlify.com
2. "Add new site" > "Import an existing project"
3. Connect your Git repository
4. Build settings:
   - Build command: `npm run build`
   - Publish directory: `.next`
5. Add environment variables:
   - `DATABASE_URL` = your PostgreSQL connection string
   - `JWT_SECRET` = your secret key
6. Deploy!

#### Option B: Netlify CLI
```bash
npm install -g netlify-cli
netlify login
netlify init
netlify deploy --prod
```

### 7. Post-Deployment

After deployment:
1. Run database migrations (if needed)
2. Create admin user: You may need to run `create-admin` script
3. Test the live site

## Environment Variables in Netlify

Go to: Site Settings > Environment Variables

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Random secret (32+ characters) |

## Troubleshooting

### Build Fails
- Check Netlify build logs
- Ensure `DATABASE_URL` is set
- Verify Node version is 20

### Database Connection Error
- Verify `DATABASE_URL` format
- Check PostgreSQL allows external connections
- Test connection locally first

### 500 Errors
- Check function logs in Netlify dashboard
- Verify Prisma Client is generated
- Ensure all environment variables are set

## Default Login

After creating admin:
- Username: `admin`
- Password: `admin123` (change immediately!)

## Support Files

- `NETLIFY_DEPLOY.md` - Detailed deployment guide
- `DEPLOYMENT_CHECKLIST.md` - Pre-deployment checklist
- `netlify.toml` - Netlify configuration

## Ready to Deploy?

✅ PostgreSQL database created  
✅ Prisma schema updated  
✅ Database migrated  
✅ Local testing passed  
✅ Environment variables ready  
✅ Code pushed to Git  

**Then deploy! 🚀**

