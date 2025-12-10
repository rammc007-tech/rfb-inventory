# 🚀 Quick Deployment Steps

## ✅ Step 1: GitHub Repository Create செய்யுங்கள்

1. https://github.com/new -ல் போய்
2. Repository name: `rfb-inventory`
3. **"Add a README file" UNCHECK** செய்யுங்கள்
4. "Create repository" click செய்யுங்கள்

## ✅ Step 2: Terminal-ல் இந்த Commands Run செய்யுங்கள்

```bash
cd "/Users/ramelumalai/RFB Inventory 1"

# உங்கள் GitHub username-ஐ replace செய்யுங்கள்
git remote add origin https://github.com/YOUR_USERNAME/rfb-inventory.git

git branch -M main
git push -u origin main
```

**YOUR_USERNAME-ஐ உங்கள் GitHub username-ஆ replace செய்யுங்கள்!**

## ✅ Step 3: Vercel-ல் Deploy

1. https://vercel.com/new -ல் போய்
2. GitHub-ல் login செய்யுங்கள்
3. `rfb-inventory` repository-ஐ select செய்யுங்கள்
4. "Import" click செய்யுங்கள்

## ✅ Step 4: Environment Variables

"Environment Variables" section-ல் add செய்யுங்கள்:

### 1. DATABASE_URL
```
postgresql://user:password@host:5432/dbname?schema=public
```

**Easiest Option - Vercel Postgres:**
- Vercel Dashboard → Storage → Create Database → Postgres
- Automatically `DATABASE_URL` add ஆகும் ✅

### 2. NEXTAUTH_URL
```
https://rfb-inventory-1.vercel.app
```
(Deploy ஆன பிறகு actual URL-ஐ update செய்யுங்கள்)

### 3. NEXTAUTH_SECRET
Terminal-ல் run செய்யுங்கள்:
```bash
openssl rand -base64 32
```
Output-ஐ copy செய்து paste செய்யுங்கள்.

## ✅ Step 5: Deploy!

"Deploy" button click செய்யுங்கள். 2-5 minutes எடுக்கும்.

## ✅ Step 6: First Login

Deploy ஆன பிறகு:
- URL: `https://rfb-inventory-1.vercel.app/login`
- Email: `admin@rfb.com`
- Password: `admin123`

**Note:** Production database-ல் seed data இல்லை. Admin user manually create செய்ய வேண்டும்.

---

## 🆘 Help Needed?

1. GitHub repository create ஆகவில்லையா? → Step 1 repeat செய்யுங்கள்
2. Git push error வருகிறதா? → GitHub username சரியாக இருக்கிறதா check செய்யுங்கள்
3. Build failed? → Environment variables சரியாக set ஆகியுள்ளதா check செய்யுங்கள்
4. Database error? → PostgreSQL database running ஆக இருக்கிறதா verify செய்யுங்கள்

