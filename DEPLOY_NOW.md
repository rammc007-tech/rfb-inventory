# 🚀 Netlify Deploy - Exact Steps

## Step 1: Prisma Schema Change (முதல் முறை)

`prisma/schema.prisma` file open பண்ணி:

**Line 9-10-ல இப்படி change பண்ணுங்க:**

```prisma
datasource db {
  provider = "postgresql"    // "sqlite"-க்கு பதிலாக
  url      = env("DATABASE_URL")  // "file:./dev.db"-க்கு பதிலாக
}
```

Save பண்ணுங்க! ✅

---

## Step 2: GitHub-ல Code Push

### Terminal-ல run பண்ணுங்க:

```bash
cd "/Users/ramelumalai/RFB inventory"
```

### GitHub Repository Create பண்ணுங்க:

1. https://github.com -ல போய் Login
2. Top right corner-ல "+" Click → "New repository"
3. Repository name: `rfb-inventory`
4. Description: `RFB Inventory Management System`
5. Public select பண்ணுங்க
6. "Add a README file" ✅ Check பண்ண வேண்டாம்
7. "Create repository" Click

### Terminal-ல Code Push பண்ணுங்க:

```bash
git init
git add .
git commit -m "Initial commit - RFB Inventory"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/rfb-inventory.git
git push -u origin main
```

*(YOUR_USERNAME-க்கு பதிலாக உங்க GitHub username-ஐ போடுங்க)*

**Example:**
```bash
git remote add origin https://github.com/ramelumalai/rfb-inventory.git
```

---

## Step 3: Netlify-ல Deploy

### Netlify Account Create (முதல் முறை):

1. https://app.netlify.com -ல போய் "Sign up" Click
2. "GitHub" select பண்ணி Connect பண்ணுங்க

### Site Deploy:

1. Netlify Dashboard-ல "Add new site" Click
2. "Import an existing project" Click
3. "Deploy with GitHub" Click
4. GitHub authorize பண்ணுங்க (first time)
5. `rfb-inventory` repository select பண்ணுங்க
6. Build settings (automatically detect ஆகும்):
   - Build command: `npm run build`
   - Publish directory: `.next`
7. "Deploy site" Click பண்ணுங்க

**Build 5-10 நிமிடங்கள் எடுக்கும்!**

---

## Step 4: PostgreSQL Database Setup (Supabase)

### Supabase Database Create:

1. https://supabase.com -ல போய் "Start your project" Click
2. Sign up / Login பண்ணுங்க
3. "New Project" Click
4. Organization select பண்ணுங்க
5. Project details:
   - **Name**: `rfb-inventory`
   - **Database Password**: ஒரு password வைத்துக்குங்க (remember பண்ணுங்க!)
   - **Region**: `Southeast Asia (Singapore)`
6. "Create new project" Click

**Database ready ஆக 2-3 நிமிடங்கள் எடுக்கும்**

### Connection String Copy:

1. Database ready ஆன பிறகு, Left sidebar-ல "Settings" (⚙️) Click
2. "Database" Click
3. Scroll down to "Connection string" section
4. "URI" tab select பண்ணுங்க
5. Connection string copy பண்ணுங்க - இப்படி இருக்கும்:
   ```
   postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
   ```
6. `[YOUR-PASSWORD]`-க்கு பதிலாக உங்க password போடுங்க
7. Full connection string copy பண்ணுங்க

---

## Step 5: Environment Variables Add (Netlify)

1. Netlify Dashboard-ல உங்க site-ஐ Click பண்ணுங்க
2. "Site settings" Click (top right)
3. "Environment variables" Click (left sidebar)
4. "Add a variable" Click பண்ணுங்க

### Variable 1: DATABASE_URL
- **Key**: `DATABASE_URL`
- **Value**: Step 4-ல copy பண்ண connection string paste பண்ணுங்க
- "Save" Click

### Variable 2: JWT_SECRET

Terminal-ல run பண்ணுங்க:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Output-ஐ copy பண்ணி:

- **Key**: `JWT_SECRET`
- **Value**: Copied random string paste பண்ணுங்க
- "Save" Click

---

## Step 6: Redeploy

1. Netlify Dashboard-ல "Deploys" Click
2. "Trigger deploy" Click
3. "Clear cache and deploy site" Click

**Redeploy 5-10 நிமிடங்கள் எடுக்கும்**

---

## Step 7: Database Setup

### Prisma Schema Push:

Terminal-ல (locally):

```bash
cd "/Users/ramelumalai/RFB inventory"
npx prisma generate
npx prisma db push
```

### Admin User Create:

```bash
npm run create-admin
```

**OR** Netlify Functions-ல create பண்ணலாம்.

---

## ✅ Done! Site Live! 🎉

**Your site URL:** `https://your-site-name.netlify.app`

---

## 🎯 Quick Checklist

- [ ] Prisma schema change ஆச்சா? (sqlite → postgresql)
- [ ] GitHub-ல code push ஆச்சா?
- [ ] Netlify-ல site create ஆச்சா?
- [ ] Supabase database create ஆச்சா?
- [ ] Environment variables add ஆச்சா? (DATABASE_URL, JWT_SECRET)
- [ ] Redeploy ஆச்சா?
- [ ] Database push & admin create ஆச்சா?

---

## 🆘 Problem வந்தா?

### Build Fail?
- Netlify Dashboard → Deploys → Failed build click
- Logs பாருங்க - error message சொல்லும்

### Database Connection Error?
- `DATABASE_URL` சரியா paste ஆச்சா verify பண்ணுங்க
- Password special characters URL encode பண்ண வேண்டும்

### Site Open ஆனா Login ஆகாதா?
- Admin user create பண்ணவேண்டும்
- `npm run create-admin` locally run பண்ணுங்க

---

**இதே exact steps follow பண்ணுங்க! Success ஆகும்! 🚀**

