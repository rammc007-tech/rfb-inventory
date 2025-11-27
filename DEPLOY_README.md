# 🎯 Netlify Deployment - எளிய வழிமுறை

## ⚡ மிக எளிய 3 Steps

### 1️⃣ GitHub-ல Code Upload (2 நிமிடங்கள்)

Terminal-ல run பண்ணுங்க:

```bash
cd "/Users/ramelumalai/RFB inventory"
git init
git add .
git commit -m "Ready for deployment"
git branch -M main
```

GitHub-ல:
1. New repository create பண்ணுங்க
2. Repository URL copy பண்ணுங்க
3. Terminal-ல run பண்ணுங்க:

```bash
git remote add origin YOUR_REPO_URL
git push -u origin main
```

---

### 2️⃣ Netlify-ல Deploy (2 நிமிடங்கள்)

1. https://app.netlify.com -ல Login
2. "Add new site" > "Import from Git"
3. GitHub select & repository select
4. "Deploy site" Click - **அவ்வளவுதான்!**

---

### 3️⃣ Environment Variables (2 நிமிடங்கள்)

Deploy ஆன பிறகு:
1. Site Settings > Environment Variables
2. Add:
   - `DATABASE_URL` = PostgreSQL connection string
   - `JWT_SECRET` = Random secret
3. Redeploy

---

## ✅ Done! Site Live! 🎉

**இதுதான் மிக எளிய முறை!**

---

## ⚠️ முக்கியம்

Prisma schema-ல `sqlite` → `postgresql` change பண்ணவேண்டும் (one time only)

`prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"  // Change here
  url      = env("DATABASE_URL")
}
```

---

**Need Help? Check `SIMPLE_DEPLOY.md` for detailed steps!**

