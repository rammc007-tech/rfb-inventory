# எளிதான Netlify Deployment - Step by Step

## ⚠️ முக்கியம்: SQLite Netlify-லில் வேலை செய்யாது

PostgreSQL database வேண்டும். அது இல்லாமல் deploy ஆகாது.

## 🎯 மிக எளிய வழி (3 Steps)

### Step 1: PostgreSQL Database Free-ல Create பண்ணுங்க (5 நிமிடங்கள்)

**Supabase-ல Free-ல Create பண்ணலாம்:**

1. https://supabase.com -ல போய் Sign Up பண்ணுங்க
2. "New Project" Click பண்ணுங்க
3. Project Name: `rfb-inventory` 
4. Password ஒரு எளிய password வைத்துக்குங்க
5. Region: `Southeast Asia (Singapore)` select பண்ணுங்க
6. "Create new project" Click பண்ணுங்க

**Database Ready ஆக 2-3 நிமிடங்கள் எடுக்கும்**

Database Ready ஆன பிறகு:
1. Left side menu-ல "Settings" (⚙️) Click பண்ணுங்க
2. "Database" Click பண்ணுங்க
3. "Connection string" section-ல போங்க
4. "URI" Copy பண்ணுங்க - இது இப்படி இருக்கும்:
   ```
   postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
   ```
5. இந்த connection string-ஐ Save பண்ணுங்க

---

### Step 2: Prisma Schema Change பண்ணுங்க (2 நிமிடங்கள்)

`prisma/schema.prisma` file open பண்ணி:

**இந்த line-ஐ:**
```prisma
datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}
```

**இப்படி Change பண்ணுங்க:**
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Save பண்ணுங்க! ✅

---

### Step 3: Netlify-ல Deploy பண்ணுங்க (5 நிமிடங்கள்)

#### 3.1 Git Repository-ல Code Push பண்ணுங்க

Terminal-ல:

```bash
cd "/Users/ramelumalai/RFB inventory"
git add .
git commit -m "Ready for Netlify deployment"
git push
```

(Git setup இல்லன்னா, GitHub-ல New Repository create பண்ணி code push பண்ணுங்க)

#### 3.2 Netlify-ல Deploy

1. https://app.netlify.com -ல போய் Login பண்ணுங்க
2. "Add new site" > "Import an existing project" Click பண்ணுங்க
3. Your Git provider (GitHub/GitLab) select பண்ணி Connect பண்ணுங்க
4. Repository select பண்ணுங்க
5. Build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`
   - **Node version**: `20`
6. "Show advanced" Click பண்ணி "New variable" Click பண்ணுங்க:
   - **Key**: `DATABASE_URL`
   - **Value**: Step 1-ல copy பண்ண connection string paste பண்ணுங்க
   - Save
7. "New variable" மறுபடியும் Click பண்ணுங்க:
   - **Key**: `JWT_SECRET`
   - **Value**: இந்த command run பண்ணி generate பண்ணுங்க:
     ```bash
     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
     ```
   - Output-ஐ Copy பண்ணி Value-ல paste பண்ணுங்க
   - Save
8. "Deploy site" Click பண்ணுங்க

**Build 5-10 நிமிடங்கள் எடுக்கும்**

---

### Step 4: Deploy ஆன பிறகு (2 நிமிடங்கள்)

1. Build Success ஆன பிறகு, "Site settings" > "Environment variables" போய் verify பண்ணுங்க
2. Site URL-ல போய் Test பண்ணுங்க
3. Admin user create பண்ண:
   - Terminal-ல locally run:
   ```bash
   npm run create-admin
   ```

**அல்லது** Netlify Functions-ல admin create பண்ண setup script run பண்ணலாம்.

---

## ✅ Checklist

- [ ] Supabase Database Create ஆச்சா?
- [ ] Connection String Copy ஆச்சா?
- [ ] Prisma Schema Change ஆச்சா? (sqlite → postgresql)
- [ ] Code Git-ல Push ஆச்சா?
- [ ] Netlify-ல Site Create ஆச்சா?
- [ ] Environment Variables Add ஆச்சா? (DATABASE_URL, JWT_SECRET)
- [ ] Deploy Success ஆச்சா?
- [ ] Admin User Create ஆச்சா?

---

## 🆘 Problem வந்தா?

### Build Fail ஆனா:
1. Netlify Dashboard-ல "Deploys" section-ல போங்க
2. Failed build-ஐ Click பண்ணுங்க
3. Logs-ஐ பாருங்க - Error என்னனு சொல்லும்

### Database Connection Error:
- `DATABASE_URL` சரியா paste ஆச்சா Check பண்ணுங்க
- Password Special characters இருந்தா URL encode பண்ணவேண்டும்

### Site Open ஆனா Login ஆகாதா:
- Admin user create பண்ணவேண்டும்
- `npm run create-admin` locally run பண்ணுங்க

---

## 📞 Help வேண்டுமா?

எந்த step-ல problem வந்தாலும், exact error message share பண்ணுங்க. Help பண்றேன்!

**Good Luck! 🚀**

