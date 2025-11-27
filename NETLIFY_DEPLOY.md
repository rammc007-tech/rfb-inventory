# Netlify Deployment Guide - RFB Inventory

## ⚠️ Important Notes

### Database Requirement
**SQLite does NOT work on Netlify serverless functions.** You need to migrate to PostgreSQL for Netlify deployment.

### Options:
1. **Supabase** (Recommended - Free tier available)
2. **Neon** (Serverless PostgreSQL)
3. **Railway** (Easy setup)
4. **PlanetScale** (MySQL compatible)

## Prerequisites

1. **PostgreSQL Database** (one of the services above)
2. **Netlify Account** (free tier works)
3. **GitHub/GitLab/Bitbucket Repository**

## Step 1: Setup PostgreSQL Database

### Option A: Supabase (Recommended)

1. Go to https://supabase.com
2. Create a free account
3. Create a new project
4. Go to Settings > Database
5. Copy the connection string (URI format)
   - Format: `postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres`

### Option B: Neon

1. Go to https://neon.tech
2. Create free account
3. Create new project
4. Copy the connection string

## Step 2: Update Prisma Schema for PostgreSQL

1. Update `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

2. Update your local `.env` file:
```
DATABASE_URL="postgresql://user:password@host:port/database"
JWT_SECRET="your-secret-key"
```

3. Run migrations:
```bash
npx prisma db push
npx prisma generate
npm run db:seed
npm run create-admin
```

## Step 3: Prepare for Netlify

### Update package.json (if needed)

The current `package.json` is already configured correctly.

### Environment Variables

You'll need to set these in Netlify dashboard:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Your JWT secret (use a strong random string)

## Step 4: Deploy to Netlify

### Option A: Via Netlify Dashboard

1. Go to https://app.netlify.com
2. Click "Add new site" > "Import an existing project"
3. Connect your Git repository
4. Configure build settings:
   - **Build command**: `npm install && npm run db:generate && npm run build`
   - **Publish directory**: `.next`
5. Add environment variables:
   - `DATABASE_URL` (from your PostgreSQL provider)
   - `JWT_SECRET` (generate a random secret)
6. Click "Deploy site"

### Option B: Via Netlify CLI

1. Install Netlify CLI:
```bash
npm install -g netlify-cli
```

2. Login:
```bash
netlify login
```

3. Initialize:
```bash
netlify init
```

4. Deploy:
```bash
netlify deploy --prod
```

## Step 5: Post-Deployment Setup

1. After deployment, run database migrations:
   - Use Prisma Studio or run migrations via API

2. Create admin user:
   - You can create a migration script or use the create-admin script

## Environment Variables in Netlify

Go to Site settings > Environment variables and add:

| Variable | Value | Example |
|----------|-------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | Random secret key | `your-super-secret-key-here` |

## Troubleshooting

### Build Fails
- Check Node version (should be 20)
- Verify all dependencies are in `package.json`
- Check build logs in Netlify dashboard

### Database Connection Issues
- Verify `DATABASE_URL` is set correctly
- Check PostgreSQL provider firewall settings
- Ensure database allows connections from Netlify IPs

### Prisma Issues
- Run `npm run db:generate` locally first
- Check `prisma/schema.prisma` is correct
- Verify Prisma Client is generated

## Important Reminders

1. **Never commit `.env` files** - Always use Netlify environment variables
2. **Database URL** - Must be PostgreSQL, not SQLite
3. **JWT Secret** - Must be set in production environment
4. **Build Command** - Must include `prisma generate`

## Post-Deployment Checklist

- [ ] Database migrations completed
- [ ] Admin user created
- [ ] Environment variables set
- [ ] Test login functionality
- [ ] Test all major features
- [ ] Verify database connection

## Support

If you face any issues:
1. Check Netlify build logs
2. Check PostgreSQL provider logs
3. Verify environment variables are set correctly
4. Test database connection locally with PostgreSQL

