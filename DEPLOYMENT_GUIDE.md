# Vercel Deployment Guide - RFB Inventory System

## Step-by-Step Deployment Instructions

### Step 1: GitHub Repository Create செய்யுங்கள்

1. https://github.com -ல் login செய்யுங்கள்
2. "New Repository" button click செய்யுங்கள்
3. Repository name: `rfb-inventory` (அல்லது உங்கள் விருப்பப்படி)
4. Description: "RFB Inventory & Production System"
5. **Public** அல்லது **Private** select செய்யுங்கள்
6. **"Initialize with README"** check box **UNCHECK** செய்யுங்கள் (நமக்கு code இருக்கிறது)
7. "Create repository" click செய்யுங்கள்

### Step 2: GitHub-க்கு Code Push செய்யுங்கள்

Terminal-ல் இந்த commands run செய்யுங்கள்:

```bash
cd "/Users/ramelumalai/RFB Inventory 1"

# GitHub repository URL-ஐ add செய்யுங்கள் (உங்கள் username மற்றும் repo name-ஐ replace செய்யுங்கள்)
git remote add origin https://github.com/YOUR_USERNAME/rfb-inventory.git

# Code push செய்யுங்கள்
git branch -M main
git push -u origin main
```

**Note:** `YOUR_USERNAME`-ஐ உங்கள் GitHub username-ஆ replace செய்யுங்கள்.

### Step 3: Vercel-ல் Project Create செய்யுங்கள்

1. https://vercel.com -ல் login செய்யுங்கள் (GitHub account use செய்யலாம்)
2. Dashboard-ல் "Add New Project" click செய்யுங்கள்
3. "Import Git Repository" section-ல் உங்கள் `rfb-inventory` repository-ஐ select செய்யுங்கள்
4. "Import" button click செய்யுங்கள்

### Step 4: Vercel Project Settings

1. **Project Name**: `rfb-inventory` (அல்லது உங்கள் விருப்பப்படி)
2. **Framework Preset**: Next.js (automatic detect ஆகும்)
3. **Root Directory**: `./` (default)
4. **Build Command**: `prisma generate && prisma migrate deploy && next build` (automatic)
5. **Output Directory**: `.next` (automatic)

### Step 5: Environment Variables Add செய்யுங்கள்

"Environment Variables" section-ல் இந்த 3 variables add செய்யுங்கள்:

#### 1. DATABASE_URL
```
postgresql://user:password@host:5432/dbname?schema=public
```

**PostgreSQL Database Options:**
- **Vercel Postgres** (Recommended - Easy):
  - Vercel Dashboard → Storage → Create Database → Postgres
  - Automatically `DATABASE_URL` set ஆகும்
  
- **External PostgreSQL**:
  - Railway: https://railway.app
  - Supabase: https://supabase.com
  - Neon: https://neon.tech
  - Connection string-ஐ copy செய்து `DATABASE_URL`-ல் paste செய்யுங்கள்

#### 2. NEXTAUTH_URL
```
https://rfb-inventory-1.vercel.app
```
(Deploy ஆன பிறகு actual URL-ஐ update செய்யுங்கள்)

#### 3. NEXTAUTH_SECRET
Terminal-ல் run செய்யுங்கள்:
```bash
openssl rand -base64 32
```
Output-ஐ copy செய்து `NEXTAUTH_SECRET`-ல் paste செய்யுங்கள்.

**Example:**
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
```

### Step 6: Deploy

1. "Deploy" button click செய்யுங்கள்
2. Build process start ஆகும் (2-5 minutes எடுக்கும்)
3. Build successful ஆன பிறகு "Visit" button click செய்யுங்கள்

### Step 7: First Login

1. Deployed URL-ல் `/login` page open ஆகும்
2. Default credentials:
   - Email: `admin@rfb.com`
   - Password: `admin123`

**Note:** Production-ல் first time login செய்யும்போது database seed data create ஆகாது. Admin user manually create செய்ய வேண்டும்.

### Troubleshooting

#### Build Failed
- Environment variables சரியாக set ஆகியுள்ளதா check செய்யுங்கள்
- Build logs-ல் error message check செய்யுங்கள்
- `DATABASE_URL` valid ஆக இருக்கிறதா verify செய்யுங்கள்

#### 404 Error
- Root page redirect issue fix ஆகியுள்ளது
- Redeploy செய்யுங்கள்

#### Database Connection Error
- PostgreSQL database running ஆக இருக்கிறதா check செய்யுங்கள்
- `DATABASE_URL` connection string சரியாக இருக்கிறதா verify செய்யுங்கள்

### Support

எந்த issue-உம் வந்தால்:
1. Vercel Dashboard → Deployments → Latest deployment → Logs check செய்யுங்கள்
2. Error message-ஐ note செய்து help request செய்யுங்கள்

