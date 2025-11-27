# Deployment Checklist - RFB Inventory

## Pre-Deployment Checks ✅

### Code Quality
- [ ] All TypeScript errors resolved
- [ ] No linter errors
- [ ] All imports are correct
- [ ] No console.log statements in production code

### Database Setup
- [ ] PostgreSQL database created (Supabase/Neon/Railway)
- [ ] `DATABASE_URL` connection string obtained
- [ ] Prisma schema updated for PostgreSQL
- [ ] Database migrations tested locally

### Environment Variables
- [ ] `DATABASE_URL` ready for production
- [ ] `JWT_SECRET` generated (strong random string)
- [ ] All environment variables documented

### Configuration Files
- [ ] `netlify.toml` configured
- [ ] `next.config.js` updated
- [ ] `package.json` scripts verified
- [ ] `.gitignore` includes sensitive files

### Features Testing
- [ ] Login functionality works
- [ ] Raw materials CRUD works
- [ ] Purchase entry works
- [ ] Recipe creation works
- [ ] Production cost calculation works
- [ ] Reports generation works
- [ ] Print functionality works
- [ ] Settings page works

### Security
- [ ] JWT_SECRET is strong and unique
- [ ] No hardcoded secrets in code
- [ ] Admin password changed from default
- [ ] Authentication is working

### Build Test
- [ ] `npm run build` succeeds locally
- [ ] `npm run db:generate` works
- [ ] No build warnings (or acceptable warnings)
- [ ] Build output size is reasonable

## Netlify Deployment Steps

### 1. Repository Setup
- [ ] Code pushed to Git repository (GitHub/GitLab/Bitbucket)
- [ ] All files committed
- [ ] `.env` file is NOT in repository (check .gitignore)

### 2. Netlify Configuration
- [ ] Netlify account created
- [ ] Site created in Netlify dashboard
- [ ] Git repository connected
- [ ] Build settings configured:
  - Build command: `npm install && npm run db:generate && npm run build`
  - Publish directory: `.next`
  - Node version: 20

### 3. Environment Variables (Netlify Dashboard)
- [ ] `DATABASE_URL` added (PostgreSQL connection string)
- [ ] `JWT_SECRET` added (strong random string)

### 4. Deployment
- [ ] Initial deployment triggered
- [ ] Build succeeds
- [ ] Site is live

### 5. Post-Deployment
- [ ] Database migrations run
- [ ] Admin user created
- [ ] Login tested
- [ ] All major features tested
- [ ] Performance checked

## Migration from SQLite to PostgreSQL

### Required Changes

1. **Update `prisma/schema.prisma`**:
```prisma
datasource db {
  provider = "postgresql"  // Change from "sqlite"
  url      = env("DATABASE_URL")  // Change from "file:./dev.db"
}
```

2. **Run migrations**:
```bash
npx prisma db push
npx prisma generate
```

3. **Seed data** (optional):
```bash
npm run db:seed
npm run create-admin
```

## Environment Variables Reference

### Required in Netlify:
```
DATABASE_URL=postgresql://user:password@host:port/database
JWT_SECRET=your-strong-random-secret-key-here
```

### How to Generate JWT_SECRET:
```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or use an online generator
# https://generate-secret.vercel.app/32
```

## Common Issues & Solutions

### Issue: Build fails with Prisma error
**Solution**: 
- Run `npm run db:generate` locally first
- Ensure `DATABASE_URL` is set in Netlify environment variables

### Issue: Database connection fails
**Solution**:
- Verify `DATABASE_URL` format is correct
- Check PostgreSQL provider allows connections from anywhere (or whitelist Netlify IPs)
- Test connection string locally

### Issue: 500 errors on API routes
**Solution**:
- Check Netlify function logs
- Verify Prisma Client is generated
- Check environment variables are set

### Issue: Admin login doesn't work
**Solution**:
- Run `npm run create-admin` script after deployment
- Or manually create admin user via database

## Final Verification

Before going live, test:
- [ ] Login with admin credentials
- [ ] Create a raw material
- [ ] Add a purchase entry
- [ ] Create a recipe
- [ ] Run production calculation
- [ ] Generate a report
- [ ] Print functionality
- [ ] Settings page

## Notes

- SQLite files cannot be deployed to Netlify
- PostgreSQL is required for serverless deployment
- Always use environment variables, never hardcode secrets
- Test thoroughly after deployment
- Keep database backups

## Support Resources

- Netlify Docs: https://docs.netlify.com/
- Prisma Deployment: https://www.prisma.io/docs/guides/deployment
- Supabase Setup: https://supabase.com/docs

